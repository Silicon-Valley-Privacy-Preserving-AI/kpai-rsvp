import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import type { SeminarResponse } from "../types/seminar";
import { toTzInput, tzToUtcIso, formatInTz, tzAbbr } from "../utils/datetime";
import { TIMEZONE_OPTIONS, BROWSER_TZ } from "../utils/constants";
import {
  Button,
  Input,
  Textarea,
  Label,
  FormGroup,
  CheckboxRow,
  Badge,
  PageContainer,
  PageHeader,
  PageTitle,
  LoadingCenter,
  Spinner,
  EmptyState,
  AlertBox,
} from "../components/ui";
import { MicIcon, CalendarIcon, MapPinIcon, UsersIcon, XIcon, PlusIcon, SparklesIcon } from "../components/icons";

// ── Seminar status ────────────────────────────────────────────────────────────

type SeminarStatus = "upcoming" | "ongoing" | "ended";

function getSeminarStatus(startTime: string | null, endTime: string | null): SeminarStatus {
  const now = new Date();
  if (!startTime || new Date(startTime) > now) return "upcoming";
  if (!endTime || new Date(endTime) > now) return "ongoing";
  return "ended";
}

/** Strip markdown syntax for plain-text card previews. */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")   // fenced code blocks
    .replace(/`[^`]*`/g, "")           // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")   // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links → label
    .replace(/^#{1,6}\s+/gm, "")       // headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")   // italic
    .replace(/^[-*+]\s+/gm, "")        // list bullets
    .replace(/^\d+\.\s+/gm, "")        // ordered list
    .replace(/^>\s+/gm, "")            // blockquotes
    .replace(/[-]{3,}/g, "")           // hr
    .replace(/\n+/g, " ")
    .trim();
}

function formatDate(iso: string | null, tz: string) {
  if (!iso) return null;
  return `${formatInTz(iso, tz)} ${tzAbbr(tz, new Date(iso))}`;
}

export default function SeminarListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [statusFilter, setStatusFilter] = useState<"all" | SeminarStatus>("all");
  const [form, setForm] = useState({
    title: "", description: "", start_time: "", end_time: "",
    location: "", max_capacity: "", host: "", cover_image: "",
    rsvp_enabled: true, waitlist_enabled: false,
    timezone: BROWSER_TZ,
  });

  // ── Timezone display toggle ───────────────────────────────────────────────
  // "event" = use seminar's display_timezone; "local" = browser timezone
  const [tzView, setTzView] = useState<"event" | "local">("event");

  // ── Luma import state ─────────────────────────────────────────────────────
  const [lumaUrl, setLumaUrl] = useState("");
  const [lumaWarnings, setLumaWarnings] = useState<string[]>([]);
  const [lumaExtracted, setLumaExtracted] = useState<string[]>([]);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.users); return res.data; },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });
  const isStaff = me?.role === "staff";

  const { data: seminars = [], isLoading } = useQuery<SeminarResponse[]>({
    queryKey: ["seminars"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.seminars); return res.data; },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(api.v1.seminars, {
        title: form.title,
        description: form.description || null,
        start_time: form.start_time ? tzToUtcIso(form.start_time, form.timezone) : null,
        end_time: form.end_time ? tzToUtcIso(form.end_time, form.timezone) : null,
        location: form.location || null,
        max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
        host: form.host || null,
        cover_image: form.cover_image || null,
        rsvp_enabled: form.rsvp_enabled,
        waitlist_enabled: form.waitlist_enabled,
        display_timezone: form.timezone || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
      setShowCreateForm(false);
      setCreateError("");
      setForm({ title: "", description: "", start_time: "", end_time: "", location: "", max_capacity: "", host: "", cover_image: "", rsvp_enabled: true, waitlist_enabled: false, timezone: BROWSER_TZ });
      setLumaUrl("");
      setLumaWarnings([]);
      setLumaExtracted([]);
    },
    onError: (e: any) => setCreateError(e.response?.data?.detail ?? "Failed to create seminar"),
  });

  const lumaMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(api.v1.seminarPreviewFromLuma, { url: lumaUrl });
      return res.data;
    },
    onSuccess: (data) => {
      setLumaWarnings(data.warnings ?? []);
      setLumaExtracted(data.extracted_fields ?? []);
      // Use the event's original timezone when available so times are
      // displayed in the event's local timezone, not the browser timezone.
      const tz = data.event_timezone ?? BROWSER_TZ;
      setForm((prev) => ({
        ...prev,
        title:       data.title       ?? prev.title,
        description: data.description ?? prev.description,
        host:        data.host        ?? prev.host,
        location:    data.location    ?? prev.location,
        cover_image: data.cover_image ?? prev.cover_image,
        timezone:    tz,
        start_time:  data.start_time  ? toTzInput(data.start_time, tz) : prev.start_time,
        end_time:    data.end_time    ? toTzInput(data.end_time, tz)   : prev.end_time,
      }));
    },
    onError: (e: any) => {
      setLumaWarnings([e.response?.data?.detail ?? "Failed to fetch Luma page"]);
      setLumaExtracted([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await axiosInstance.delete(api.v1.seminarDetail(id)); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminars"] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "Delete failed"),
  });

  const sortedSeminars = [...seminars].sort((a, b) => {
    const ta = new Date(a.start_time ?? a.created_at).getTime();
    const tb = new Date(b.start_time ?? b.created_at).getTime();
    return sortDir === "desc" ? tb - ta : ta - tb;
  });

  const filteredSeminars = statusFilter === "all"
    ? sortedSeminars
    : sortedSeminars.filter((s) => getSeminarStatus(s.start_time, s.end_time) === statusFilter);

  const statusCounts = {
    all: seminars.length,
    upcoming: seminars.filter((s) => getSeminarStatus(s.start_time, s.end_time) === "upcoming").length,
    ongoing: seminars.filter((s) => getSeminarStatus(s.start_time, s.end_time) === "ongoing").length,
    ended: seminars.filter((s) => getSeminarStatus(s.start_time, s.end_time) === "ended").length,
  };

  if (isLoading) {
    return (
      <LoadingCenter>
        <Spinner />
        Loading seminars…
      </LoadingCenter>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Seminars</PageTitle>
        <HeaderActions>
          <TzToggle onClick={() => setTzView((v) => v === "event" ? "local" : "event")} title="Toggle timezone display">
            {tzView === "event" ? `🌍 Event TZ` : `🖥 Local (${tzAbbr(BROWSER_TZ)})`}
          </TzToggle>
          <SortDirBtn onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
            {sortDir === "desc" ? "↓ Newest first" : "↑ Oldest first"}
          </SortDirBtn>
          {isStaff && (
            <Button
              variant={showCreateForm ? "ghost" : "primary"}
              onClick={() => { setShowCreateForm((v) => !v); setCreateError(""); }}
            >
              {showCreateForm
              ? <BtnInner><XIcon size={15} /> Cancel</BtnInner>
              : <BtnInner><PlusIcon size={15} /> New Seminar</BtnInner>}
            </Button>
          )}
        </HeaderActions>
      </PageHeader>

      {/* ── Status filter ── */}
      <FilterBar>
        {(["all", "upcoming", "ongoing", "ended"] as const).map((f) => (
          <FilterBtn key={f} active={statusFilter === f} status={f} onClick={() => setStatusFilter(f)}>
            {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : f === "ongoing" ? "Live Now" : "Ended"}
            <FilterCount active={statusFilter === f}>{statusCounts[f]}</FilterCount>
          </FilterBtn>
        ))}
      </FilterBar>

      {/* ── Create form ── */}
      {isStaff && showCreateForm && (
        <CreateForm>
          <CreateFormTitle>New Seminar</CreateFormTitle>

          {/* ── Luma import ── */}
          <LumaSection>
            <LumaSectionTitle>
              <SparklesIcon size={14} />
              Import from Luma
            </LumaSectionTitle>
            <LumaRow>
              <Input
                placeholder="https://lu.ma/…"
                value={lumaUrl}
                onChange={(e) => { setLumaUrl(e.target.value); setLumaWarnings([]); setLumaExtracted([]); }}
                style={{ flex: 1 }}
              />
              <LumaFetchBtn
                onClick={() => lumaMutation.mutate()}
                disabled={!lumaUrl.trim() || lumaMutation.isPending}
              >
                {lumaMutation.isPending ? "Fetching…" : "Fetch"}
              </LumaFetchBtn>
            </LumaRow>
            {lumaExtracted.length > 0 && (
              <LumaSuccessRow>
                Filled: {lumaExtracted.join(", ")}
              </LumaSuccessRow>
            )}
            {lumaWarnings.map((w, i) => (
              <LumaWarning key={i}>{w}</LumaWarning>
            ))}
          </LumaSection>

          {createError && (
            <AlertBox variant="error" style={{ marginBottom: 16 }}>
              {createError}
            </AlertBox>
          )}

          <TwoCol>
            <FormGroup>
              <Label>Title *</Label>
              <Input placeholder="Seminar title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Host / Organizer</Label>
              <Input placeholder="Speaker or org name" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </FormGroup>
          </TwoCol>

          <FormGroup>
            <Label>Description</Label>
            <Textarea placeholder="What is this seminar about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormGroup>

          <FormGroup>
            <Label>Timezone</Label>
            <TimezoneSelect
              value={form.timezone}
              onChange={(e) => {
                const tz = e.target.value;
                // Re-convert existing times into the newly selected timezone
                setForm((prev) => ({
                  ...prev,
                  timezone: tz,
                  start_time: prev.start_time
                    ? toTzInput(tzToUtcIso(prev.start_time, prev.timezone), tz)
                    : "",
                  end_time: prev.end_time
                    ? toTzInput(tzToUtcIso(prev.end_time, prev.timezone), tz)
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
              <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>End time</Label>
              <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </FormGroup>
          </TwoCol>

          <TwoCol>
            <FormGroup>
              <Label>Location</Label>
              <Input placeholder="Venue or online link" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Max capacity</Label>
              <Input type="number" placeholder="Leave blank for unlimited" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} />
            </FormGroup>
          </TwoCol>

          <FormGroup>
            <Label>Cover image URL</Label>
            <Input placeholder="https://..." value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
          </FormGroup>

          <CheckRow>
            <CheckboxRow>
              <input type="checkbox" checked={form.rsvp_enabled} onChange={(e) => setForm({ ...form, rsvp_enabled: e.target.checked })} />
              RSVP enabled
            </CheckboxRow>
            <CheckboxRow>
              <input type="checkbox" checked={form.waitlist_enabled} onChange={(e) => setForm({ ...form, waitlist_enabled: e.target.checked })} />
              Waitlist enabled
            </CheckboxRow>
          </CheckRow>

          <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create Seminar"}
          </Button>
        </CreateForm>
      )}

      {/* ── Seminar cards ── */}
      {filteredSeminars.length === 0 ? (
        <EmptyState>No seminars match this filter.</EmptyState>
      ) : (
        <Grid>
          {filteredSeminars.map((s) => {
            const status = getSeminarStatus(s.start_time, s.end_time);
            const effectiveTz = tzView === "event"
              ? (s.display_timezone ?? BROWSER_TZ)
              : BROWSER_TZ;
            return (
            <SeminarCard key={s.id} ended={status === "ended"} onClick={() => navigate(`/seminar/${s.id}`)}>
              {s.cover_image && (
                <CoverImg src={s.cover_image} alt="cover" ended={status === "ended"} />
              )}
              <CardContent>
                <TagRowTop>
                  <StatusBadge status={status}>
                    {status === "ongoing" && <LiveDot />}
                    {status === "upcoming" ? "Upcoming" : status === "ongoing" ? "Live Now" : "Ended"}
                  </StatusBadge>
                  {s.rsvp_enabled && <Badge color="purple">RSVP</Badge>}
                  {s.waitlist_enabled && <Badge color="blue">Waitlist</Badge>}
                  {s.max_capacity == null && <Badge color="gray">Unlimited</Badge>}
                </TagRowTop>

                <SeminarTitle>{s.title}</SeminarTitle>
                {s.host && <HostLine><MicIcon size={14} color="#F97316" /> {s.host}</HostLine>}
                {s.description && <Description>{stripMarkdown(s.description)}</Description>}

                <MetaBlock>
                  {s.start_time && (
                    <MetaItem><CalendarIcon size={13} />{formatDate(s.start_time, effectiveTz)}{s.end_time && ` — ${formatDate(s.end_time, effectiveTz)}`}</MetaItem>
                  )}
                  {s.location && <MetaItem><MapPinIcon size={13} />{s.location}</MetaItem>}
                  {s.max_capacity != null && (
                    <MetaItem><UsersIcon size={13} />Capacity: {s.max_capacity}</MetaItem>
                  )}
                </MetaBlock>

                <CardActions onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" onClick={() => navigate(`/seminar/${s.id}`)}>
                    View Detail →
                  </Button>
                  {isStaff && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Delete "${s.title}"?`)) deleteMutation.mutate(s.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </CardActions>
              </CardContent>
            </SeminarCard>
            );
          })}
        </Grid>
      )}
    </PageContainer>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const LumaSection = styled.div`
  background: rgba(249, 115, 22, 0.05);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 22px;
`;

const LumaSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #F97316;
  margin-bottom: 10px;
`;

const LumaRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const LumaFetchBtn = styled.button`
  flex-shrink: 0;
  padding: 0 18px;
  height: 38px;
  background: #F97316;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: #EA6C0A; }
  &:disabled { background: rgba(249, 115, 22, 0.35); cursor: not-allowed; }
`;

const LumaSuccessRow = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: #4ADE80;
  font-weight: 500;
`;

const LumaWarning = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: #FCD34D;
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

const CreateForm = styled.div`
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px 16px 16px;
  margin-bottom: 32px;

  @media (min-width: 560px) {
    padding: 28px 28px 24px;
  }
`;

const CreateFormTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #F4F4F5;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0 16px;

  @media (min-width: 560px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const CheckRow = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 580px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
`;

const SeminarCard = styled.div<{ ended?: boolean }>`
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  opacity: ${({ ended }) => ended ? 0.55 : 1};
  transition: box-shadow 0.2s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s, opacity 0.2s;

  &:hover {
    opacity: 1;
    box-shadow: 0 8px 32px rgba(249, 115, 22, 0.1);
    transform: translateY(-2px);
    border-color: rgba(249, 115, 22, 0.35);
  }
`;

const CoverImg = styled.img<{ ended?: boolean }>`
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
  filter: ${({ ended }) => ended ? "grayscale(40%)" : "none"};
  transition: filter 0.2s;
`;

// Status badge
const StatusBadge = styled.span<{ status: SeminarStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  background: ${({ status }) =>
    status === "ongoing" ? "rgba(248, 113, 113, 0.12)" :
    status === "upcoming" ? "rgba(74, 222, 128, 0.10)" : "rgba(255,255,255,0.05)"};
  color: ${({ status }) =>
    status === "ongoing" ? "#F87171" :
    status === "upcoming" ? "#4ADE80" : "#A1A1AA"};
`;

const LiveDot = styled.span`
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

const CardContent = styled.div`
  padding: 18px 20px 20px;
`;

const TagRowTop = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const SeminarTitle = styled.h2`
  font-size: 17px;
  font-weight: 700;
  color: #F4F4F5;
  margin-bottom: 4px;
  line-height: 1.35;
  letter-spacing: -0.02em;
`;

const HostLine = styled.div`
  font-size: 13px;
  color: #F97316;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Description = styled.p`
  font-size: 13px;
  color: #A1A1AA;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaBlock = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaItem = styled.div`
  font-size: 13px;
  color: #A1A1AA;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const BtnInner = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-bottom: 20px;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const FilterBtn = styled.button<{ active: boolean; status: "all" | SeminarStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  border: 1.5px solid ${({ active, status }) =>
    !active ? "rgba(255,255,255,0.1)" :
    status === "ongoing" ? "rgba(248,113,113,0.5)" :
    status === "upcoming" ? "rgba(74,222,128,0.4)" :
    status === "ended" ? "rgba(255,255,255,0.15)" : "rgba(249,115,22,0.5)"};
  background: ${({ active, status }) =>
    !active ? "rgba(255,255,255,0.04)" :
    status === "ongoing" ? "rgba(248,113,113,0.1)" :
    status === "upcoming" ? "rgba(74,222,128,0.08)" :
    status === "ended" ? "rgba(255,255,255,0.06)" : "rgba(249,115,22,0.1)"};
  color: ${({ active, status }) =>
    !active ? "#A1A1AA" :
    status === "ongoing" ? "#F87171" :
    status === "upcoming" ? "#4ADE80" :
    status === "ended" ? "#A1A1AA" : "#F97316"};

  &:hover {
    border-color: ${({ status }) =>
      status === "ongoing" ? "rgba(248,113,113,0.6)" :
      status === "upcoming" ? "rgba(74,222,128,0.5)" :
      status === "ended" ? "rgba(255,255,255,0.25)" : "rgba(249,115,22,0.6)"};
    color: ${({ status }) =>
      status === "ongoing" ? "#F87171" :
      status === "upcoming" ? "#4ADE80" :
      status === "ended" ? "#A1A1AA" : "#F97316"};
    background: ${({ status }) =>
      status === "ongoing" ? "rgba(248,113,113,0.08)" :
      status === "upcoming" ? "rgba(74,222,128,0.06)" :
      status === "ended" ? "rgba(255,255,255,0.04)" : "rgba(249,115,22,0.08)"};
  }
`;

const FilterCount = styled.span<{ active: boolean }>`
  background: ${({ active }) => active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"};
  color: inherit;
  font-size: 11px;
  font-weight: 700;
  padding: 0 6px;
  border-radius: 10px;
  line-height: 18px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const TzToggle = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1.5px solid rgba(249, 115, 22, 0.35);
  border-radius: 8px;
  background: rgba(249, 115, 22, 0.07);
  color: #F97316;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(249, 115, 22, 0.12);
    border-color: rgba(249, 115, 22, 0.55);
  }
`;

const SortDirBtn = styled.button`
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: #A1A1AA;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.18);
    color: #F4F4F5;
  }
`;