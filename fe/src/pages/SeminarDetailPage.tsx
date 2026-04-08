import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { toTzInput, tzToUtcIso, formatInTz, tzAbbr } from "../utils/datetime";
import { TIMEZONE_OPTIONS, BROWSER_TZ } from "../utils/constants";
import type { SeminarDetailResponse, CheckInTokenResponse } from "../types/seminar";
import MarkdownContent from "../components/MarkdownContent";
import {
  CalendarIcon, MapPinIcon, MicIcon, UsersIcon,
  CheckCircleIcon, CheckIcon, ClockIcon,
  MailIcon, LockIcon, FolderOpenIcon, ShieldCheckIcon,
} from "../components/icons";
import {
  Button,
  Input,
  Textarea,
  Label,
  FormGroup,
  CheckboxRow,
  Badge,
  PageContainer,
  SectionBlock,
  SectionTitle,
  AlertBox,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  LoadingCenter,
  Spinner,
  EmptyState,
} from "../components/ui";

function formatDate(iso: string | null, tz?: string) {
  if (!iso) return "—";
  const t = tz ?? BROWSER_TZ;
  return `${formatInTz(iso, t)} ${tzAbbr(t, new Date(iso))}`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);
  const months = Math.floor(days / 30);
  const years  = Math.floor(days / 365);
  if (mins < 60)   return mins <= 1 ? "just now" : `${mins} minutes ago`;
  if (hours < 24)  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days < 30)   return days === 1 ? "1 day ago" : `${days} days ago`;
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export default function SeminarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const seminarId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  // "event" = use seminar's display_timezone; "local" = browser timezone
  const [tzView, setTzView] = useState<"event" | "local">("event");
  const [tokenDuration, setTokenDuration] = useState(60);
  const [showQR, setShowQR] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, any> | null>(null);
  const [reminderResult, setReminderResult] = useState<{ sent: number; errors: number; total_rsvp: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.users); return res.data; },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });
  const isStaff = me?.role === "staff";
  const isLoggedIn = !!sessionStorage.getItem("accessToken");

  const { data: seminar, isLoading, error } = useQuery<SeminarDetailResponse>({
    queryKey: ["seminar", seminarId],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.seminarDetail(seminarId)); return res.data; },
  });

  const [activeToken, setActiveToken] = useState<CheckInTokenResponse | null>(null);
  useEffect(() => {
    if (!isStaff) return;
    axiosInstance.get(api.v1.seminarCheckinToken(seminarId))
      .then((res) => setActiveToken(res.data))
      .catch(() => setActiveToken(null));
  }, [isStaff, seminarId]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const modifyMutation = useMutation({
    mutationFn: async () => {
      const datetimeFields = new Set(["start_time", "end_time"]);
      const tz: string = editForm.timezone ?? BROWSER_TZ;
      const payload: Record<string, any> = { display_timezone: tz };
      for (const key of Object.keys(editForm)) {
        if (key === "timezone") continue;  // mapped to display_timezone above
        const v = editForm[key];
        payload[key] = datetimeFields.has(key) ? (v ? tzToUtcIso(v, tz) : null) : (v === "" ? null : v);
      }
      await axiosInstance.put(api.v1.seminarDetail(seminarId), payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }); setEditMode(false); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Update failed"),
  });

  const deleteSeminarMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarDetail(seminarId)); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminars"] }); navigate("/seminar"); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Delete failed"),
  });

  const rsvpMutation = useMutation({
    mutationFn: async () => { const res = await axiosInstance.post(api.v1.seminarRsvp(seminarId)); return res.data; },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] });
      if (data.waitlisted) alert(`Added to waitlist! Your position: #${data.position}`);
      else alert("RSVP confirmed!");
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "RSVP failed"),
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarRsvp(seminarId)); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }); alert("RSVP cancelled"); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "RSVP cancellation failed"),
  });

  const cancelWaitlistMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarWaitlist(seminarId)); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }); alert("Waitlist entry cancelled"); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Waitlist cancellation failed"),
  });

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(api.v1.seminarCheckinToken(seminarId), { duration_minutes: tokenDuration });
      return res.data as CheckInTokenResponse;
    },
    onSuccess: (data) => { setActiveToken(data); setShowQR(true); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to create check-in token"),
  });

  const stopCheckinMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarCheckinToken(seminarId)); },
    onSuccess: () => { setActiveToken(null); setShowQR(false); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to stop check-in"),
  });

  const modifyCheckinMutation = useMutation({
    mutationFn: async ({ userId, checked_in }: { userId: number; checked_in: boolean }) => {
      await axiosInstance.patch(api.v1.seminarUserCheckin(seminarId, userId), { checked_in });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to update check-in"),
  });

  const staffCancelRsvpMutation = useMutation({
    mutationFn: async (userId: number) => {
      await axiosInstance.delete(api.v1.staffCancelRsvp(seminarId, userId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to cancel RSVP"),
  });

  const reminderMutation = useMutation({
    mutationFn: async () => { const res = await axiosInstance.post(api.v1.seminarReminder(seminarId)); return res.data; },
    onSuccess: (data) => setReminderResult(data),
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to send reminder"),
  });

  const importCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosInstance.post(api.v1.importCsv(seminarId), formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] });
      if (csvInputRef.current) csvInputRef.current.value = "";
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "CSV import failed"),
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  const myRsvp = seminar?.users.find((u) => u.id === me?.id);
  const myWaitlist = seminar?.waitlist.find((u) => u.id === me?.id);
  const isFull = seminar?.max_capacity != null && seminar.current_rsvp_count >= seminar.max_capacity;
  const hasStarted = seminar?.start_time != null && new Date(seminar.start_time) <= new Date();
  const hasEnded = seminar?.end_time != null && new Date(seminar.end_time) <= new Date();
  const seminarStatus: "upcoming" | "ongoing" | "ended" =
    hasEnded ? "ended" : hasStarted ? "ongoing" : "upcoming";
  const checkinUrl = activeToken ? `${window.location.origin}/check-in?token=${activeToken.token}` : null;
  const tokenActive = activeToken && new Date(activeToken.expires_at) > new Date();

  const startEditForm = () => {
    // Restore the organiser's original timezone if stored; otherwise use browser tz
    const tz = seminar!.display_timezone ?? BROWSER_TZ;
    setEditForm({
      title: seminar!.title,
      description: seminar!.description ?? "",
      start_time: seminar!.start_time ? toTzInput(seminar!.start_time, tz) : "",
      end_time: seminar!.end_time ? toTzInput(seminar!.end_time, tz) : "",
      location: seminar!.location ?? "",
      max_capacity: seminar!.max_capacity ?? "",
      host: seminar!.host ?? "",
      cover_image: seminar!.cover_image ?? "",
      rsvp_enabled: seminar!.rsvp_enabled,
      waitlist_enabled: seminar!.waitlist_enabled,
      timezone: tz,
    });
    setEditMode(true);
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingCenter><Spinner />Loading seminar…</LoadingCenter>;
  }
  if (error || !seminar) {
    return <LoadingCenter>Seminar not found.</LoadingCenter>;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageContainer style={{ maxWidth: 900 }}>
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/seminar")} style={{ marginBottom: 20 }}>
        ← Back to list
      </Button>

      {/* ── Hero layout / Edit form ── */}
      {!editMode ? (
        <>
          {/* Timezone toggle */}
          {seminar.start_time && (
            <TzToggleBar>
              <TzToggleBtn
                active={tzView === "event"}
                onClick={() => setTzView("event")}
                title={seminar.display_timezone ?? BROWSER_TZ}
              >
                🌍 Event TZ{seminar.display_timezone ? ` (${tzAbbr(seminar.display_timezone, new Date(seminar.start_time))})` : ""}
              </TzToggleBtn>
              <TzToggleBtn
                active={tzView === "local"}
                onClick={() => setTzView("local")}
              >
                🖥 Local ({tzAbbr(BROWSER_TZ)})
              </TzToggleBtn>
            </TzToggleBar>
          )}

          <HeroLayout>
            {seminar.cover_image && (
              <CoverImg src={seminar.cover_image} alt="cover" />
            )}
            <InfoPanel>
              <TagRow>
                <DetailStatusBadge status={seminarStatus}>
                  {seminarStatus === "ongoing" && <DetailLiveDot />}
                  {seminarStatus === "upcoming" ? "Upcoming" : seminarStatus === "ongoing" ? "Live Now" : "Ended"}
                </DetailStatusBadge>
                {seminar.rsvp_enabled && <Badge color="purple">RSVP</Badge>}
                {seminar.waitlist_enabled && <Badge color="blue">Waitlist</Badge>}
              </TagRow>
              <SeminarTitle>{seminar.title}</SeminarTitle>
              {seminar.host && <HostLine><MicIcon size={14} />{seminar.host}</HostLine>}

              <MetaGrid>
                {seminar.start_time && (() => {
                  const etz = tzView === "event"
                    ? (seminar.display_timezone ?? BROWSER_TZ)
                    : BROWSER_TZ;
                  return (
                  <MetaItem>
                    <MetaIcon><CalendarIcon size={16} color="#F97316" /></MetaIcon>
                    <div>
                      <MetaLabel>Date & Time</MetaLabel>
                      <MetaValue>{formatDate(seminar.start_time, etz)}{seminar.end_time && ` — ${formatDate(seminar.end_time, etz)}`}</MetaValue>
                    </div>
                  </MetaItem>
                  );
                })()}
                {seminar.location && (
                  <MetaItem>
                    <MetaIcon><MapPinIcon size={16} color="#F97316" /></MetaIcon>
                    <div>
                      <MetaLabel>Location</MetaLabel>
                      <MetaValue>{seminar.location}</MetaValue>
                    </div>
                  </MetaItem>
                )}
                <MetaItem>
                  <MetaIcon><UsersIcon size={16} color="#F97316" /></MetaIcon>
                  <div>
                    <MetaLabel>Capacity</MetaLabel>
                    <MetaValue>
                      {seminar.current_rsvp_count} / {seminar.max_capacity ?? "∞"}
                      {seminar.waitlist_enabled && <span style={{ color: "#6b7280" }}> · Waitlist: {seminar.waitlist_count}</span>}
                    </MetaValue>
                  </div>
                </MetaItem>
              </MetaGrid>

              {/* ── My Status (inline) ── */}
              {!isStaff && seminar.rsvp_enabled && (
                <RsvpPanel>
                  <RsvpPanelTitle>My Status</RsvpPanelTitle>
                  {!isLoggedIn ? (
                    <AlertBox variant="info">
                      <a href="/signin">Sign in</a> to RSVP for this seminar.
                    </AlertBox>
                  ) : myRsvp ? (
                    <RsvpStatus>
                      <RsvpBadge confirmed><CheckCircleIcon size={16} /> RSVP Confirmed</RsvpBadge>
                      {myRsvp.checked_in && (
                        <RsvpSub><CheckIcon size={14} /> Checked in at {formatDate(myRsvp.checked_in_at)}</RsvpSub>
                      )}
                      {hasEnded ? (
                        <RsvpSub style={{ color: "#6b7280", fontSize: 12 }}>
                          This event has ended — your attendance record has been preserved.
                        </RsvpSub>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => cancelRsvpMutation.mutate()} disabled={cancelRsvpMutation.isPending}>
                          {cancelRsvpMutation.isPending ? "Cancelling…" : "Cancel RSVP"}
                        </Button>
                      )}
                    </RsvpStatus>
                  ) : myWaitlist ? (
                    <RsvpStatus>
                      <RsvpBadge><ClockIcon size={16} /> Waitlisted — #{myWaitlist.position}</RsvpBadge>
                      {!hasEnded && (
                        <Button variant="ghost" size="sm" onClick={() => cancelWaitlistMutation.mutate()} disabled={cancelWaitlistMutation.isPending}>
                          {cancelWaitlistMutation.isPending ? "Cancelling…" : "Cancel Waitlist"}
                        </Button>
                      )}
                    </RsvpStatus>
                  ) : hasEnded ? (
                    <AlertBox variant="warning">
                      RSVP is closed — this event ended {timeAgo(seminar.end_time!)}.
                    </AlertBox>
                  ) : hasStarted ? (
                    <AlertBox variant="warning">RSVP is closed — this event has already started.</AlertBox>
                  ) : isFull && !seminar.waitlist_enabled ? (
                    <AlertBox variant="warning">This seminar is full and waitlist is not available.</AlertBox>
                  ) : (
                    <Button onClick={() => rsvpMutation.mutate()} disabled={rsvpMutation.isPending} style={{ width: "100%" }}>
                      {rsvpMutation.isPending ? "Processing…" : isFull ? "Join Waitlist" : "RSVP Now"}
                    </Button>
                  )}
                </RsvpPanel>
              )}

              {isStaff && (
                <StaffActions>
                  <Button variant="secondary" size="sm" onClick={startEditForm}>Edit</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deleteSeminarMutation.isPending}
                    onClick={() => { if (confirm(`Delete seminar "${seminar.title}"?`)) deleteSeminarMutation.mutate(); }}
                  >
                    {deleteSeminarMutation.isPending ? "Deleting…" : "Delete"}
                  </Button>
                </StaffActions>
              )}
            </InfoPanel>
          </HeroLayout>

          {seminar.description && (
            <SeminarDescWrap>
              <MarkdownContent>{seminar.description}</MarkdownContent>
            </SeminarDescWrap>
          )}
          {seminar.location && (
            <MapFrame
              title="seminar-location"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(seminar.location)}&output=embed&hl=ko`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          )}
        </>
      ) : (
        /* ── Edit form ── */
        <SectionBlock>
          <SectionTitle>Edit Seminar</SectionTitle>
          <TwoCol>
            <FormGroup>
              <Label>Title *</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Host / Organizer</Label>
              <Input value={editForm.host} onChange={(e) => setEditForm({ ...editForm, host: e.target.value })} />
            </FormGroup>
          </TwoCol>
          <FormGroup>
            <Label>Description</Label>
            <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </FormGroup>
          <FormGroup>
            <Label>Timezone</Label>
            <TimezoneSelect
              value={editForm.timezone ?? BROWSER_TZ}
              onChange={(e) => {
                const tz = e.target.value;
                const prevTz = editForm.timezone ?? BROWSER_TZ;
                setEditForm((prev: Record<string, any>) => ({
                  ...prev,
                  timezone: tz,
                  start_time: prev.start_time
                    ? toTzInput(tzToUtcIso(prev.start_time, prevTz), tz)
                    : "",
                  end_time: prev.end_time
                    ? toTzInput(tzToUtcIso(prev.end_time, prevTz), tz)
                    : "",
                }));
              }}
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </TimezoneSelect>
          </FormGroup>

          <TwoCol>
            <FormGroup>
              <Label>Start time</Label>
              <Input type="datetime-local" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>End time</Label>
              <Input type="datetime-local" value={editForm.end_time} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} />
            </FormGroup>
          </TwoCol>
          <TwoCol>
            <FormGroup>
              <Label>Location</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Max capacity (Leave it empty for no limit)</Label>
              <Input type="number" value={editForm.max_capacity} onChange={(e) => setEditForm({ ...editForm, max_capacity: e.target.value })} />
            </FormGroup>
          </TwoCol>
          <FormGroup>
            <Label>Cover image URL</Label>
            <Input value={editForm.cover_image} onChange={(e) => setEditForm({ ...editForm, cover_image: e.target.value })} />
          </FormGroup>
          <CheckRow>
            <CheckboxRow>
              <input type="checkbox" checked={editForm.rsvp_enabled} onChange={(e) => setEditForm({ ...editForm, rsvp_enabled: e.target.checked })} />
              RSVP enabled
            </CheckboxRow>
            <CheckboxRow>
              <input type="checkbox" checked={editForm.waitlist_enabled} onChange={(e) => setEditForm({ ...editForm, waitlist_enabled: e.target.checked })} />
              Waitlist enabled
            </CheckboxRow>
          </CheckRow>
          <EditActions>
            <Button onClick={() => modifyMutation.mutate()} disabled={modifyMutation.isPending}>
              {modifyMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
          </EditActions>
        </SectionBlock>
      )}

      {/* ── Staff: Reminder email ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle><MailIcon size={17} /> Reminder Email</SectionTitle>
          <SectionDesc>Sends a seminar reminder email to all RSVP'd attendees.</SectionDesc>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm(`Send a reminder to ${seminar.current_rsvp_count} RSVP'd attendee(s)?`)) {
                  setReminderResult(null);
                  reminderMutation.mutate();
                }
              }}
              disabled={reminderMutation.isPending || seminar.current_rsvp_count === 0}
            >
              {reminderMutation.isPending ? "Sending…" : "Send Reminder"}
            </Button>
            {seminar.current_rsvp_count === 0 && (
              <span style={{ fontSize: 13, color: "#52525B" }}>No RSVPs yet</span>
            )}
          </div>
          {reminderResult && (
            <AlertBox variant={reminderResult.errors > 0 ? "warning" : "success"} style={{ marginTop: 12 }}>
              Sent — <strong>{reminderResult.sent}</strong> succeeded / <strong>{reminderResult.errors}</strong> failed / <strong>{reminderResult.total_rsvp}</strong> total RSVPs
            </AlertBox>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: Check-in token ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle><LockIcon size={17} /> Check-in Management</SectionTitle>
          {tokenActive ? (
            <>
              <AlertBox variant="success" style={{ marginBottom: 14 }}>
                <ShieldCheckIcon size={15} /> Check-in active &nbsp;|&nbsp; Expires: {formatDate(activeToken!.expires_at)}
              </AlertBox>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <Button variant="secondary" size="sm" onClick={() => setShowQR((v) => !v)}>
                  {showQR ? "Hide QR" : "Show QR Code"}
                </Button>
                <Button variant="danger" size="sm" onClick={() => stopCheckinMutation.mutate()} disabled={stopCheckinMutation.isPending}>
                  {stopCheckinMutation.isPending ? "Stopping…" : "Stop Check-in"}
                </Button>
              </div>
              {showQR && checkinUrl && (
                <QrBlock>
                  <QRCodeSVG value={checkinUrl} size={180} />
                  <QrUrl href={checkinUrl} target="_blank" rel="noreferrer">{checkinUrl}</QrUrl>
                </QrBlock>
              )}
            </>
          ) : (
            <TokenForm>
              <span style={{ fontSize: 14, color: "#6b7280" }}>Check-in is inactive</span>
              <TokenRow>
                <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8, color: "#374151" }}>
                  Duration (minutes):
                  <DurationInput
                    type="number"
                    min={1}
                    value={tokenDuration}
                    onChange={(e) => setTokenDuration(Number(e.target.value))}
                  />
                </label>
                <Button size="sm" onClick={() => createTokenMutation.mutate()} disabled={createTokenMutation.isPending}>
                  {createTokenMutation.isPending ? "Creating…" : "Start Check-in"}
                </Button>
              </TokenRow>
            </TokenForm>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: CSV Import ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle><FolderOpenIcon size={17} /> CSV Import</SectionTitle>
          <SectionDesc>Upload a CSV exported from Luma to automatically register attendees.</SectionDesc>
          <CsvRow>
            <FileInput
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) importCsvMutation.mutate(file); }}
              disabled={importCsvMutation.isPending}
            />
            {importCsvMutation.isPending && <span style={{ fontSize: 13, color: "#6b7280" }}>Processing…</span>}
          </CsvRow>
          {importResult && (
            <ImportResult>
              <ImportResultTitle>Import Result</ImportResultTitle>
              <ImportGrid>
                <ImportStat><span>Total Rows</span><strong>{importResult.total}</strong></ImportStat>
                <ImportStat><span>Existing Users</span><strong>{importResult.matched_regular}</strong></ImportStat>
                <ImportStat><span>Temp Matched</span><strong>{importResult.matched_temporary}</strong></ImportStat>
                <ImportStat><span>Temp Created</span><strong>{importResult.created_temporary}</strong></ImportStat>
                <ImportStat><span>RSVPs Created</span><strong>{importResult.rsvp_created}</strong></ImportStat>
                <ImportStat><span>RSVPs Skipped</span><strong>{importResult.rsvp_skipped}</strong></ImportStat>
                <ImportStat><span>Member Emails</span><strong>{importResult.membership_emails_sent}</strong></ImportStat>
              </ImportGrid>
              {importResult.errors?.length > 0 && (
                <AlertBox variant="error" style={{ marginTop: 12 }}>
                  {importResult.errors.length} error(s): {importResult.errors.join(", ")}
                </AlertBox>
              )}
              <Button variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={() => setImportResult(null)}>
                Close
              </Button>
            </ImportResult>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: RSVP list ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle><UsersIcon size={17} /> RSVP List ({seminar.current_rsvp_count})</SectionTitle>
          {seminar.users.length === 0 ? (
            <EmptyState style={{ padding: "24px 0" }}>No RSVPs yet</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Check-in</Th>
                    <Th>Check-in Time</Th>
                    <Th>Action</Th>
                  </tr>
                </Thead>
                <tbody>
                  {seminar.users.map((u) => (
                    <Tr key={u.id}>
                      <Td>{u.username}</Td>
                      <Td style={{ color: "#6b7280" }}>{u.email}</Td>
                      <Td>
                        <Badge color={u.checked_in ? "green" : "gray"}>
                          {u.checked_in ? "Done" : "Pending"}
                        </Badge>
                      </Td>
                      <Td style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(u.checked_in_at)}</Td>
                      <Td>
                        <RsvpActionCell>
                          <Button
                            size="sm"
                            variant={u.checked_in ? "danger" : "secondary"}
                            onClick={() => modifyCheckinMutation.mutate({ userId: u.id, checked_in: !u.checked_in })}
                            disabled={modifyCheckinMutation.isPending}
                          >
                            {u.checked_in ? "Undo" : "Check In"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            style={{ color: "#ef4444" }}
                            onClick={() => {
                              if (confirm(`Cancel RSVP for ${u.username}?`)) {
                                staffCancelRsvpMutation.mutate(u.id);
                              }
                            }}
                            disabled={staffCancelRsvpMutation.isPending}
                          >
                            Cancel RSVP
                          </Button>
                        </RsvpActionCell>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: Waitlist ── */}
      {isStaff && seminar.waitlist_enabled && (
        <SectionBlock>
          <SectionTitle><ClockIcon size={17} /> Waitlist ({seminar.waitlist_count})</SectionTitle>
          {seminar.waitlist.length === 0 ? (
            <EmptyState style={{ padding: "24px 0" }}>No one on the waitlist</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Joined At</Th>
                  </tr>
                </Thead>
                <tbody>
                  {seminar.waitlist.map((u) => (
                    <Tr key={u.id}>
                      <Td><Badge color="blue">{u.position}</Badge></Td>
                      <Td>{u.username}</Td>
                      <Td style={{ color: "#6b7280" }}>{u.email}</Td>
                      <Td style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(u.joined_at)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </SectionBlock>
      )}
    </PageContainer>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const HeroLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 28px;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

const CoverImg = styled.img`
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 14px;
  display: block;
  background: rgba(249, 115, 22, 0.05);

  @media (min-width: 640px) {
    width: 45%;
    max-height: none;
    height: auto;
    flex: 0 0 45%;
    object-fit: contain;
  }
`;

const InfoPanel = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const RsvpPanel = styled.div`
  margin-top: 20px;
  padding: 18px;
  background: rgba(249, 115, 22, 0.05);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RsvpPanelTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #52525B;
`;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const SeminarTitle = styled.h1`
  font-size: 22px;
  font-weight: 800;
  color: #F4F4F5;
  letter-spacing: -0.03em;
  margin-bottom: 6px;

  @media (min-width: 480px) { font-size: 26px; }
  @media (min-width: 640px) { font-size: 28px; }
  @media (min-width: 768px) { font-size: 34px; }
`;

const HostLine = styled.div`
  font-size: 15px;
  color: #F97316;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SeminarDescWrap = styled.div`
  margin-bottom: 24px;
`;

const MetaGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MetaIcon = styled.span`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(249, 115, 22, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MetaLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #52525B;
  margin-bottom: 2px;
`;

const MetaValue = styled.div`
  font-size: 14px;
  color: #F4F4F5;
  font-weight: 500;
`;

const StaffActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const TzToggleBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
`;

const TzToggleBtn = styled.button<{ active: boolean }>`
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  border: 1.5px solid ${({ active }) => active ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.1)"};
  background: ${({ active }) => active ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.04)"};
  color: ${({ active }) => active ? "#F97316" : "#71717A"};

  &:hover {
    border-color: rgba(249, 115, 22, 0.4);
    color: #F97316;
  }
`;

const TimezoneSelect = styled.select`
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #F4F4F5;
  background: #111113;
  cursor: pointer;
  font-family: inherit;

  option {
    background: #1A1A1E;
    color: #F4F4F5;
  }

  &:focus {
    outline: none;
    border-color: #F97316;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
  }
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0 16px;

  @media (min-width: 560px) { grid-template-columns: 1fr 1fr; }
`;

const CheckRow = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const EditActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SectionDesc = styled.p`
  font-size: 13px;
  color: #71717A;
  margin-bottom: 14px;
`;

const RsvpStatus = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
`;

const RsvpBadge = styled.div<{ confirmed?: boolean }>`
  font-size: 15px;
  font-weight: 600;
  color: ${({ confirmed }) => (confirmed ? "#4ADE80" : "#FCD34D")};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RsvpSub = styled.div`
  font-size: 13px;
  color: #71717A;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const QrBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  background: rgba(249, 115, 22, 0.05);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-top: 4px;
`;

const QrUrl = styled.a`
  font-size: 12px;
  color: #F97316;
  word-break: break-all;
`;

const TokenForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TokenRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const DurationInput = styled.input`
  width: 72px;
  padding: 6px 10px;
  font-size: 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  outline: none;
  font-family: inherit;
  background: #111113;
  color: #F4F4F5;

  &:focus {
    border-color: #F97316;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
  }
`;

const CsvRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const FileInput = styled.input`
  font-size: 13px;
  color: #A1A1AA;

  &::file-selector-button {
    padding: 7px 14px;
    background: rgba(249, 115, 22, 0.12);
    color: #F97316;
    border: 1px solid rgba(249, 115, 22, 0.3);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 10px;
    font-family: inherit;
    transition: background 0.15s;

    &:hover { background: rgba(249, 115, 22, 0.2); }
  }
`;

const ImportResult = styled.div`
  margin-top: 16px;
  background: rgba(249, 115, 22, 0.05);
  border: 1px solid rgba(249, 115, 22, 0.15);
  border-radius: 12px;
  padding: 18px 20px;
`;

const ImportResultTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #F4F4F5;
  margin-bottom: 12px;
`;

const ImportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 560px) { grid-template-columns: repeat(4, 1fr); }
`;

const ImportStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  span { font-size: 11px; color: #52525B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  strong { font-size: 18px; color: #F4F4F5; letter-spacing: -0.02em; }
`;

const RsvpActionCell = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: nowrap;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  table {
    min-width: 520px;
  }
`;

const MapFrame = styled.iframe`
  width: 100%;
  height: 280px;
  border: none;
  border-radius: 12px;
  margin-top: 4px;
  display: block;

  @media (min-width: 768px) {
    height: 360px;
  }
`;

// Seminar status badge (detail page)
const DetailStatusBadge = styled.span<{ status: "upcoming" | "ongoing" | "ended" }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 11px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  background: ${({ status }) =>
    status === "ongoing" ? "rgba(248,113,113,0.12)" :
    status === "upcoming" ? "rgba(74,222,128,0.10)" : "rgba(255,255,255,0.06)"};
  color: ${({ status }) =>
    status === "ongoing" ? "#F87171" :
    status === "upcoming" ? "#4ADE80" : "#71717A"};
`;

const DetailLiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F87171;
  display: inline-block;
  animation: pulse 1.4s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.75); }
  }
`;