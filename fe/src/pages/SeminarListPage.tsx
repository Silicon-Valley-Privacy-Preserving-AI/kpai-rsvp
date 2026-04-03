import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import type { SeminarResponse } from "../types/seminar";
import { toUtcIso } from "../utils/datetime";
import {
  Button,
  Input,
  Textarea,
  Label,
  FormGroup,
  CheckboxRow,
  Badge,
  PageContainer,
  PageHeader,
  PageTitle,
  LoadingCenter,
  Spinner,
  EmptyState,
  AlertBox,
} from "../components/ui";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SeminarListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", start_time: "", end_time: "",
    location: "", max_capacity: "", host: "", cover_image: "",
    rsvp_enabled: true, waitlist_enabled: false,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.users); return res.data; },
    enabled: !!sessionStorage.getItem("accessToken"),
    retry: false,
  });
  const isStaff = me?.role === "staff";

  const { data: seminars = [], isLoading } = useQuery<SeminarResponse[]>({
    queryKey: ["seminars"],
    queryFn: async () => { const res = await axiosInstance.get(api.v1.seminars); return res.data; },
  });

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
      setCreateError("");
      setForm({ title: "", description: "", start_time: "", end_time: "", location: "", max_capacity: "", host: "", cover_image: "", rsvp_enabled: true, waitlist_enabled: false });
    },
    onError: (e: any) => setCreateError(e.response?.data?.detail ?? "세미나 생성 실패"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await axiosInstance.delete(api.v1.seminarDetail(id)); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminars"] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "삭제 실패"),
  });

  if (isLoading) {
    return (
      <LoadingCenter>
        <Spinner />
        Loading seminars…
      </LoadingCenter>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Seminars</PageTitle>
        {isStaff && (
          <Button
            variant={showCreateForm ? "ghost" : "primary"}
            onClick={() => { setShowCreateForm((v) => !v); setCreateError(""); }}
          >
            {showCreateForm ? "✕ Cancel" : "+ New Seminar"}
          </Button>
        )}
      </PageHeader>

      {/* ── Create form ── */}
      {isStaff && showCreateForm && (
        <CreateForm>
          <CreateFormTitle>New Seminar</CreateFormTitle>

          {createError && (
            <AlertBox variant="error" style={{ marginBottom: 16 }}>
              {createError}
            </AlertBox>
          )}

          <TwoCol>
            <FormGroup>
              <Label>Title *</Label>
              <Input placeholder="Seminar title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Host / Organizer</Label>
              <Input placeholder="Speaker or org name" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </FormGroup>
          </TwoCol>

          <FormGroup>
            <Label>Description</Label>
            <Textarea placeholder="What is this seminar about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormGroup>

          <TwoCol>
            <FormGroup>
              <Label>Start time</Label>
              <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>End time</Label>
              <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </FormGroup>
          </TwoCol>

          <TwoCol>
            <FormGroup>
              <Label>Location</Label>
              <Input placeholder="Venue or online link" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Max capacity</Label>
              <Input type="number" placeholder="Leave blank for unlimited" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} />
            </FormGroup>
          </TwoCol>

          <FormGroup>
            <Label>Cover image URL</Label>
            <Input placeholder="https://..." value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
          </FormGroup>

          <CheckRow>
            <CheckboxRow>
              <input type="checkbox" checked={form.rsvp_enabled} onChange={(e) => setForm({ ...form, rsvp_enabled: e.target.checked })} />
              RSVP enabled
            </CheckboxRow>
            <CheckboxRow>
              <input type="checkbox" checked={form.waitlist_enabled} onChange={(e) => setForm({ ...form, waitlist_enabled: e.target.checked })} />
              Waitlist enabled
            </CheckboxRow>
          </CheckRow>

          <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create Seminar"}
          </Button>
        </CreateForm>
      )}

      {/* ── Seminar cards ── */}
      {seminars.length === 0 ? (
        <EmptyState>No seminars yet.</EmptyState>
      ) : (
        <Grid>
          {seminars.map((s) => (
            <SeminarCard key={s.id} onClick={() => navigate(`/seminar/${s.id}`)}>
              {s.cover_image && (
                <CoverImg src={s.cover_image} alt="cover" />
              )}
              <CardContent>
                <TagRowTop>
                  {s.rsvp_enabled && <Badge color="purple">RSVP</Badge>}
                  {s.waitlist_enabled && <Badge color="blue">Waitlist</Badge>}
                  {s.max_capacity == null && <Badge color="gray">Unlimited</Badge>}
                </TagRowTop>

                <SeminarTitle>{s.title}</SeminarTitle>
                {s.host && <HostLine>🎙 {s.host}</HostLine>}
                {s.description && <Description>{s.description}</Description>}

                <MetaBlock>
                  {s.start_time && (
                    <MetaItem>📅 {formatDate(s.start_time)}{s.end_time && ` — ${formatDate(s.end_time)}`}</MetaItem>
                  )}
                  {s.location && <MetaItem>📍 {s.location}</MetaItem>}
                  {s.max_capacity != null && (
                    <MetaItem>👥 Capacity: {s.max_capacity}</MetaItem>
                  )}
                </MetaBlock>

                <CardActions onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" onClick={() => navigate(`/seminar/${s.id}`)}>
                    View Detail →
                  </Button>
                  {isStaff && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Delete "${s.title}"?`)) deleteMutation.mutate(s.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </CardActions>
              </CardContent>
            </SeminarCard>
          ))}
        </Grid>
      )}
    </PageContainer>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const CreateForm = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 28px 28px 24px;
  margin-bottom: 32px;
`;

const CreateFormTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 20px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0 16px;

  @media (min-width: 560px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const CheckRow = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const SeminarCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;

  &:hover {
    box-shadow: 0 8px 28px rgba(108, 92, 231, 0.12);
    transform: translateY(-2px);
    border-color: #c4b5fd;
  }
`;

const CoverImg = styled.img`
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
`;

const CardContent = styled.div`
  padding: 18px 20px 20px;
`;

const TagRowTop = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const SeminarTitle = styled.h2`
  font-size: 17px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
  line-height: 1.35;
`;

const HostLine = styled.div`
  font-size: 13px;
  color: #6c5ce7;
  font-weight: 600;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaBlock = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaItem = styled.div`
  font-size: 13px;
  color: #6b7280;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;
