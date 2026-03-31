import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { toLocalInput, toUtcIso } from "../utils/datetime";
import type {
  SeminarDetailResponse,
  CheckInTokenResponse,
} from "../types/seminar";

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR");
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

  // Current user
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await axiosInstance.get(api.v1.users);
      return res.data;
    },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });

  const isStaff = me?.role === "staff";
  const isLoggedIn = !!sessionStorage.getItem("accessToken");

  // Seminar detail
  const {
    data: seminar,
    isLoading,
    error,
  } = useQuery<SeminarDetailResponse>({
    queryKey: ["seminar", seminarId],
    queryFn: async () => {
      const res = await axiosInstance.get(api.v1.seminarDetail(seminarId));
      return res.data;
    },
  });

  // Active check-in token (staff) — useState로 관리해 React Query 캐시 불안정 이슈 회피
  const [activeToken, setActiveToken] = useState<CheckInTokenResponse | null>(
    null,
  );

  useEffect(() => {
    if (!isStaff) return;
    axiosInstance
      .get(api.v1.seminarCheckinToken(seminarId))
      .then((res) => setActiveToken(res.data))
      .catch(() => setActiveToken(null)); // 404 = 활성 토큰 없음
  }, [isStaff, seminarId]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const modifyMutation = useMutation({
    mutationFn: async () => {
      const datetimeFields = new Set(["start_time", "end_time"]);
      const payload: Record<string, any> = {};
      for (const key of Object.keys(editForm)) {
        const v = editForm[key];
        if (datetimeFields.has(key)) {
          // datetime-local 값(로컬 시간)을 UTC ISO 문자열로 변환
          payload[key] = v ? toUtcIso(v) : null;
        } else {
          payload[key] = v === "" ? null : v;
        }
      }
      await axiosInstance.put(api.v1.seminarDetail(seminarId), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] });
      setEditMode(false);
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "수정 실패"),
  });

  const deleteSeminarMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(api.v1.seminarDetail(seminarId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
      navigate("/seminar");
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "삭제 실패"),
  });

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(api.v1.seminarRsvp(seminarId));
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] });
      if (data.waitlisted) {
        alert(`대기자 등록 완료! 현재 대기 순서: ${data.position}번`);
      } else {
        alert("RSVP 완료!");
      }
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "RSVP 실패"),
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(api.v1.seminarRsvp(seminarId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] });
      alert("RSVP 취소 완료");
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "RSVP 취소 실패"),
  });

  const cancelWaitlistMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(api.v1.seminarWaitlist(seminarId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] });
      alert("대기자 취소 완료");
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "대기자 취소 실패"),
  });

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(
        api.v1.seminarCheckinToken(seminarId),
        {
          duration_minutes: tokenDuration,
        },
      );
      return res.data as CheckInTokenResponse;
    },
    onSuccess: (data) => {
      setActiveToken(data); // 로컬 state 직접 업데이트 → 즉시 반영
      setShowQR(true);
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "토큰 생성 실패"),
  });

  const stopCheckinMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(api.v1.seminarCheckinToken(seminarId));
    },
    onSuccess: () => {
      setActiveToken(null); // 로컬 state 비워 "비활성" 상태로 전환
      setShowQR(false);
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "체크인 중지 실패"),
  });

  const modifyCheckinMutation = useMutation({
    mutationFn: async ({
      userId,
      checked_in,
    }: {
      userId: number;
      checked_in: boolean;
    }) => {
      await axiosInstance.patch(api.v1.seminarUserCheckin(seminarId, userId), {
        checked_in,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["seminar", seminarId] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "체크인 수정 실패"),
  });

  const [importResult, setImportResult] = useState<Record<string, any> | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [reminderResult, setReminderResult] = useState<{ sent: number; errors: number; total_rsvp: number } | null>(null);

  const reminderMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(api.v1.seminarReminder(seminarId));
      return res.data;
    },
    onSuccess: (data) => setReminderResult(data),
    onError: (e: any) => alert(e.response?.data?.detail ?? "리마인더 발송 실패"),
  });

  const importCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosInstance.post(api.v1.importCsv(seminarId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
  const isFull =
    seminar?.max_capacity != null &&
    seminar.current_rsvp_count >= seminar.max_capacity;

  const checkinUrl = activeToken
    ? `${window.location.origin}/check-in?token=${activeToken.token}`
    : null;

  // ── Render helpers ─────────────────────────────────────────────────────────

  if (isLoading) return <div>Loading...</div>;
  if (error || !seminar) return <div>Seminar not found.</div>;

  const startEditForm = () => {
    setEditForm({
      title: seminar.title,
      description: seminar.description ?? "",
      start_time: seminar.start_time ? toLocalInput(seminar.start_time) : "",
      end_time: seminar.end_time ? toLocalInput(seminar.end_time) : "",
      location: seminar.location ?? "",
      max_capacity: seminar.max_capacity ?? "",
      host: seminar.host ?? "",
      cover_image: seminar.cover_image ?? "",
      rsvp_enabled: seminar.rsvp_enabled,
      waitlist_enabled: seminar.waitlist_enabled,
    });
    setEditMode(true);
  };

  return (
    <div style={{ padding: "1rem", maxWidth: 800, margin: "0 auto" }}>
      <button onClick={() => navigate("/seminar")}>← Back to list</button>

      {/* ── Cover image ── */}
      {seminar.cover_image && (
        <img
          src={seminar.cover_image}
          alt="cover"
          style={{
            width: "100%",
            maxHeight: 240,
            objectFit: "cover",
            marginTop: 12,
          }}
        />
      )}

      {/* ── Title & basic info ── */}
      {!editMode ? (
        <>
          <h1>{seminar.title}</h1>
          {seminar.host && <div>🎙 Host: {seminar.host}</div>}
          {seminar.description && <p>{seminar.description}</p>}
          <div>
            📅 {formatDate(seminar.start_time)} ~ {formatDate(seminar.end_time)}
          </div>
          {seminar.location && <div>📍 {seminar.location}</div>}
          <div style={{ marginTop: 8 }}>
            Capacity:{" "}
            <strong>
              {seminar.current_rsvp_count} / {seminar.max_capacity ?? "∞"}
            </strong>
            {seminar.waitlist_enabled && (
              <span> | Waitlist: {seminar.waitlist_count}명</span>
            )}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#555" }}>
            RSVP: {seminar.rsvp_enabled ? "ON" : "OFF"} | Waitlist:{" "}
            {seminar.waitlist_enabled ? "ON" : "OFF"}
          </div>
          {isStaff && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={startEditForm}>Edit Seminar</button>
              <button
                style={{ color: "red" }}
                disabled={deleteSeminarMutation.isPending}
                onClick={() => {
                  if (confirm(`"${seminar.title}" 세미나를 삭제하시겠습니까?`)) {
                    deleteSeminarMutation.mutate();
                  }
                }}
              >
                {deleteSeminarMutation.isPending ? "Deleting..." : "Delete Seminar"}
              </button>
            </div>
          )}
        </>
      ) : (
        /* ── Edit form (staff) ── */
        <fieldset style={{ marginTop: 12 }}>
          <legend>Edit Seminar</legend>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <input
              placeholder="Title *"
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
            />
            <textarea
              placeholder="Description"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
            <label>
              Start time&nbsp;
              <input
                type="datetime-local"
                value={editForm.start_time}
                onChange={(e) =>
                  setEditForm({ ...editForm, start_time: e.target.value })
                }
              />
            </label>
            <label>
              End time&nbsp;
              <input
                type="datetime-local"
                value={editForm.end_time}
                onChange={(e) =>
                  setEditForm({ ...editForm, end_time: e.target.value })
                }
              />
            </label>
            <input
              placeholder="Location"
              value={editForm.location}
              onChange={(e) =>
                setEditForm({ ...editForm, location: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Max capacity (blank = unlimited)"
              value={editForm.max_capacity}
              onChange={(e) =>
                setEditForm({ ...editForm, max_capacity: e.target.value })
              }
            />
            <input
              placeholder="Host / Organizer"
              value={editForm.host}
              onChange={(e) =>
                setEditForm({ ...editForm, host: e.target.value })
              }
            />
            <input
              placeholder="Cover image URL"
              value={editForm.cover_image}
              onChange={(e) =>
                setEditForm({ ...editForm, cover_image: e.target.value })
              }
            />
            <label>
              <input
                type="checkbox"
                checked={editForm.rsvp_enabled}
                onChange={(e) =>
                  setEditForm({ ...editForm, rsvp_enabled: e.target.checked })
                }
              />
              &nbsp;RSVP enabled
            </label>
            <label>
              <input
                type="checkbox"
                checked={editForm.waitlist_enabled}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    waitlist_enabled: e.target.checked,
                  })
                }
              />
              &nbsp;Waitlist enabled
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => modifyMutation.mutate()}
                disabled={modifyMutation.isPending}
              >
                Save
              </button>
              <button onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </div>
        </fieldset>
      )}

      <hr />

      {/* ── Member: RSVP / Waitlist ── */}
      {!isStaff && isLoggedIn && seminar.rsvp_enabled && (
        <section>
          <h3>My Status</h3>
          {myRsvp ? (
            <div>
              ✅ RSVP 완료
              {myRsvp.checked_in && (
                <span>
                  {" "}
                  | ☑ 체크인 완료 ({formatDate(myRsvp.checked_in_at)})
                </span>
              )}
              <br />
              <button
                onClick={() => cancelRsvpMutation.mutate()}
                disabled={cancelRsvpMutation.isPending}
              >
                RSVP 취소
              </button>
            </div>
          ) : myWaitlist ? (
            <div>
              ⏳ 대기 중 ({myWaitlist.position}번째)
              <br />
              <button
                onClick={() => cancelWaitlistMutation.mutate()}
                disabled={cancelWaitlistMutation.isPending}
              >
                대기 취소
              </button>
            </div>
          ) : (
            <div>
              {isFull && !seminar.waitlist_enabled ? (
                <span>정원 마감 (대기 불가)</span>
              ) : (
                <button
                  onClick={() => rsvpMutation.mutate()}
                  disabled={rsvpMutation.isPending}
                >
                  {isFull ? "대기자 등록" : "RSVP"}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!isLoggedIn && (
        <p>
          <a href="/signin">로그인</a>하면 RSVP 할 수 있습니다.
        </p>
      )}

      {/* ── Staff: Reminder email ── */}
      {isStaff && (
        <section style={{ marginTop: "1rem" }}>
          <h3>리마인더 이메일</h3>
          <p style={{ fontSize: "0.85rem", color: "#555", margin: "0 0 10px" }}>
            RSVP 등록된 모든 참석자에게 세미나 안내 이메일을 발송합니다.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => {
                if (confirm(`RSVP 참석자 ${seminar.current_rsvp_count}명에게 리마인더를 발송하시겠습니까?`)) {
                  setReminderResult(null);
                  reminderMutation.mutate();
                }
              }}
              disabled={reminderMutation.isPending || seminar.current_rsvp_count === 0}
            >
              {reminderMutation.isPending ? "발송 중..." : "📧 리마인더 발송"}
            </button>
            {seminar.current_rsvp_count === 0 && (
              <span style={{ fontSize: "0.85rem", color: "#aaa" }}>RSVP 참석자 없음</span>
            )}
          </div>
          {reminderResult && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: reminderResult.errors > 0 ? "#fff3f3" : "#f0fff4",
                border: `1px solid ${reminderResult.errors > 0 ? "#ffb3b3" : "#b2f5d0"}`,
                borderRadius: 6,
                fontSize: "0.85rem",
              }}
            >
              ✅ 발송 완료 — 성공 <strong>{reminderResult.sent}</strong>건 /
              실패 <strong>{reminderResult.errors}</strong>건 /
              총 RSVP <strong>{reminderResult.total_rsvp}</strong>명
            </div>
          )}
        </section>
      )}

      {/* ── Staff: Check-in token management ── */}
      {isStaff && (
        <section style={{ marginTop: "1rem" }}>
          <h3>Check-in 관리</h3>
          {activeToken && new Date(activeToken.expires_at) > new Date() ? (
            <div>
              <div>
                ✅ 체크인 활성 중 | 만료: {formatDate(activeToken.expires_at)}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowQR((v) => !v)}>
                  {showQR ? "QR 숨기기" : "QR 코드 보기"}
                </button>
                &nbsp;
                <button
                  style={{ color: "red" }}
                  onClick={() => stopCheckinMutation.mutate()}
                  disabled={stopCheckinMutation.isPending}
                >
                  체크인 중지
                </button>
              </div>
              {showQR && checkinUrl && (
                <div style={{ marginTop: 12 }}>
                  <QRCodeSVG value={checkinUrl} size={200} />
                  <div
                    style={{
                      marginTop: 8,
                      wordBreak: "break-all",
                      fontSize: "0.8rem",
                    }}
                  >
                    <a href={checkinUrl} target="_blank" rel="noreferrer">
                      {checkinUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <span>체크인 비활성 상태</span>
              <br />
              <label style={{ marginTop: 8, display: "inline-block" }}>
                유효 시간(분):&nbsp;
                <input
                  type="number"
                  min={1}
                  value={tokenDuration}
                  onChange={(e) => setTokenDuration(Number(e.target.value))}
                  style={{ width: 70 }}
                />
              </label>
              &nbsp;
              <button
                onClick={() => createTokenMutation.mutate()}
                disabled={createTokenMutation.isPending}
              >
                체크인 시작
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Staff: CSV Import ── */}
      {isStaff && (
        <section style={{ marginTop: "1rem" }}>
          <h3>CSV 참석자 임포트</h3>
          <p style={{ fontSize: "0.85rem", color: "#555", margin: "0 0 8px" }}>
            Luma에서 내보낸 CSV 파일을 업로드하면 참석자를 자동으로 등록합니다.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importCsvMutation.mutate(file);
              }}
              disabled={importCsvMutation.isPending}
            />
            {importCsvMutation.isPending && <span>처리 중...</span>}
          </div>
          {importResult && (
            <div
              style={{
                marginTop: 12,
                padding: "12px",
                background: "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: "0.85rem",
              }}
            >
              <strong>임포트 결과</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                <li>총 행수: {importResult.total}</li>
                <li>기존 유저 매칭: {importResult.matched_regular}명</li>
                <li>기존 임시 유저 매칭: {importResult.matched_temporary}명</li>
                <li>임시 유저 신규 생성: {importResult.created_temporary}명</li>
                <li>RSVP 생성: {importResult.rsvp_created}건</li>
                <li>RSVP 중복 스킵: {importResult.rsvp_skipped}건</li>
                <li>정회원 이메일 발송: {importResult.membership_emails_sent}건</li>
                {importResult.errors?.length > 0 && (
                  <li style={{ color: "red" }}>
                    오류 {importResult.errors.length}건:
                    <ul>
                      {importResult.errors.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
              <button
                style={{ marginTop: 8, fontSize: "0.8rem" }}
                onClick={() => setImportResult(null)}
              >
                결과 닫기
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Staff: RSVP list ── */}
      {isStaff && (
        <section style={{ marginTop: "1rem" }}>
          <h3>RSVP 목록 ({seminar.current_rsvp_count}명)</h3>
          {seminar.users.length === 0 ? (
            <p>RSVP 없음</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th style={th}>이름</th>
                  <th style={th}>이메일</th>
                  <th style={th}>체크인</th>
                  <th style={th}>체크인 시각</th>
                  <th style={th}>조작</th>
                </tr>
              </thead>
              <tbody>
                {seminar.users.map((u) => (
                  <tr key={u.id}>
                    <td style={td}>{u.username}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{u.checked_in ? "✅" : "❌"}</td>
                    <td style={td}>{formatDate(u.checked_in_at)}</td>
                    <td style={td}>
                      <button
                        onClick={() =>
                          modifyCheckinMutation.mutate({
                            userId: u.id,
                            checked_in: !u.checked_in,
                          })
                        }
                        disabled={modifyCheckinMutation.isPending}
                      >
                        {u.checked_in ? "체크인 취소" : "체크인"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ── Staff: Waitlist ── */}
      {isStaff && seminar.waitlist_enabled && (
        <section style={{ marginTop: "1rem" }}>
          <h3>대기자 목록 ({seminar.waitlist_count}명)</h3>
          {seminar.waitlist.length === 0 ? (
            <p>대기자 없음</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th style={th}>#</th>
                  <th style={th}>이름</th>
                  <th style={th}>이메일</th>
                  <th style={th}>등록 시각</th>
                </tr>
              </thead>
              <tbody>
                {seminar.waitlist.map((u) => (
                  <tr key={u.id}>
                    <td style={td}>{u.position}</td>
                    <td style={td}>{u.username}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{formatDate(u.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "4px 8px",
  textAlign: "left",
};
const td: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "4px 8px",
};
