import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import AdminStats from "../components/AdminStats";
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
import { CalendarIcon, MicIcon, MapPinIcon, UserIcon, GraduationCapIcon, AlertTriangleIcon, SparklesIcon } from "../components/icons";

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
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function pct(num: number, den: number) {
  if (den === 0) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

/** Returns true when actual count exceeds stated capacity. */
function isOverCapacity(count: number, capacity: number | null): boolean {
  return capacity != null && count > capacity;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SeminarRowProps {
  seminar: SystemSeminar;
  rsvps: SystemRsvp[];
  users: UserAdminRow[];
  onCancelRsvp: (seminarId: number, userId: number) => void;
  cancelRsvpPending: boolean;
}

function SeminarRow({ seminar, rsvps, users, onCancelRsvp, cancelRsvpPending }: SeminarRowProps) {
  const [open, setOpen] = useState(false);

  const semRsvps = rsvps.filter((r) => r.seminar_id === seminar.id);
  const checkinCount = semRsvps.filter((r) => r.checked_in).length;
  const rsvpCount = semRsvps.length;
  const noshowCount = rsvpCount - checkinCount;
  const overCapacity = isOverCapacity(rsvpCount, seminar.max_capacity);

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
              {seminar.start_time && <span><CalendarIcon size={12} />{formatDate(seminar.start_time)}</span>}
              {seminar.host && <span><MicIcon size={12} />{seminar.host}</span>}
              {seminar.location && <span><MapPinIcon size={12} />{seminar.location}</span>}
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
            <PillLabel>Check-in</PillLabel>
          </StatPill>
          <StatPill color="orange">
            <PillNum>{noshowCount}</PillNum>
            <PillLabel>No-show</PillLabel>
          </StatPill>
          {seminar.max_capacity != null && (
            <StatPill color={overCapacity ? "red" : "purple"}>
              <PillNum>
                {overCapacity
                  ? `${rsvpCount}/${seminar.max_capacity}`
                  : pct(rsvpCount, seminar.max_capacity)}
              </PillNum>
              <PillLabel>{overCapacity ? <OverCapLabel><AlertTriangleIcon size={11} color="#ef4444" /> Over Cap</OverCapLabel> : "Fill Rate"}</PillLabel>
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
              <StatSub>Total RSVP</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#059669">{checkinCount}</StatBig>
              <StatSub>Check-ins</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#d97706">{noshowCount}</StatBig>
              <StatSub>No-shows</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#6c5ce7">{pct(checkinCount, rsvpCount)}</StatBig>
              <StatSub>Attendance</StatSub>
            </StatItem>
            <StatDivider />
            <StatItem>
              <StatBig color="#ef4444">{pct(noshowCount, rsvpCount)}</StatBig>
              <StatSub>No-show Rate</StatSub>
            </StatItem>
            {seminar.max_capacity != null && (
              <>
                <StatDivider />
                <StatItem>
                  <StatBig color={overCapacity ? "#ef4444" : "#0ea5e9"}>
                    {overCapacity
                      ? `${rsvpCount} / ${seminar.max_capacity}`
                      : pct(rsvpCount, seminar.max_capacity)}
                  </StatBig>
                  <StatSub>
                    {overCapacity
                      ? <OverCapLabel><AlertTriangleIcon size={12} color="#ef4444" /> Over Capacity</OverCapLabel>
                      : "Capacity Fill"}
                  </StatSub>
                </StatItem>
              </>
            )}
          </StatsBar>

          {/* Attendee table */}
          {semRsvps.length === 0 ? (
            <EmptyState style={{ padding: "24px 0" }}>No RSVPs</EmptyState>
          ) : (
            <AttendeeTableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Account Type</Th>
                    <Th>RSVP Date</Th>
                    <Th>Check-in</Th>
                    <Th>Check-in Time</Th>
                    <Th>Action</Th>
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
                              {user.is_temporary ? "Temporary" : "Regular"}
                            </Badge>
                          ) : "—"}
                        </Td>
                        <Td style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(r.created_at)}</Td>
                        <Td>
                          <Badge color={r.checked_in ? "green" : "gray"}>
                            {r.checked_in ? "Done" : "Pending"}
                          </Badge>
                        </Td>
                        <Td style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(r.checked_in_at)}</Td>
                        <Td>
                          <Button
                            size="sm"
                            variant="ghost"
                            style={{ color: "#ef4444", whiteSpace: "nowrap" }}
                            disabled={cancelRsvpPending}
                            onClick={() => {
                              const name = user?.username ?? `#${r.user_id}`;
                              if (confirm(`Cancel RSVP for ${name}?`)) {
                                onCancelRsvp(seminar.id, r.user_id);
                              }
                            }}
                          >
                            Cancel RSVP
                          </Button>
                        </Td>
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

type Tab = "users" | "seminars" | "statistics";

export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("users");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [seminarSortField, setSeminarSortField] = useState<"date" | "rsvp" | "checkin">("date");
  const [seminarSortDir, setSeminarSortDir] = useState<"desc" | "asc">("desc");

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

  // ── Mutations ──────────────────────────────────────────────────────────────

  const adminCancelRsvpMutation = useMutation({
    mutationFn: async ({ seminarId, userId }: { seminarId: number; userId: number }) => {
      await axiosInstance.delete(api.v1.staffCancelRsvp(seminarId, userId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-rsvps"] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to cancel RSVP"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await axiosInstance.delete(api.v1.adminDeleteUser(userId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-rsvps"] });
      setSelectedUserId(null);
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to delete user"),
  });

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!sessionStorage.getItem("accessToken")) {
    return <PageContainer><AlertBox variant="warning">You must be signed in to access this page.</AlertBox></PageContainer>;
  }
  if (me && !isStaff) {
    return <PageContainer><AlertBox variant="error">Access denied. Staff only.</AlertBox></PageContainer>;
  }
  if (!me || usersLoading) {
    return <LoadingCenter><Spinner />Loading…</LoadingCenter>;
  }
  if (usersError) {
    return <PageContainer><AlertBox variant="error">Failed to load data.</AlertBox></PageContainer>;
  }

  // ── User stats ─────────────────────────────────────────────────────────────
  const staffCount  = users.filter((u) => u.role === "staff").length;
  const tempCount   = users.filter((u) => u.is_temporary).length;
  const memberCount = users.filter((u) => u.full_member_email_sent).length;

  // ── Seminar stats ──────────────────────────────────────────────────────────
  const totalRsvps    = rsvps.length;
  const totalCheckins = rsvps.filter((r) => r.checked_in).length;

  // ── Sort seminars ──────────────────────────────────────────────────────────
  const rsvpCountMap = Object.fromEntries(
    seminars.map((s) => [s.id, rsvps.filter((r) => r.seminar_id === s.id).length])
  );
  const checkinCountMap = Object.fromEntries(
    seminars.map((s) => [s.id, rsvps.filter((r) => r.seminar_id === s.id && r.checked_in).length])
  );

  const sortedSeminars = [...seminars].sort((a, b) => {
    let valA: number, valB: number;
    if (seminarSortField === "rsvp") {
      valA = rsvpCountMap[a.id] ?? 0;
      valB = rsvpCountMap[b.id] ?? 0;
    } else if (seminarSortField === "checkin") {
      valA = checkinCountMap[a.id] ?? 0;
      valB = checkinCountMap[b.id] ?? 0;
    } else {
      valA = new Date(a.start_time ?? a.created_at).getTime();
      valB = new Date(b.start_time ?? b.created_at).getTime();
    }
    return seminarSortDir === "desc" ? valB - valA : valA - valB;
  });

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
          <UserIcon size={15} /> Users <TabCount>{users.length}</TabCount>
        </TabBtn>
        <TabBtn active={tab === "seminars"} onClick={() => setTab("seminars")}>
          <GraduationCapIcon size={15} /> Seminars <TabCount>{seminars.length}</TabCount>
        </TabBtn>
        <TabBtn active={tab === "statistics"} onClick={() => setTab("statistics")}>
          <SparklesIcon size={15} /> Statistics
        </TabBtn>
      </TabBar>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <Th>ID</Th>
                <Th>Joined</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Account Type</Th>
                <Th>Member Email</Th>
              </tr>
            </Thead>
            <tbody>
              {users.map((u) => (
                <UserTr
                  key={u.id}
                  selected={selectedUserId === u.id}
                  onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                >
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
                      {u.is_temporary ? "Temporary" : "Regular"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge color={u.full_member_email_sent ? "green" : "gray"}>
                      {u.full_member_email_sent ? "Sent" : "Not Sent"}
                    </Badge>
                  </Td>
                </UserTr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* ── User detail drawer ── */}
      {tab === "users" && selectedUserId !== null && (() => {
        const user = users.find(u => u.id === selectedUserId);
        if (!user) return null;
        const userRsvps = rsvps.filter(r => r.user_id === user.id);
        const checkins = userRsvps.filter(r => r.checked_in);
        const noShows = userRsvps.filter(r => !r.checked_in);
        const attendanceRate = userRsvps.length > 0
          ? Math.round((checkins.length / userRsvps.length) * 100)
          : null;
        const seminarHistory = userRsvps
          .map(r => ({ rsvp: r, seminar: seminars.find(s => s.id === r.seminar_id) }))
          .filter((x): x is { rsvp: SystemRsvp; seminar: SystemSeminar } => !!x.seminar)
          .sort((a, b) => new Date(b.rsvp.created_at).getTime() - new Date(a.rsvp.created_at).getTime());

        return (
          <DrawerOverlay onClick={() => setSelectedUserId(null)}>
            <DrawerPanel onClick={e => e.stopPropagation()}>
              <DrawerHeader>
                <DrawerHeaderInfo>
                  <DrawerName>{user.username}</DrawerName>
                  <DrawerEmail>{user.email}</DrawerEmail>
                </DrawerHeaderInfo>
                <DrawerCloseBtn onClick={() => setSelectedUserId(null)}>✕</DrawerCloseBtn>
              </DrawerHeader>

              <DrawerBadgeRow>
                <Badge color={user.role === "staff" ? "purple" : "green"}>
                  {user.role === "staff" ? "Staff" : "Member"}
                </Badge>
                <Badge color={user.is_temporary ? "orange" : "blue"}>
                  {user.is_temporary ? "Temporary" : "Regular"}
                </Badge>
                {user.full_member_email_sent && <Badge color="green">Email Sent</Badge>}
              </DrawerBadgeRow>
              <DrawerMeta>Joined {formatDate(user.created_at)}</DrawerMeta>

              <DrawerStatGrid>
                <DrawerStat>
                  <DrawerStatVal>{userRsvps.length}</DrawerStatVal>
                  <DrawerStatLabel>RSVPs</DrawerStatLabel>
                </DrawerStat>
                <DrawerStat>
                  <DrawerStatVal style={{ color: "#059669" }}>{checkins.length}</DrawerStatVal>
                  <DrawerStatLabel>Check-ins</DrawerStatLabel>
                </DrawerStat>
                <DrawerStat>
                  <DrawerStatVal style={{ color: "#d97706" }}>{noShows.length}</DrawerStatVal>
                  <DrawerStatLabel>No-shows</DrawerStatLabel>
                </DrawerStat>
                <DrawerStat>
                  <DrawerStatVal style={{ color: "#6c5ce7" }}>
                    {attendanceRate !== null ? `${attendanceRate}%` : "—"}
                  </DrawerStatVal>
                  <DrawerStatLabel>Attendance</DrawerStatLabel>
                </DrawerStat>
              </DrawerStatGrid>

              <DrawerSection>
                <DrawerSectionTitle>Seminar History</DrawerSectionTitle>
                {seminarHistory.length === 0 ? (
                  <EmptyState style={{ padding: "12px 0", fontSize: 13 }}>No seminar participation</EmptyState>
                ) : (
                  <DrawerHistoryList>
                    {seminarHistory.map(({ rsvp, seminar }) => (
                      <DrawerHistoryItem key={rsvp.id}>
                        <DrawerHistoryInfo>
                          <DrawerHistoryTitle>{seminar.title}</DrawerHistoryTitle>
                          <DrawerHistoryDate>{formatDate(seminar.start_time)}</DrawerHistoryDate>
                        </DrawerHistoryInfo>
                        <Badge color={rsvp.checked_in ? "green" : "gray"}>
                          {rsvp.checked_in ? "Attended" : "No-show"}
                        </Badge>
                      </DrawerHistoryItem>
                    ))}
                  </DrawerHistoryList>
                )}
              </DrawerSection>

              <DrawerActions>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deleteUserMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete user "${user.username}" (${user.email})? This action cannot be undone.`)) {
                      deleteUserMutation.mutate(user.id);
                    }
                  }}
                >
                  {deleteUserMutation.isPending ? "Deleting…" : "Delete User"}
                </Button>
              </DrawerActions>
            </DrawerPanel>
          </DrawerOverlay>
        );
      })()}

      {/* ── Seminars tab ── */}
      {tab === "seminars" && (
        <>
          {seminarsLoading || rsvpsLoading ? (
            <LoadingCenter><Spinner />Loading seminars…</LoadingCenter>
          ) : sortedSeminars.length === 0 ? (
            <EmptyState>No seminars yet.</EmptyState>
          ) : (
            <>
              <SortBar>
                <SortGroup>
                  <SortLabel>Sort by</SortLabel>
                  <SortBtnGroup>
                    <SortBtn active={seminarSortField === "date"} onClick={() => setSeminarSortField("date")}>Date</SortBtn>
                    <SortBtn active={seminarSortField === "rsvp"} onClick={() => setSeminarSortField("rsvp")}>RSVPs</SortBtn>
                    <SortBtn active={seminarSortField === "checkin"} onClick={() => setSeminarSortField("checkin")}>Check-ins</SortBtn>
                  </SortBtnGroup>
                </SortGroup>
                <SortDirBtn onClick={() => setSeminarSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
                  {seminarSortDir === "desc" ? "↓ Desc" : "↑ Asc"}
                </SortDirBtn>
              </SortBar>
              <SeminarList>
              {sortedSeminars.map((s) => (
                <SeminarRow
                  key={s.id}
                  seminar={s}
                  rsvps={rsvps}
                  users={users}
                  onCancelRsvp={(seminarId, userId) =>
                    adminCancelRsvpMutation.mutate({ seminarId, userId })
                  }
                  cancelRsvpPending={adminCancelRsvpMutation.isPending}
                />
              ))}
              </SeminarList>
            </>
          )}
        </>
      )}

      {/* ── Statistics tab ── */}
      {tab === "statistics" && (
        seminarsLoading || rsvpsLoading || usersLoading ? (
          <LoadingCenter><Spinner />Loading statistics…</LoadingCenter>
        ) : (
          <AdminStats seminars={seminars} rsvps={rsvps} users={users} />
        )
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
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;

const StatPills = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

const StatPill = styled.div<{ color?: "green" | "orange" | "purple" | "red" }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${({ color }) =>
    color === "green" ? "#d1fae5" :
    color === "orange" ? "#ffedd5" :
    color === "purple" ? "#ede9fe" :
    color === "red" ? "#fee2e2" : "#f3f4f6"};
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

const OverCapLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
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

// Clickable user row
const UserTr = styled.tr<{ selected: boolean }>`
  cursor: pointer;
  background: ${({ selected }) => selected ? "#f5f3ff" : "transparent"};
  transition: background 0.12s;

  &:hover { background: ${({ selected }) => selected ? "#ede9fe" : "#faf9ff"}; }

  td { border-bottom: 1px solid #f3f4f6; }
  &:last-child td { border-bottom: none; }
`;

// User detail drawer
const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
`;

const DrawerPanel = styled.div`
  width: 100%;
  max-width: 400px;
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 20px 16px;
  border-bottom: 1px solid #f3f4f6;
`;

const DrawerHeaderInfo = styled.div`
  min-width: 0;
`;

const DrawerName = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 3px;
`;

const DrawerEmail = styled.div`
  font-size: 13px;
  color: #6b7280;
  word-break: break-all;
`;

const DrawerCloseBtn = styled.button`
  font-size: 16px;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  flex-shrink: 0;
  margin-left: 12px;
  line-height: 1;
  &:hover { color: #374151; }
`;

const DrawerBadgeRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 14px 20px 0;
`;

const DrawerMeta = styled.div`
  font-size: 12px;
  color: #9ca3af;
  padding: 6px 20px 16px;
  border-bottom: 1px solid #f3f4f6;
`;

const DrawerStatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  gap: 0;
`;

const DrawerStat = styled.div`
  text-align: center;
  padding: 4px 0;
`;

const DrawerStatVal = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 4px;
`;

const DrawerStatLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
`;

const DrawerSection = styled.div`
  padding: 16px 20px;
  flex: 1;
  overflow-y: auto;
`;

const DrawerSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-bottom: 10px;
`;

const DrawerHistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DrawerHistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
`;

const DrawerHistoryInfo = styled.div`
  min-width: 0;
  flex: 1;
`;

const DrawerHistoryTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DrawerHistoryDate = styled.div`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
`;

const DrawerActions = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
  background: #fff;
  position: sticky;
  bottom: 0;
`;

// Seminar sort bar
const SortBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const SortGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SortLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SortBtnGroup = styled.div`
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const SortBtn = styled.button<{ active: boolean }>`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-right: 1px solid #e5e7eb;
  background: ${({ active }) => (active ? "#6c5ce7" : "#fff")};
  color: ${({ active }) => (active ? "#fff" : "#374151")};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:last-child { border-right: none; }
  &:hover { background: ${({ active }) => (active ? "#5b4bd6" : "#f5f3ff")}; }
`;

const SortDirBtn = styled.button`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #f9fafb; }
`;