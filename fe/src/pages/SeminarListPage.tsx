import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import type { SeminarResponse } from "../types/seminar";
import { toUtcIso } from "../utils/datetime";

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR");
}

export default function SeminarListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    max_capacity: "",
    host: "",
    cover_image: "",
    rsvp_enabled: true,
    waitlist_enabled: false,
  });

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

  // Seminar list
  const { data: seminars = [], isLoading } = useQuery<SeminarResponse[]>({
    queryKey: ["seminars"],
    queryFn: async () => {
      const res = await axiosInstance.get(api.v1.seminars);
      return res.data;
    },
  });

  // Create seminar (staff)
  const createMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(api.v1.seminars, {
        title: form.title,
        description: form.description || null,
        start_time: form.start_time ? toUtcIso(form.start_time) : null,
        end_time: form.end_time ? toUtcIso(form.end_time) : null,
        location: form.location || null,
        max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
        host: form.host || null,
        cover_image: form.cover_image || null,
        rsvp_enabled: form.rsvp_enabled,
        waitlist_enabled: form.waitlist_enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
      setShowCreateForm(false);
      setForm({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        max_capacity: "",
        host: "",
        cover_image: "",
        rsvp_enabled: true,
        waitlist_enabled: false,
      });
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "세미나 생성 실패"),
  });

  // Delete seminar (staff)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(api.v1.seminarDetail(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminars"] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "삭제 실패"),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "1rem", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Seminars</h1>
        {isStaff && (
          <button onClick={() => setShowCreateForm((v) => !v)}>
            {showCreateForm ? "Cancel" : "+ Create Seminar"}
          </button>
        )}
      </div>

      {/* ── Create form (staff) ── */}
      {isStaff && showCreateForm && (
        <fieldset style={{ marginBottom: "1.5rem" }}>
          <legend>New Seminar</legend>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <input
              placeholder="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <label>
              Start time&nbsp;
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </label>
            <label>
              End time&nbsp;
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </label>
            <input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <input
              type="number"
              placeholder="Max capacity (leave blank = unlimited)"
              value={form.max_capacity}
              onChange={(e) => setForm({ ...form, max_capacity: e.target.value })}
            />
            <input
              placeholder="Host / Organizer"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
            />
            <input
              placeholder="Cover image URL (optional)"
              value={form.cover_image}
              onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
            />
            <label>
              <input
                type="checkbox"
                checked={form.rsvp_enabled}
                onChange={(e) => setForm({ ...form, rsvp_enabled: e.target.checked })}
              />
              &nbsp;RSVP enabled
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.waitlist_enabled}
                onChange={(e) => setForm({ ...form, waitlist_enabled: e.target.checked })}
              />
              &nbsp;Waitlist enabled
            </label>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </fieldset>
      )}

      {/* ── Seminar list ── */}
      {seminars.length === 0 && <p>No seminars yet.</p>}
      {seminars.map((s) => (
        <div
          key={s.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          {s.cover_image && (
            <img
              src={s.cover_image}
              alt="cover"
              style={{ width: "100%", maxHeight: 180, objectFit: "cover", marginBottom: 8 }}
            />
          )}
          <h2
            style={{ cursor: "pointer", textDecoration: "underline", margin: 0 }}
            onClick={() => navigate(`/seminar/${s.id}`)}
          >
            {s.title}
          </h2>
          {s.host && <div>Host: {s.host}</div>}
          {s.description && <p style={{ margin: "0.4rem 0" }}>{s.description}</p>}
          <div style={{ fontSize: "0.9rem", color: "#555" }}>
            {s.start_time && <span>📅 {formatDate(s.start_time)}</span>}
            {s.end_time && <span> ~ {formatDate(s.end_time)}</span>}
          </div>
          {s.location && <div style={{ fontSize: "0.9rem" }}>📍 {s.location}</div>}
          <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
            Capacity: {s.max_capacity ?? "Unlimited"} &nbsp;|&nbsp;
            RSVP: {s.rsvp_enabled ? "ON" : "OFF"} &nbsp;|&nbsp;
            Waitlist: {s.waitlist_enabled ? "ON" : "OFF"}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={() => navigate(`/seminar/${s.id}`)}>View Detail</button>
            {isStaff && (
              <button
                style={{ color: "red" }}
                onClick={() => {
                  if (confirm(`Delete "${s.title}"?`)) deleteMutation.mutate(s.id);
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
