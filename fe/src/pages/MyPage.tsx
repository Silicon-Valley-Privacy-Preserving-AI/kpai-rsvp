import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";
import {
  Button, Input, Label, FormGroup,
  PageContainer, PageHeader, PageTitle,
  Badge, AlertBox, LoadingCenter, Spinner, EmptyState,
} from "../components/ui";
import {
  CalendarIcon, MapPinIcon, MicIcon, CheckCircleIcon,
  CheckIcon, UserIcon, ShieldCheckIcon,
} from "../components/icons";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MyProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  is_temporary: boolean;
  full_member_email_sent: boolean;
  created_at: string;
}

interface SeminarHistoryItem {
  seminar_id: number;
  seminar_title: string;
  seminar_start_time: string | null;
  seminar_end_time: string | null;
  seminar_location: string | null;
  seminar_host: string | null;
  seminar_cover_image: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  rsvp_created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

type SeminarStatus = "upcoming" | "ongoing" | "ended";

function getSeminarStatus(start: string | null, end: string | null): SeminarStatus {
  const now = new Date();
  if (!start || new Date(start) > now) return "upcoming";
  if (!end || new Date(end) > now) return "ongoing";
  return "ended";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", email: "", current_password: "", new_password: "", confirm_password: "" });
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: profile, isLoading: profileLoading } = useQuery<MyProfile>({
    queryKey: ["myProfile"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.myProfile); return res.data; },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<SeminarHistoryItem[]>({
    queryKey: ["myHistory"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.myHistory); return res.data; },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | undefined> = {};
      if (editForm.username.trim()) payload.username = editForm.username.trim();
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      if (editForm.new_password) {
        payload.current_password = editForm.current_password;
        payload.new_password = editForm.new_password;
      }
      await axiosInstance.put(api.v1.users, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEditSuccess("Profile updated successfully.");
      setEditError("");
      setEditMode(false);
      setEditForm({ username: "", email: "", current_password: "", new_password: "", confirm_password: "" });
    },
    onError: (e: any) => {
      setEditError(e.response?.data?.detail ?? "Update failed.");
      setEditSuccess("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { await axiosInstance.delete(api.v1.users); },
    onSuccess: () => {
      sessionStorage.removeItem("accessToken");
      queryClient.clear();
      navigate(route.main);
      window.location.reload();
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Failed to withdraw."),
  });

  // ── Guards ────────────────────────────────────────────────────────────────────

  if (!sessionStorage.getItem("accessToken")) {
    return (
      <PageContainer>
        <AlertBox variant="warning">
          Please <Link to={route.signin}>sign in</Link> to view your profile.
        </AlertBox>
      </PageContainer>
    );
  }

  if (profileLoading) return <LoadingCenter><Spinner />Loading…</LoadingCenter>;
  if (!profile) return <PageContainer><AlertBox variant="error">Failed to load profile.</AlertBox></PageContainer>;

  // ── Derived ───────────────────────────────────────────────────────────────────

  const checkedInCount = history.filter((h) => h.checked_in).length;
  const totalRsvps = history.length;
  const isMember = profile.full_member_email_sent;

  const startEdit = () => {
    setEditForm({ username: profile.username, email: profile.email, current_password: "", new_password: "", confirm_password: "" });
    setEditError("");
    setEditSuccess("");
    setEditMode(true);
  };

  const handleUpdate = () => {
    if (editForm.new_password && editForm.new_password !== editForm.confirm_password) {
      setEditError("New passwords do not match.");
      return;
    }
    if (editForm.new_password && !editForm.current_password) {
      setEditError("Please enter your current password.");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <PageContainer style={{ maxWidth: 760 }}>
      <PageHeader>
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            ← Back
          </Button>
          <PageTitle>My Page</PageTitle>
        </div>
      </PageHeader>

      {editSuccess && <AlertBox variant="info" style={{ marginBottom: 16 }}>{editSuccess}</AlertBox>}

      {/* ── Profile card ── */}
      <ProfileCard>
        <ProfileTop>
          <AvatarCircle>
            <UserIcon size={32} color="#F97316" />
          </AvatarCircle>
          <ProfileInfo>
            <ProfileName>{profile.username}</ProfileName>
            <ProfileEmail>{profile.email}</ProfileEmail>
            <BadgeRow>
              <Badge color={profile.role === "staff" ? "purple" : "green"}>
                {profile.role === "staff" ? "Staff" : "Member"}
              </Badge>
              {profile.is_temporary && <Badge color="orange">Temporary Account</Badge>}
              {isMember && (
                <MemberBadge>
                  <ShieldCheckIcon size={13} color="#F97316" /> Full Member
                </MemberBadge>
              )}
            </BadgeRow>
            <JoinDate>Joined {formatDateShort(profile.created_at)}</JoinDate>
          </ProfileInfo>
          <ProfileActions>
            {!editMode && (
              <Button variant="secondary" size="sm" onClick={startEdit}>Edit Profile</Button>
            )}
          </ProfileActions>
        </ProfileTop>

        {/* Membership progress */}
        <MembershipSection>
          <MembershipLabel>
            <ShieldCheckIcon size={15} color={isMember ? "#F97316" : "var(--text-3)"} />
            Full Membership
          </MembershipLabel>
          {isMember ? (
            <MembershipStatus active>
              <CheckCircleIcon size={15} color="#F97316" /> You are a Full Member — thank you for your participation!
            </MembershipStatus>
          ) : (
            <MembershipProgress>
              <ProgressBar>
                <ProgressFill pct={Math.min((checkedInCount / 2) * 100, 100)} />
              </ProgressBar>
              <ProgressLabel>
                {checkedInCount} / 2 check-ins required
                {checkedInCount >= 2 ? " — email confirmation pending" : ""}
              </ProgressLabel>
            </MembershipProgress>
          )}
        </MembershipSection>

        {/* Stats */}
        <StatRow>
          <StatBox>
            <StatNum>{totalRsvps}</StatNum>
            <StatLabel>Total RSVPs</StatLabel>
          </StatBox>
          <StatDivider />
          <StatBox>
            <StatNum style={{ color: "#4ADE80" }}>{checkedInCount}</StatNum>
            <StatLabel>Check-ins</StatLabel>
          </StatBox>
          <StatDivider />
          <StatBox>
            <StatNum style={{ color: "#FCD34D" }}>{totalRsvps - checkedInCount}</StatNum>
            <StatLabel>No-shows</StatLabel>
          </StatBox>
          <StatDivider />
          <StatBox>
            <StatNum style={{ color: "#F97316" }}>
              {totalRsvps > 0 ? `${Math.round((checkedInCount / totalRsvps) * 100)}%` : "—"}
            </StatNum>
            <StatLabel>Attendance</StatLabel>
          </StatBox>
        </StatRow>
      </ProfileCard>

      {/* ── Edit form ── */}
      {editMode && (
        <EditCard>
          <EditTitle>Edit Profile</EditTitle>
          {editError && <AlertBox variant="error" style={{ marginBottom: 16 }}>{editError}</AlertBox>}

          <TwoCol>
            <FormGroup>
              <Label>Name</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="Display name"
              />
            </FormGroup>
            <FormGroup>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Email address"
              />
            </FormGroup>
          </TwoCol>

          <Divider />
          <SectionLabel>Change Password (optional)</SectionLabel>

          <FormGroup>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={editForm.current_password}
              onChange={(e) => setEditForm({ ...editForm, current_password: e.target.value })}
              placeholder="Required only when changing password"
            />
          </FormGroup>
          <TwoCol>
            <FormGroup>
              <Label>New Password</Label>
              <Input
                type="password"
                value={editForm.new_password}
                onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                placeholder="Min 4 characters"
              />
            </FormGroup>
            <FormGroup>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={editForm.confirm_password}
                onChange={(e) => setEditForm({ ...editForm, confirm_password: e.target.value })}
                placeholder="Repeat new password"
              />
            </FormGroup>
          </TwoCol>

          <EditActions>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button variant="ghost" onClick={() => { setEditMode(false); setEditError(""); }}>
              Cancel
            </Button>
          </EditActions>
        </EditCard>
      )}

      {/* ── Seminar history ── */}
      <SectionCard>
        <SectionHeader>Seminar History</SectionHeader>
        {historyLoading ? (
          <LoadingCenter style={{ padding: "32px 0" }}><Spinner />Loading…</LoadingCenter>
        ) : history.length === 0 ? (
          <EmptyState style={{ padding: "24px 0" }}>No seminar participation yet.</EmptyState>
        ) : (
          <HistoryList>
            {history.map((item) => {
              const status = getSeminarStatus(item.seminar_start_time, item.seminar_end_time);
              return (
                <HistoryItem
                  key={item.seminar_id}
                  onClick={() => navigate(`/seminar/${item.seminar_id}`)}
                >
                  {item.seminar_cover_image && (
                    <HistoryCover src={item.seminar_cover_image} alt="cover" status={status} />
                  )}
                  <HistoryContent>
                    <HistoryTopRow>
                      <StatusPill status={status}>
                        {status === "upcoming" ? "Upcoming" : status === "ongoing" ? "Live Now" : "Ended"}
                      </StatusPill>
                      <CheckinBadge checked={item.checked_in}>
                        {item.checked_in
                          ? <><CheckIcon size={12} /> Attended</>
                          : "No-show"}
                      </CheckinBadge>
                    </HistoryTopRow>
                    <HistoryTitle>{item.seminar_title}</HistoryTitle>
                    <HistoryMeta>
                      {item.seminar_start_time && (
                        <MetaItem><CalendarIcon size={12} />{formatDate(item.seminar_start_time)}</MetaItem>
                      )}
                      {item.seminar_host && (
                        <MetaItem><MicIcon size={12} />{item.seminar_host}</MetaItem>
                      )}
                      {item.seminar_location && (
                        <MetaItem><MapPinIcon size={12} />{item.seminar_location}</MetaItem>
                      )}
                    </HistoryMeta>
                    {item.checked_in && item.checked_in_at && (
                      <CheckinTime>
                        <CheckIcon size={12} color="#4ADE80" /> Checked in at {formatDate(item.checked_in_at)}
                      </CheckinTime>
                    )}
                  </HistoryContent>
                </HistoryItem>
              );
            })}
          </HistoryList>
        )}
      </SectionCard>

      {/* ── Withdraw ── */}
      <DangerZone>
        <DangerTitle>Danger Zone</DangerTitle>
        {!showDeleteConfirm ? (
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            Withdraw Account
          </Button>
        ) : (
          <DeleteConfirm>
            <AlertBox variant="error">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </AlertBox>
            <ConfirmActions>
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "Withdrawing…" : "Yes, delete my account"}
              </Button>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </ConfirmActions>
          </DeleteConfirm>
        )}
      </DangerZone>
    </PageContainer>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const ProfileCard = styled.div`
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 18px 16px;
  margin-bottom: 20px;

  @media (min-width: 480px) {
    padding: 28px;
  }
`;

const ProfileTop = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const AvatarCircle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(249, 115, 22, 0.12);
  border: 1.5px solid rgba(249, 115, 22, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProfileName = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: var(--text-1);
  letter-spacing: -0.03em;
  margin-bottom: 2px;
`;

const ProfileEmail = styled.div`
  font-size: 14px;
  color: var(--text-2);
  margin-bottom: 10px;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const MemberBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(14, 165, 233, 0.12);
  color: #F97316;
`;

const JoinDate = styled.div`
  font-size: 12px;
  color: var(--text-3);
`;

const ProfileActions = styled.div`
  flex-shrink: 0;
`;

const MembershipSection = styled.div`
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 20px;
`;

const MembershipLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin-bottom: 10px;
`;

const MembershipStatus = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ active }) => active ? "#38BDF8" : "var(--text-2)"};
`;

const MembershipProgress = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProgressBar = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ pct: number }>`
  height: 100%;
  width: ${({ pct }) => pct}%;
  background: linear-gradient(90deg, #F97316, #FB923C);
  border-radius: 4px;
  transition: width 0.4s ease;
`;

const ProgressLabel = styled.div`
  font-size: 13px;
  color: var(--text-2);
`;

const StatRow = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
`;

const StatBox = styled.div`
  flex: 1;
  padding: 10px 4px;
  text-align: center;
  min-width: 0;

  @media (min-width: 400px) {
    padding: 14px 12px;
  }
`;

const StatNum = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: var(--text-1);
  letter-spacing: -0.02em;

  @media (min-width: 400px) {
    font-size: 20px;
  }
`;

const StatLabel = styled.div`
  font-size: 9px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 400px) {
    font-size: 11px;
    letter-spacing: 0.04em;
    white-space: normal;
  }
`;

const StatDivider = styled.div`
  width: 1px;
  background: rgba(255, 255, 255, 0.06);
  align-self: stretch;
`;

// Edit form
const EditCard = styled.div`
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 18px 16px;
  margin-bottom: 20px;

  @media (min-width: 480px) {
    padding: 28px;
  }
`;

const EditTitle = styled.h2`
  font-size: 17px;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: -0.02em;
  margin-bottom: 20px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0 16px;

  @media (min-width: 540px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin: 20px 0 16px;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
`;

const EditActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

// Seminar history
const SectionCard = styled.div`
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 18px 16px;
  margin-bottom: 20px;

  @media (min-width: 480px) {
    padding: 28px;
  }
`;

const SectionHeader = styled.h2`
  font-size: 17px;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: -0.02em;
  margin-bottom: 20px;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const HistoryItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  align-items: flex-start;

  @media (min-width: 480px) {
    gap: 14px;
    padding: 14px;
  }

  &:hover {
    background: rgba(249, 115, 22, 0.04);
    border-color: rgba(249, 115, 22, 0.25);
  }
`;

const HistoryCover = styled.img<{ status: SeminarStatus }>`
  width: 72px;
  height: 54px;
  border-radius: 7px;
  object-fit: cover;
  flex-shrink: 0;
  filter: ${({ status }) => status === "ended" ? "grayscale(50%)" : "none"};
`;

const HistoryContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const HistoryTopRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 5px;
  align-items: center;
`;

const StatusPill = styled.span<{ status: SeminarStatus }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: ${({ status }) =>
    status === "ongoing" ? "rgba(248,113,113,0.12)" :
    status === "upcoming" ? "rgba(74,222,128,0.10)" : "var(--surface-active)"};
  color: ${({ status }) =>
    status === "ongoing" ? "#F87171" :
    status === "upcoming" ? "#4ADE80" : "var(--text-2)"};
`;

const CheckinBadge = styled.span<{ checked: boolean }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: ${({ checked }) => checked ? "rgba(74,222,128,0.10)" : "var(--surface-active)"};
  color: ${({ checked }) => checked ? "#4ADE80" : "var(--text-2)"};
`;

const HistoryTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HistoryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-2);
`;

const CheckinTime = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #4ADE80;
  margin-top: 4px;
`;

// Danger zone
const DangerZone = styled.div`
  background: var(--surface);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 18px;
  padding: 18px 16px;

  @media (min-width: 480px) {
    padding: 24px 28px;
  }
`;

const DangerTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #F87171;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
`;

const DeleteConfirm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;
