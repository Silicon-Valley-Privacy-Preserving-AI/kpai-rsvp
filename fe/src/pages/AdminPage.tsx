import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";

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
  return new Date(iso).toLocaleString("ko-KR");
}

const badge = (label: string, color: string) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: "0.78rem",
      fontWeight: 600,
      background: color,
      color: "#fff",
    }}
  >
    {label}
  </span>
);

export default function AdminPage() {
  const navigate = useNavigate();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await axiosInstance.get(api.v1.users);
      return res.data;
    },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<UserAdminRow[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await axiosInstance.get(api.v1.usersList);
      return res.data;
    },
    enabled: me?.role === "staff",
  });

  if (!sessionStorage.getItem("accessToken")) {
    return <p style={{ padding: "1rem" }}>로그인이 필요합니다.</p>;
  }
  if (me && me.role !== "staff") {
    return <p style={{ padding: "1rem" }}>접근 권한이 없습니다.</p>;
  }
  if (isLoading || !me) return <div style={{ padding: "1rem" }}>Loading...</div>;
  if (error) return <p style={{ padding: "1rem", color: "red" }}>유저 목록을 불러오지 못했습니다.</p>;

  return (
    <div style={{ padding: "1rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")}>← Back</button>
        <h1 style={{ margin: 0 }}>Admin — User List</h1>
        <span style={{ marginLeft: "auto", fontSize: "0.9rem", color: "#555" }}>
          총 {users.length}명
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ background: "#f4f4f4", textAlign: "left" }}>
              <th style={th}>ID</th>
              <th style={th}>가입일시</th>
              <th style={th}>이메일</th>
              <th style={th}>이름</th>
              <th style={th}>역할</th>
              <th style={th}>임시 계정</th>
              <th style={th}>정회원 이메일 발송</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>{u.id}</td>
                <td style={td}>{formatDate(u.created_at)}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.username}</td>
                <td style={td}>
                  {u.role === "staff"
                    ? badge("Staff", "#6c5ce7")
                    : badge("Member", "#00b894")}
                </td>
                <td style={td}>
                  {u.is_temporary ? badge("임시", "#e17055") : badge("정식", "#0984e3")}
                </td>
                <td style={td}>
                  {u.full_member_email_sent ? badge("발송됨", "#00b894") : badge("미발송", "#b2bec3")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "8px 12px",
  fontWeight: 600,
  whiteSpace: "nowrap",
  borderBottom: "2px solid #ddd",
};
const td: React.CSSProperties = {
  padding: "8px 12px",
  verticalAlign: "middle",
};
