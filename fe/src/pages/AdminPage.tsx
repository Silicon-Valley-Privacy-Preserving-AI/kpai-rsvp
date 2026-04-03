import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import {
  Badge,
  PageContainer,
  PageHeader,
  PageTitle,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  LoadingCenter,
  Spinner,
  Button,
  AlertBox,
  EmptyState,
} from "../components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserAdminRow {
  id: number;
  created_at: string;
  email: string;
  username: string;
  role: string;
  is_temporary: boolean;
  full_member_email_sent: boolean;
}

interface SystemSeminar {
  id: number;
  created_at: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  host: string | null;
  max_capacity: number | null;
  rsvp_enabled: boolean;
  waitlist_enabled: boolean;
}

interface SystemRsvp {
  id: number;
  created_at: string;
  seminar_id: number;
  user_id: number;
  checked_in: boolean;
  checked_in_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function pct(num: number, den: number) {
  if (den === 0) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SeminarRowProps {
  seminar: SystemSeminar;
  rsvps: SystemRsvp[];
  users: UserAdminRow[];
}

function SeminarRow({ seminar, rsvps, users }: SeminarRowProps) {
  const [open, setOpen] = useState(false);

  const semRsvps = rsvps.filter((r) => r.seminar_id === seminar.id);
  const checkinCount = semRsvps.filter((r) => r.checked_in).length;
  const rsvpCount = semRsvps.length;
  const noshowCount = rsvpCount - checkinCount;

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <SeminarCard>
      {/* ── Collapsed header ── */}
      <SeminarHeader onClick={() => setOpen((v) => !v)}>
        <HeaderLeft>
          <Chevron open={open}>▶</Chevron>
          <HeaderInfo>
            <SeminarName>{seminar.title}</SeminarName>
            <SeminarMeta>
              {seminar.start_time && <span>📅 {formatDate(seminar.start_time)}</span>}
              {seminar.host && <span>🎙 {seminar.host}</span>}
              {seminar.location && <span>📍 {seminar.location}</span>}
            </SeminarMeta>
          </HeaderInfo>
        </HeaderLeft>

        <StatPills onClick={(e) => e.stopPropagation()}>
          <StatPill>
            <PillNum>{rsvpCount}</PillNum>
            <PillLabel>RSVP</PillLabel>
          </StatPill>
          <StatPill color="green">
            <PillNum>{checkinCount}</PillNum>
            <PillLabel>체크인</PillLabel>
          </StatPill>
          <StatPill color="orange">
            <PillNum>{noshowCount}</PillNum>
            <PillLabel>노쇼</PillLabel>
          </StatPill>
          {seminar.max_capacity != null && (
            <StatPill color="purple">
              <PillNum>{pct(rsvpCount, seminar.max_capacity)}</PillNum>
              <PillLabel>신청율</PillLabel>
            </StatPill>
          )}
        </StatPills>
      </SeminarHeader>

      {/* ── Expanded detail ── */}
      {open && (
        <SeminarDetail>
          {/* Stats bar */}
          <StatsBar>
            <StatItem>
              <StatBig>{rsvpCount}</StatBig>
              <StatSub>총 RSVP</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#059669">{checkinCount}</StatBig>
              <StatSub>체크인</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#d97706">{noshowCount}</StatBig>
              <StatSub>노쇼</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#6c5ce7">{pct(checkinCount, rsvpCount)}</StatBig>
              <StatSub>참석율</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#ef4444">{pct(noshowCount, rsvpCount)}</StatBig>
              <StatSub>노쇼율</StatSub>
            </StatItem>
            {seminar.max_capacity != null && (
              <>
                <StatDivider />
                <StatItem>
                  <StatBig color="#0ea5e9">{pct(rsvpCount, seminar.max_capacity)}</StatBig>
                  <StatSub>신청율 (정원 대비)</StatSub>
                </StatItem>
              </>
            )}
          </StatsBar>

          {/* Attendee table */}
          {semRsvps.length === 0 ? (
            <EmptyState style={{ padding: "24px 0" }}>RSVP 없음</EmptyState>
          ) : (
            <AttendeeTableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>이름</Th>
                    <Th>이메일</Th>
                    <Th>계정 유형</Th>
                    <Th>RSVP 일시</Th>
                    <Th>체크인</Th>
                    <Th>체크인 일시</Th>
                  </tr>
                </Thead>
                <tbody>
                  {semRsvps.map((r) => {
                    const user = userMap[r.user_id];
                    return (
                      <Tr key={r.id}>
                        <Td style={{ fontWeight: 600 }}>{user?.username ?? `#${r.user_id}`}</Td>
                        <Td style={{ color: "#6b7280", fontSize: 13 }}>{user?.email ?? "—"}</Td>
                        <Td>
                          {user ? (
                            <Badge color={user.is_temporary ? "orange" : "blue"}>
                              {user.is_temporary ? "임시" : "정식"}
                            </Badge>
                          ) : "—"}
                        </Td>
                        <Td style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(r.created_at)}</Td>
                        <Td>
                          <Badge color={r.checked_in ? "green" : "gray"}>
                            {r.checked_in ? "완료" : "미완료"}
                          </Badge>
                        </Td>
                        <Td style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(r.checked_in_at)}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </AttendeeTableWrap>
          )}
        </SeminarDetail>
      )}
    </SeminarCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "users" | "seminars";

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.users); return res.data; },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });

