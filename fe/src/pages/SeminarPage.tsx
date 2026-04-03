import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { QRCodeCanvas } from "qrcode.react";

type User = {
  id: number;
  username: string;
  email: string;
  role: "member" | "staff";
};

type Seminar = {
  id: number;
  title: string;
  description: string;
  maximum_rsvp_count: number;
};

type SeminarDetail = Seminar & {
  current_rsvp_count: number;
  users: {
    id: number;
    email: string;
    username: string;
    checked_in: boolean;
    checked_in_at: string | null;
  }[];
};

export default function SeminarPage() {
  const queryClient = useQueryClient();
  const accessToken = sessionStorage.getItem("accessToken");
  const isLoggedIn = !!accessToken;

  const [selectedSeminarId, setSelectedSeminarId] = useState<number | null>(
    null,
  );

  const [revealedCheckInId, setRevealedCheckInId] = useState<number | null>(
    null,
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    maximum_rsvp_count: 0,
  });

  // 🔥 Current user
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await axiosInstance.get(api.v1.users);
      return data as User;
    },
    enabled: isLoggedIn,
  });

  const isStaff = currentUser?.role === "staff";

  // 🔥 Seminar list
  const { data: seminars, isLoading } = useQuery({
    queryKey: ["seminars"],
    queryFn: async () => {
      const { data } = await axiosInstance.get(api.v1.seminars);
      return data as Seminar[];
    },
  });

  // 🔥 Seminar detail
  const { data: seminarDetail } = useQuery({
    queryKey: ["seminarDetail", selectedSeminarId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `${api.v1.seminars}/${selectedSeminarId}`,
      );
      return data as SeminarDetail;
    },
    enabled: !!selectedSeminarId,
  });

  // 🔥 Create
  const createMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(api.v1.seminars, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
      setForm({ title: "", description: "", maximum_rsvp_count: 0 });
    },
  });

  // 🔥 Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`${api.v1.seminars}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
    },
  });

  // 🔥 RSVP
  const rsvpMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.post(`${api.v1.seminars}/${id}/rsvp`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["seminarDetail", selectedSeminarId],
      });
    },
  });

  // 🔥 Cancel RSVP
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`${api.v1.seminars}/${id}/rsvp`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["seminarDetail", selectedSeminarId],
      });
    },
  });

  // 🔥 Staff check-in
  const checkInMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.post(`${api.v1.seminars}/${id}/check-in`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["seminarDetail", selectedSeminarId],
      });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Seminar Page</h1>

      {/* 🔥 Staff-only: create */}
      {isStaff && (
        <div style={{ marginBottom: 40 }}>
          <h2>Create Seminar</h2>
          <input
            placeholder="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            type="number"
            placeholder="max"
            value={form.maximum_rsvp_count}
            onChange={(e) =>
              setForm({
                ...form,
                maximum_rsvp_count: Number(e.target.value),
              })
            }
          />
          <button onClick={() => createMutation.mutate()}>Create</button>
        </div>
      )}

      {/* 🔥 Seminar list */}
      {seminars?.map((seminar) => (
        <div
          key={seminar.id}
          style={{
            border: "1px solid gray",
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3>{seminar.title}</h3>
          <p>{seminar.description}</p>
          <p>Max: {seminar.maximum_rsvp_count}</p>

          <button
            onClick={() =>
              setSelectedSeminarId(
                selectedSeminarId === seminar.id ? null : seminar.id,
              )
            }
          >
            Detail
          </button>

          {/* 🔥 Staff delete */}
          {isStaff && (
            <button onClick={() => deleteMutation.mutate(seminar.id)}>
              Delete
            </button>
          )}

          {/* 🔥 Staff check-in reveal */}
          {isStaff && (
            <button
              onClick={() =>
                setRevealedCheckInId(
                  revealedCheckInId === seminar.id ? null : seminar.id,
                )
              }
            >
              Check-in Reveal
            </button>
          )}

          {/* 🔥 Show check-in link */}
          {isStaff && revealedCheckInId === seminar.id && (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                background: "#f5f5f5",
                borderRadius: 10,
              }}
            >
              <h4>Check-in QR</h4>

              {/* 🔥 Check-in URL */}
              {(() => {
                const checkInUrl = `${window.location.origin}/check-in/${seminar.id}`;

                return (
                  <>
                    {/* 🔥 QR code */}
                    <div style={{ marginBottom: 20 }}>
                      <QRCodeCanvas value={checkInUrl} size={220} level="H" />
                    </div>

                    {/* 🔥 URL display */}
                    <input
                      readOnly
                      value={checkInUrl}
                      style={{ width: "100%", marginBottom: 10 }}
                    />

                    {/* 🔥 Copy button */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(checkInUrl);
                        alert("Link copied!");
                      }}
                    >
                      Copy Link
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* 🔥 Detail */}
          {selectedSeminarId === seminar.id && seminarDetail && (
            <div style={{ marginTop: 20 }}>
              <p>Current RSVP: {seminarDetail.current_rsvp_count}</p>

              {seminarDetail.current_rsvp_count >=
                seminarDetail.maximum_rsvp_count && (
                <p style={{ color: "red" }}>🔥 Seminar Full</p>
              )}

              {/* 🔥 RSVP button */}
              {isLoggedIn && (
                <>
                  <button onClick={() => rsvpMutation.mutate(seminar.id)}>
                    RSVP
                  </button>
                  <button onClick={() => cancelMutation.mutate(seminar.id)}>
                    Cancel RSVP
                  </button>
                </>
              )}

              {/* 🔥 Staff participant list */}
              {isStaff && (
                <div>
                  <h4>Participants</h4>
                  {seminarDetail.users.map((u) => (
                    <div key={u.id}>
                      {u.username} -{" "}
                      {u.checked_in ? "Checked In" : "Not Checked"}
                      {!u.checked_in && (
                        <button
                          onClick={() => checkInMutation.mutate(seminar.id)}
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
