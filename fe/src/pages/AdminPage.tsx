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
} from "../components/ui";

interface UserAdminRow {
  id: number;
  created_at: string;
  email: string;
  username: string;
  role: string;
  is_temporary: boolean;
  full_member_email_sent: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminPage() {
  const navigate = useNavigate();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.users); return res.data; },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });

  const { data: users = [], isLoading, error } = useQuery<UserAdminRow[]>({
    queryKey: ["admin-users"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.usersList); return res.data; },
    enabled: me?.role === "staff",
  });

  if (!sessionStorage.getItem("accessToken")) {
    return (
      <PageContainer>
        <AlertBox variant="warning">로그인이 필요합니다.</AlertBox>
      </PageContainer>
    );
  }
  if (me && me.role !== "staff") {
    return (
      <PageContainer>
        <AlertBox variant="error">접근 권한이 없습니다.</AlertBox>
      </PageContainer>
    );
  }
  if (isLoading || !me) {
    return <LoadingCenter><Spinner />Loading users…</LoadingCenter>;
  }
  if (error) {
    return (
      <PageContainer>
        <AlertBox variant="error">유저 목록을 불러오지 못했습니다.</AlertBox>
      </PageContainer>
    );
  }

  const staffCount = users.filter((u) => u.role === "staff").length;
  const tempCount = users.filter((u) => u.is_temporary).length;
  const memberCount = users.filter((u) => u.full_member_email_sent).length;

  return (
    <PageContainer style={{ maxWidth: 1100 }}>
      <PageHeader>
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} style={{ marginBottom: 8 }}>
            ← Back
          </Button>
          <PageTitle>Admin — User List</PageTitle>
        </div>
        <TotalBadge>{users.length} users</TotalBadge>
      </PageHeader>

      {/* ── Stats row ── */}
      <StatsRow>
        <StatCard>
          <StatNum>{users.length}</StatNum>
          <StatLabel>Total Users</StatLabel>
        </StatCard>
        <StatCard>
          <StatNum>{staffCount}</StatNum>
          <StatLabel>Staff</StatLabel>
        </StatCard>
        <StatCard>
          <StatNum>{tempCount}</StatNum>
          <StatLabel>Temporary</StatLabel>
        </StatCard>
        <StatCard>
          <StatNum>{memberCount}</StatNum>
          <StatLabel>Full Members</StatLabel>
        </StatCard>
      </StatsRow>

      {/* ── Table ── */}
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
    </PageContainer>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const TotalBadge = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 6px 14px;
  border-radius: 20px;
  align-self: flex-end;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 20px;
  text-align: center;
`;

const StatNum = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: #6c5ce7;
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
`;

const TableWrap = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  overflow-x: auto;
`;
