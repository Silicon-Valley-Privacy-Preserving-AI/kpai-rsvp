import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { toLocalInput, toUtcIso } from "../utils/datetime";
import type { SeminarDetailResponse, CheckInTokenResponse } from "../types/seminar";
import MarkdownContent from "../components/MarkdownContent";
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SeminarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const seminarId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
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
      const payload: Record<string, any> = {};
      for (const key of Object.keys(editForm)) {
        const v = editForm[key];
        payload[key] = datetimeFields.has(key) ? (v ? toUtcIso(v) : null) : (v === "" ? null : v);
      }
      await axiosInstance.put(api.v1.seminarDetail(seminarId), payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }); setEditMode(false); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "수정 실패"),
  });

  const deleteSeminarMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarDetail(seminarId)); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminars"] }); navigate("/seminar"); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "삭제 실패"),
  });

  const rsvpMutation = useMutation({
    mutationFn: async () => { const res = await axiosInstance.post(api.v1.seminarRsvp(seminarId)); return res.data; },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] });
      if (data.waitlisted) alert(`대기자 등록 완료! 현재 대기 순서: ${data.position}번`);
      else alert("RSVP 완료!");
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "RSVP 실패"),
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarRsvp(seminarId)); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }); alert("RSVP 취소 완료"); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "RSVP 취소 실패"),
  });

  const cancelWaitlistMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarWaitlist(seminarId)); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }); alert("대기자 취소 완료"); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "대기자 취소 실패"),
  });

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(api.v1.seminarCheckinToken(seminarId), { duration_minutes: tokenDuration });
      return res.data as CheckInTokenResponse;
    },
    onSuccess: (data) => { setActiveToken(data); setShowQR(true); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "토큰 생성 실패"),
  });

  const stopCheckinMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.seminarCheckinToken(seminarId)); },
    onSuccess: () => { setActiveToken(null); setShowQR(false); },
    onError: (e: any) => alert(e.response?.data?.detail ?? "체크인 중지 실패"),
  });

  const modifyCheckinMutation = useMutation({
    mutationFn: async ({ userId, checked_in }: { userId: number; checked_in: boolean }) => {
      await axiosInstance.patch(api.v1.seminarUserCheckin(seminarId, userId), { checked_in });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "체크인 수정 실패"),
  });

  const reminderMutation = useMutation({
    mutationFn: async () => { const res = await axiosInstance.post(api.v1.seminarReminder(seminarId)); return res.data; },
    onSuccess: (data) => setReminderResult(data),
    onError: (e: any) => alert(e.response?.data?.detail ?? "리마인더 발송 실패"),
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
    onError: (e: any) => alert(e.response?.data?.detail ?? "CSV 임포트 실패"),
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  const myRsvp = seminar?.users.find((u) => u.id === me?.id);
  const myWaitlist = seminar?.waitlist.find((u) => u.id === me?.id);
  const isFull = seminar?.max_capacity != null && seminar.current_rsvp_count >= seminar.max_capacity;
  const checkinUrl = activeToken ? `${window.location.origin}/check-in?token=${activeToken.token}` : null;
  const tokenActive = activeToken && new Date(activeToken.expires_at) > new Date();

  const startEditForm = () => {
    setEditForm({
      title: seminar!.title,
      description: seminar!.description ?? "",
      start_time: seminar!.start_time ? toLocalInput(seminar!.start_time) : "",
      end_time: seminar!.end_time ? toLocalInput(seminar!.end_time) : "",
      location: seminar!.location ?? "",
      max_capacity: seminar!.max_capacity ?? "",
      host: seminar!.host ?? "",
      cover_image: seminar!.cover_image ?? "",
      rsvp_enabled: seminar!.rsvp_enabled,
      waitlist_enabled: seminar!.waitlist_enabled,
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

      {/* Cover image */}
      {seminar.cover_image && (
        <CoverImg src={seminar.cover_image} alt="cover" />
      )}

      {/* ── Header info / Edit form ── */}
      {!editMode ? (
        <InfoSection>
          <InfoLeft>
            <TagRow>
              {seminar.rsvp_enabled && <Badge color="purple">RSVP</Badge>}
              {seminar.waitlist_enabled && <Badge color="blue">Waitlist</Badge>}
            </TagRow>
            <SeminarTitle>{seminar.title}</SeminarTitle>
            {seminar.host && <HostLine>🎙 {seminar.host}</HostLine>}
            {seminar.description && (
              <SeminarDescWrap>
                <MarkdownContent>{seminar.description}</MarkdownContent>
              </SeminarDescWrap>
            )}

            <MetaGrid>
              {seminar.start_time && (
                <MetaItem>
                  <MetaIcon>📅</MetaIcon>
                  <div>
                    <MetaLabel>Date & Time</MetaLabel>
                    <MetaValue>{formatDate(seminar.start_time)}{seminar.end_time && ` — ${formatDate(seminar.end_time)}`}</MetaValue>
                  </div>
                </MetaItem>
              )}
              {seminar.location && (
                <MetaItem>
                  <MetaIcon>📍</MetaIcon>
                  <div>
                    <MetaLabel>Location</MetaLabel>
                    <MetaValue>{seminar.location}</MetaValue>
                  </div>
                </MetaItem>
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
              <MetaItem>
                <MetaIcon>👥</MetaIcon>
                <div>
                  <MetaLabel>Capacity</MetaLabel>
                  <MetaValue>
                    {seminar.current_rsvp_count} / {seminar.max_capacity ?? "∞"}
                    {seminar.waitlist_enabled && <span style={{ color: "#6b7280" }}> · Waitlist: {seminar.waitlist_count}</span>}
                  </MetaValue>
                </div>
              </MetaItem>
            </MetaGrid>

            {isStaff && (
              <StaffActions>
                <Button variant="secondary" size="sm" onClick={startEditForm}>Edit</Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deleteSeminarMutation.isPending}
                  onClick={() => { if (confirm(`"${seminar.title}" 세미나를 삭제하시겠습니까?`)) deleteSeminarMutation.mutate(); }}
                >
                  {deleteSeminarMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
              </StaffActions>
            )}
          </InfoLeft>
        </InfoSection>
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
              <Label>Max capacity</Label>
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

      {/* ── Member: RSVP / Waitlist ── */}
      {!isStaff && seminar.rsvp_enabled && (
        <SectionBlock>
          <SectionTitle>My Status</SectionTitle>
          {!isLoggedIn ? (
            <AlertBox variant="info">
              <a href="/signin">로그인</a>하면 RSVP 할 수 있습니다.
            </AlertBox>
          ) : myRsvp ? (
            <RsvpStatus>
              <RsvpBadge confirmed>✅ RSVP Confirmed</RsvpBadge>
              {myRsvp.checked_in && (
                <RsvpSub>☑ Checked in at {formatDate(myRsvp.checked_in_at)}</RsvpSub>
              )}
              <Button variant="danger" size="sm" onClick={() => cancelRsvpMutation.mutate()} disabled={cancelRsvpMutation.isPending}>
                {cancelRsvpMutation.isPending ? "Cancelling…" : "Cancel RSVP"}
              </Button>
            </RsvpStatus>
          ) : myWaitlist ? (
            <RsvpStatus>
              <RsvpBadge>⏳ Waitlisted — #{myWaitlist.position}</RsvpBadge>
              <Button variant="ghost" size="sm" onClick={() => cancelWaitlistMutation.mutate()} disabled={cancelWaitlistMutation.isPending}>
                {cancelWaitlistMutation.isPending ? "Cancelling…" : "Cancel Waitlist"}
              </Button>
            </RsvpStatus>
          ) : isFull && !seminar.waitlist_enabled ? (
            <AlertBox variant="warning">This seminar is full and waitlist is not available.</AlertBox>
          ) : (
            <Button onClick={() => rsvpMutation.mutate()} disabled={rsvpMutation.isPending}>
              {rsvpMutation.isPending ? "Processing…" : isFull ? "Join Waitlist" : "RSVP Now"}
            </Button>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: Reminder email ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle>📧 Reminder Email</SectionTitle>
          <SectionDesc>RSVP 등록된 모든 참석자에게 세미나 안내 이메일을 발송합니다.</SectionDesc>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm(`RSVP 참석자 ${seminar.current_rsvp_count}명에게 리마인더를 발송하시겠습니까?`)) {
                  setReminderResult(null);
                  reminderMutation.mutate();
                }
              }}
              disabled={reminderMutation.isPending || seminar.current_rsvp_count === 0}
            >
              {reminderMutation.isPending ? "발송 중…" : "Send Reminder"}
            </Button>
            {seminar.current_rsvp_count === 0 && (
              <span style={{ fontSize: 13, color: "#9ca3af" }}>No RSVPs yet</span>
            )}
          </div>
          {reminderResult && (
            <AlertBox variant={reminderResult.errors > 0 ? "warning" : "success"} style={{ marginTop: 12 }}>
              발송 완료 — 성공 <strong>{reminderResult.sent}</strong>건 / 실패 <strong>{reminderResult.errors}</strong>건 / 총 RSVP <strong>{reminderResult.total_rsvp}</strong>명
            </AlertBox>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: Check-in token ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle>🔐 Check-in Management</SectionTitle>
          {tokenActive ? (
            <>
              <AlertBox variant="success" style={{ marginBottom: 14 }}>
                ✅ 체크인 활성 중 &nbsp;|&nbsp; 만료: {formatDate(activeToken!.expires_at)}
              </AlertBox>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <Button variant="secondary" size="sm" onClick={() => setShowQR((v) => !v)}>
                  {showQR ? "QR 숨기기" : "QR 코드 보기"}
                </Button>
                <Button variant="danger" size="sm" onClick={() => stopCheckinMutation.mutate()} disabled={stopCheckinMutation.isPending}>
                  {stopCheckinMutation.isPending ? "Stopping…" : "체크인 중지"}
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
              <span style={{ fontSize: 14, color: "#6b7280" }}>체크인 비활성 상태</span>
              <TokenRow>
                <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8, color: "#374151" }}>
                  유효 시간(분):
                  <DurationInput
                    type="number"
                    min={1}
                    value={tokenDuration}
                    onChange={(e) => setTokenDuration(Number(e.target.value))}
                  />
                </label>
                <Button size="sm" onClick={() => createTokenMutation.mutate()} disabled={createTokenMutation.isPending}>
                  {createTokenMutation.isPending ? "Creating…" : "체크인 시작"}
                </Button>
              </TokenRow>
            </TokenForm>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: CSV Import ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle>📂 CSV Import</SectionTitle>
          <SectionDesc>Luma에서 내보낸 CSV 파일을 업로드하면 참석자를 자동으로 등록합니다.</SectionDesc>
          <CsvRow>
            <FileInput
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) importCsvMutation.mutate(file); }}
              disabled={importCsvMutation.isPending}
            />
            {importCsvMutation.isPending && <span style={{ fontSize: 13, color: "#6b7280" }}>처리 중…</span>}
          </CsvRow>
          {importResult && (
            <ImportResult>
              <ImportResultTitle>임포트 결과</ImportResultTitle>
              <ImportGrid>
                <ImportStat><span>총 행수</span><strong>{importResult.total}</strong></ImportStat>
                <ImportStat><span>기존 유저</span><strong>{importResult.matched_regular}</strong></ImportStat>
                <ImportStat><span>임시 유저 매칭</span><strong>{importResult.matched_temporary}</strong></ImportStat>
                <ImportStat><span>임시 유저 생성</span><strong>{importResult.created_temporary}</strong></ImportStat>
                <ImportStat><span>RSVP 생성</span><strong>{importResult.rsvp_created}</strong></ImportStat>
                <ImportStat><span>RSVP 중복 스킵</span><strong>{importResult.rsvp_skipped}</strong></ImportStat>
                <ImportStat><span>멤버십 이메일</span><strong>{importResult.membership_emails_sent}</strong></ImportStat>
              </ImportGrid>
              {importResult.errors?.length > 0 && (
                <AlertBox variant="error" style={{ marginTop: 12 }}>
                  오류 {importResult.errors.length}건: {importResult.errors.join(", ")}
                </AlertBox>
              )}
              <Button variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={() => setImportResult(null)}>
                결과 닫기
              </Button>
            </ImportResult>
          )}
        </SectionBlock>
      )}

      {/* ── Staff: RSVP list ── */}
      {isStaff && (
        <SectionBlock>
          <SectionTitle>👥 RSVP 목록 ({seminar.current_rsvp_count}명)</SectionTitle>
          {seminar.users.length === 0 ? (
            <EmptyState style={{ padding: "24px 0" }}>RSVP 없음</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>이름</Th>
                    <Th>이메일</Th>
                    <Th>체크인</Th>
                    <Th>체크인 시각</Th>
                    <Th>조작</Th>
                  </tr>
                </Thead>
                <tbody>
                  {seminar.users.map((u) => (
                    <Tr key={u.id}>
                      <Td>{u.username}</Td>
                      <Td style={{ color: "#6b7280" }}>{u.email}</Td>
                      <Td>
                        <Badge color={u.checked_in ? "green" : "gray"}>
                          {u.checked_in ? "완료" : "미완료"}
                        </Badge>
                      </Td>
                      <Td style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(u.checked_in_at)}</Td>
                      <Td>
                        <Button
                          size="sm"
                          variant={u.checked_in ? "danger" : "secondary"}
                          onClick={() => modifyCheckinMutation.mutate({ userId: u.id, checked_in: !u.checked_in })}
                          disabled={modifyCheckinMutation.isPending}
                        >
                          {u.checked_in ? "취소" : "체크인"}
                        </Button>
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
          <SectionTitle>⏳ 대기자 목록 ({seminar.waitlist_count}명)</SectionTitle>
          {seminar.waitlist.length === 0 ? (
            <EmptyState style={{ padding: "24px 0" }}>대기자 없음</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>#</Th>
                    <Th>이름</Th>
                    <Th>이메일</Th>
                    <Th>등록 시각</Th>
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

const CoverImg = styled.img`
  width: 100%;
  height: 260px;
  object-fit: cover;
  border-radius: 14px;
  margin-bottom: 24px;
  display: block;
`;

const InfoSection = styled.div`
  margin-bottom: 4px;
`;

const InfoLeft = styled.div``;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const SeminarTitle = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
  margin-bottom: 6px;

  @media (min-width: 768px) { font-size: 34px; }
`;

const HostLine = styled.div`
  font-size: 15px;
  color: #6c5ce7;
  font-weight: 600;
  margin-bottom: 12px;
`;

const SeminarDescWrap = styled.div`
  margin-bottom: 20px;
`;

const MetaGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const MetaIcon = styled.span`
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
`;

const MetaLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-bottom: 2px;
`;

const MetaValue = styled.div`
  font-size: 14px;
  color: #111827;
  font-weight: 500;
`;

const StaffActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
`;

const SectionDesc = styled.p`
  font-size: 13px;
  color: #9ca3af;
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
  color: ${({ confirmed }) => (confirmed ? "#059669" : "#d97706")};
`;

const RsvpSub = styled.div`
  font-size: 13px;
  color: #6b7280;
`;

const QrBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  background: #f8f7ff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 20px;
  margin-top: 4px;
`;

const QrUrl = styled.a`
  font-size: 12px;
  color: #6c5ce7;
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
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: #6c5ce7;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
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
  color: #374151;

  &::file-selector-button {
    padding: 7px 14px;
    background: #ede9fe;
    color: #6c5ce7;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 10px;
    font-family: inherit;
    transition: background 0.15s;

    &:hover { background: #ddd6fe; }
  }
`;

const ImportResult = styled.div`
  margin-top: 16px;
  background: #f8f7ff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px 20px;
`;

const ImportResultTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #111827;
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

  span { font-size: 11px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  strong { font-size: 18px; color: #111827; }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const MapFrame = styled.iframe`
  width: 100%;
  height: 280px;
  border: none;
  border-radius: 12px;
  margin-top: 4px;
  display: block;

  @media (min-width: 768px) {
    height: 340px;
  }
`;
