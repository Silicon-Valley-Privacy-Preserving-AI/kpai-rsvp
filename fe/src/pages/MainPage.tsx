import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export default function MainPage() {
  const queryClient = useQueryClient();

  const token = sessionStorage.getItem("accessToken");
  const isLoggedIn = !!token;

  const { data, isLoading, isError } = useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await axiosInstance.get(api.v1.users);
      return data;
    },
    enabled: isLoggedIn, // 🔥 로그인 상태일 때만 요청
  });

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    queryClient.removeQueries({ queryKey: ["me"] });
    window.location.reload();
  };

  return (
    <>
      <h1>Main</h1>

      {!isLoggedIn && (
        <>
          <div>
            <Link to={route.signup}>Sign Up</Link>
          </div>
          <div>
            <Link to={route.signin}>Sign In</Link>
          </div>
        </>
      )}

      {isLoggedIn && (
        <div>
          {isLoading && <p>Loading user...</p>}
          {isError && <p>유저 정보 불러오기 실패</p>}
          {data && (
            <>
              <p>ID: {data.id}</p>
              <p>Username: {data.username}</p>
              <p>Email: {data.email}</p>
              <p>Role: {data.role}</p>
            </>
          )}
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}

      <div>
        <Link to={route.seminar}>Seminar</Link>
      </div>
    </>
  );
}
