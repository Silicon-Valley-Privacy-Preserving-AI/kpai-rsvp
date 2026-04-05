import { Route, Routes } from "react-router-dom";
import { route } from "./route";
import MainPage from "../pages/MainPage";
import SignInPage from "../pages/SignInPage";
import SignUpPage from "../pages/SignUpPage";
import SeminarListPage from "../pages/SeminarListPage";
import SeminarDetailPage from "../pages/SeminarDetailPage";
import CheckInPage from "../pages/CheckInPage";
import AdminPage from "../pages/AdminPage";
import MyPage from "../pages/MyPage";

export default function Router() {
  return (
    <Routes>
      <Route path={route.main} element={<MainPage />} />
      <Route path={route.signup} element={<SignUpPage />} />
      <Route path={route.signin} element={<SignInPage />} />
      <Route path={route.seminar} element={<SeminarListPage />} />
      <Route path={route.seminarDetail} element={<SeminarDetailPage />} />
      <Route path={route.checkIn} element={<CheckInPage />} />
      <Route path={route.admin} element={<AdminPage />} />
      <Route path={route.mypage} element={<MyPage />} />
    </Routes>
  );
}