  const isStaff = me?.role === "staff";

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<UserAdminRow[]>({
    queryKey: ["admin-users"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.usersList); return res.data; },
    enabled: isStaff,
  });

  const { data: seminars = [], isLoading: seminarsLoading } = useQuery<SystemSeminar[]>({
    queryKey: ["admin-seminars"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.systemSeminars); return res.data; },
    enabled: isStaff,
  });

  const { data: rsvps = [], isLoading: rsvpsLoading } = useQuery<SystemRsvp[]>({
    queryKey: ["admin-rsvps"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.systemRsvps); return res.data; },
    enabled: isStaff,
  });

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!sessionStorage.getItem("accessToken")) {
    return <PageContainer><AlertBox variant="warning">로그인이 필요합니다.</AlertBox></PageContainer>;
  }
  if (me && !isStaff) {
    return <PageContainer><AlertBox variant="error">접근 권한이 없습니다.</AlertBox></PageContainer>;
  }
  if (!me || usersLoading) {
    return <LoadingCenter><Spinner />Loading…</LoadingCenter>;
  }
  if (usersError) {
    return <PageContainer><AlertBox variant="error">데이터를 불러오지 못했습니다.</AlertBox></PageContainer>;
  }

  // ── User stats ─────────────────────────────────────────────────────────────
  const staffCount  = users.filter((u) => u.role === "staff").length;
  const tempCount   = users.filter((u) => u.is_temporary).length;
  const memberCount = users.filter((u) => u.full_member_email_sent).length;

  // ── Seminar stats ──────────────────────────────────────────────────────────
  const totalRsvps    = rsvps.length;
  const totalCheckins = rsvps.filter((r) => r.checked_in).length;

  // ── Sort seminars newest first ─────────────────────────────────────────────
  const sortedSeminars = [...seminars].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <PageContainer style={{ maxWidth: 1100 }}>
      <PageHeader>
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} style={{ marginBottom: 8 }}>
            ← Back
          </Button>
          <PageTitle>Admin Dashboard</PageTitle>
        </div>
      </PageHeader>

      {/* ── Summary stats ── */}
      <StatsRow>
        <StatCard accent="#6c5ce7">
          <StatNum>{users.length}</StatNum>
          <StatLabel>Total Users</StatLabel>
        </StatCard>
        <StatCard accent="#10b981">
          <StatNum>{staffCount}</StatNum>
          <StatLabel>Staff</StatLabel>
        </StatCard>
        <StatCard accent="#f59e0b">
          <StatNum>{tempCount}</StatNum>
          <StatLabel>Temporary</StatLabel>
        </StatCard>
        <StatCard accent="#6c5ce7">
          <StatNum>{memberCount}</StatNum>
          <StatLabel>Full Members</StatLabel>
        </StatCard>
        <StatCard accent="#0ea5e9">
          <StatNum>{seminars.length}</StatNum>
          <StatLabel>Seminars</StatLabel>
        </StatCard>
        <StatCard accent="#10b981">
          <StatNum>{totalRsvps}</StatNum>
          <StatLabel>Total RSVPs</StatLabel>
        </StatCard>
        <StatCard accent="#059669">
          <StatNum>{totalCheckins}</StatNum>
          <StatLabel>Total Check-ins</StatLabel>
        </StatCard>
        <StatCard accent="#ef4444">
          <StatNum>{pct(totalCheckins, totalRsvps)}</StatNum>
          <StatLabel>Overall Attendance</StatLabel>
        </StatCard>
      </StatsRow>

      {/* ── Tabs ── */}
      <TabBar>
        <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
          👤 Users <TabCount>{users.length}</TabCount>
        </TabBtn>
        <TabBtn active={tab === "seminars"} onClick={() => setTab("seminars")}>
          🎓 Seminars <TabCount>{seminars.length}</TabCount>
        </TabBtn>
      </TabBar>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <Th>ID</Th>
                <Th>가입일시</Th>
                <Th>이름</Th>
                <Th>이메일</Th>
                <Th>역할</Th>
                <Th>계정 유형</Th>
                <Th>정회원 이메일</Th>
              </tr>
            </Thead>
            <tbody>
              {users.map((u) => (
                <Tr key={u.id}>
                  <Td style={{ color: "#9ca3af", fontSize: 13 }}>#{u.id}</Td>
                  <Td style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>{formatDate(u.created_at)}</Td>
                  <Td style={{ fontWeight: 600 }}>{u.username}</Td>
                  <Td style={{ color: "#6b7280", fontSize: 13 }}>{u.email}</Td>
                  <Td>
                    <Badge color={u.role === "staff" ? "purple" : "green"}>
                      {u.role === "staff" ? "Staff" : "Member"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge color={u.is_temporary ? "orange" : "blue"}>
                      {u.is_temporary ? "임시" : "정식"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge color={u.full_member_email_sent ? "green" : "gray"}>
                      {u.full_member_email_sent ? "발송됨" : "미발송"}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* ── Seminars tab ── */}
      {tab === "seminars" && (
        <>
          {seminarsLoading || rsvpsLoading ? (
            <LoadingCenter><Spinner />Loading seminars…</LoadingCenter>
          ) : sortedSeminars.length === 0 ? (
            <EmptyState>No seminars yet.</EmptyState>
          ) : (
            <SeminarList>
              {sortedSeminars.map((s) => (
                <SeminarRow
                  key={s.id}
                  seminar={s}
                  rsvps={rsvps}
                  users={users}
                />
              ))}
            </SeminarList>
          )}
        </>
      )}
    </PageContainer>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 24px;

  @media (min-width: 480px) { grid-template-columns: repeat(4, 1fr); }
  @media (min-width: 860px) { grid-template-columns: repeat(8, 1fr); }
`;

const StatCard = styled.div<{ accent?: string }>`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-top: 3px solid ${({ accent }) => accent ?? "#6c5ce7"};
  border-radius: 10px;
  padding: 14px 16px;
  text-align: center;
`;

const StatNum = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 20px;
`;

const TabBtn = styled.button<{ active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid ${({ active }) => (active ? "#6c5ce7" : "transparent")};
  margin-bottom: -2px;
  color: ${({ active }) => (active ? "#6c5ce7" : "#6b7280")};
  transition: color 0.15s;

  &:hover { color: #111827; }
`;

const TabCount = styled.span`
  background: #f3f4f6;
  color: #6b7280;
  font-size: 12px;
  padding: 1px 7px;
  border-radius: 10px;
`;

const TableWrap = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  overflow-x: auto;
`;

// Seminar accordion
const SeminarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SeminarCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`;

const SeminarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  flex-wrap: wrap;
  transition: background 0.15s;

  &:hover { background: #faf9ff; }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
`;

const Chevron = styled.span<{ open: boolean }>`
  font-size: 11px;
  color: #9ca3af;
  transition: transform 0.2s;
  transform: ${({ open }) => (open ? "rotate(90deg)" : "rotate(0deg)")};
  flex-shrink: 0;
`;

const HeaderInfo = styled.div`
  min-width: 0;
`;

const SeminarName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SeminarMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 3px;

  span {
    font-size: 12px;
    color: #9ca3af;
  }
`;

const StatPills = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

const StatPill = styled.div<{ color?: "green" | "orange" | "purple" }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${({ color }) =>
    color === "green" ? "#d1fae5" :
    color === "orange" ? "#ffedd5" :
    color === "purple" ? "#ede9fe" : "#f3f4f6"};
  border-radius: 8px;
  padding: 6px 12px;
  min-width: 52px;
`;

const PillNum = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: #111827;
  line-height: 1;
`;

const PillLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-top: 2px;
  letter-spacing: 0.04em;
`;

// Expanded detail
const SeminarDetail = styled.div`
  border-top: 1px solid #f0eeff;
  padding: 20px;
  background: #faf9ff;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  flex: 1;
  min-width: 80px;
  padding: 14px 16px;
  text-align: center;
`;

const StatBig = styled.div<{ color?: string }>`
  font-size: 22px;
  font-weight: 800;
  color: ${({ color }) => color ?? "#111827"};
  letter-spacing: -0.02em;
`;

const StatSub = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
`;

const StatDivider = styled.div`
  width: 1px;
  background: #f0eeff;
  align-self: stretch;
`;

const AttendeeTableWrap = styled.div`
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
`;
