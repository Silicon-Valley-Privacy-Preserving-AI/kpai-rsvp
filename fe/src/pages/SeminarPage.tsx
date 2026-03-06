import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled, { keyframes } from "styled-components";
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

  const [selectedSeminarId, setSelectedSeminarId] = useState<number | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    maximum_rsvp_count: 0,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await axiosInstance.get(api.v1.users);
      return data as User;
    },
    enabled: isLoggedIn,
  });

  const isStaff = currentUser?.role === "staff";

  const { data: seminars, isLoading } = useQuery({
    queryKey: ["seminars"],
    queryFn: async () => {
      const { data } = await axiosInstance.get(api.v1.seminars);
      return data as Seminar[];
    },
  });

  const { data: seminarDetail } = useQuery({
    queryKey: ["seminarDetail", selectedSeminarId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${api.v1.seminars}/${selectedSeminarId}`);
      return data as SeminarDetail;
    },
    enabled: !!selectedSeminarId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(api.v1.seminars, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
      setForm({ title: "", description: "", maximum_rsvp_count: 0 });
      alert("Seminar created successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`${api.v1.seminars}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
      alert("Seminar deleted");
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.post(`${api.v1.seminars}/${id}/rsvp`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminarDetail", selectedSeminarId] });
      alert("RSVP confirmed!");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`${api.v1.seminars}/${id}/rsvp`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminarDetail", selectedSeminarId] });
      alert("RSVP cancelled");
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.post(`${api.v1.seminars}/${id}/check-in`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminarDetail", selectedSeminarId] });
    },
  });

  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner />
        <LoadingText>Loading seminars...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>Seminars</Title>
          <Subtitle>Explore and join our upcoming events</Subtitle>
        </HeaderContent>
      </Header>

      {isStaff && (
        <CreateSection>
          <CreateCard>
            <CreateTitle>Create New Seminar</CreateTitle>
            <CreateForm
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <FormRow>
                <FormInput
                  placeholder="Seminar title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <FormInput
                  type="number"
                  placeholder="Max capacity"
                  value={form.maximum_rsvp_count || ""}
                  onChange={(e) =>
                    setForm({ ...form, maximum_rsvp_count: Number(e.target.value) })
                  }
                  required
                  style={{ maxWidth: "160px" }}
                />
              </FormRow>
              <FormTextarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
              <CreateButton type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Seminar"}
              </CreateButton>
            </CreateForm>
          </CreateCard>
        </CreateSection>
      )}

      <SeminarGrid>
        {seminars?.map((seminar) => {
          const isSelected = selectedSeminarId === seminar.id;
          const detail = isSelected ? seminarDetail : null;
          const isFull = detail && detail.current_rsvp_count >= detail.maximum_rsvp_count;

          return (
            <SeminarCard key={seminar.id}>
              <SeminarHeader>
                <SeminarTitle>{seminar.title}</SeminarTitle>
                {detail && (
                  <CapacityBadge $isFull={!!isFull}>
                    {detail.current_rsvp_count} / {detail.maximum_rsvp_count}
                  </CapacityBadge>
                )}
              </SeminarHeader>

              <SeminarDescription>{seminar.description}</SeminarDescription>

              {!isSelected && (
                <ShowDetailsButton onClick={() => setSelectedSeminarId(seminar.id)}>
                  Show Details
                </ShowDetailsButton>
              )}

              {isSelected && detail && (
                <DetailsSection>
                  {isFull && <FullBadge>🔥 Event Full</FullBadge>}

                  {isLoggedIn && (
                    <ActionRow>
                      <RSVPButton onClick={() => rsvpMutation.mutate(seminar.id)}>
                        RSVP
                      </RSVPButton>
                      <CancelButton onClick={() => cancelMutation.mutate(seminar.id)}>
                        Cancel RSVP
                      </CancelButton>
                    </ActionRow>
                  )}

                  {isStaff && (
                    <>
                      <StaffActions>
                        <QRButton onClick={() => setQrModalOpen(seminar.id)}>
                          Show QR Code
                        </QRButton>
                        <DeleteButton onClick={() => {
                          if (window.confirm("Delete this seminar?")) {
                            deleteMutation.mutate(seminar.id);
                          }
                        }}>
                          Delete
                        </DeleteButton>
                      </StaffActions>

                      <ParticipantSection>
                        <ParticipantTitle>Participants</ParticipantTitle>
                        {detail.users.map((user) => (
                          <ParticipantRow key={user.id}>
                            <ParticipantInfo>
                              <ParticipantName>{user.username}</ParticipantName>
                              <ParticipantEmail>{user.email}</ParticipantEmail>
                            </ParticipantInfo>
                            {user.checked_in ? (
                              <CheckedInBadge>✓ Checked In</CheckedInBadge>
                            ) : (
                              <CheckInButton
                                onClick={() => checkInMutation.mutate(seminar.id)}
                              >
                                Check In
                              </CheckInButton>
                            )}
                          </ParticipantRow>
                        ))}
                      </ParticipantSection>
                    </>
                  )}

                  <HideDetailsButton onClick={() => setSelectedSeminarId(null)}>
                    Hide Details
                  </HideDetailsButton>
                </DetailsSection>
              )}
            </SeminarCard>
          );
        })}
      </SeminarGrid>

      {qrModalOpen && (
        <Modal onClick={() => setQrModalOpen(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Check-in QR Code</ModalTitle>
              <CloseButton onClick={() => setQrModalOpen(null)}>×</CloseButton>
            </ModalHeader>
            <QRContainer>
              <QRCodeCanvas
                value={`${window.location.origin}/check-in/${qrModalOpen}`}
                size={280}
                level="H"
              />
            </QRContainer>
            <URLContainer>
              <URLInput
                readOnly
                value={`${window.location.origin}/check-in/${qrModalOpen}`}
              />
              <CopyButton
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/check-in/${qrModalOpen}`
                  );
                  alert("Link copied!");
                }}
              >
                Copy Link
              </CopyButton>
            </URLContainer>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  min-height: calc(100vh - 120px);
  background: #f8fafc;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 60px 24px;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 12px 0;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #cbd5e1;
  margin: 0;
`;

const CreateSection = styled.section`
  max-width: 1200px;
  margin: -40px auto 40px auto;
  padding: 0 24px;
`;

const CreateCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const CreateTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 24px 0;
`;

const CreateForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const FormInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 12px 16px;
  font-size: 15px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px 16px;
  font-size: 15px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const CreateButton = styled.button`
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  align-self: flex-start;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SeminarGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const SeminarCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.5s ease-out;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
`;

const SeminarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
`;

const SeminarTitle = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`;

const CapacityBadge = styled.span<{ $isFull: boolean }>`
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  background: ${(props) =>
    props.$isFull ? "linear-gradient(135deg, #f43f5e, #e11d48)" : "rgba(59, 130, 246, 0.1)"};
  color: ${(props) => (props.$isFull ? "#ffffff" : "#3b82f6")};
`;

const SeminarDescription = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #64748b;
  margin: 0 0 20px 0;
`;

const ShowDetailsButton = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
`;

const HideDetailsButton = styled(ShowDetailsButton)`
  width: 100%;
  margin-top: 20px;
`;

const DetailsSection = styled.div`
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
  animation: ${fadeIn} 0.3s ease-out;
`;

const FullBadge = styled.div`
  padding: 10px 16px;
  background: linear-gradient(135deg, #f43f5e, #e11d48);
  color: #ffffff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 16px;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`;

const RSVPButton = styled.button`
  flex: 1;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid #f43f5e;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(244, 63, 94, 0.2);
  }
`;

const StaffActions = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

const QRButton = styled.button`
  flex: 1;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }
`;

const DeleteButton = styled.button`
  flex: 1;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid #f43f5e;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(244, 63, 94, 0.2);
  }
`;

const ParticipantSection = styled.div`
  margin-top: 24px;
`;

const ParticipantTitle = styled.h4`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px 0;
`;

const ParticipantRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
`;

const ParticipantInfo = styled.div`
  flex: 1;
`;

const ParticipantName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
`;

const ParticipantEmail = styled.div`
  font-size: 13px;
  color: #64748b;
`;

const CheckedInBadge = styled.span`
  padding: 6px 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
`;

const CheckInButton = styled.button`
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #64748b;
  background: #f8fafc;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
`;

const QRContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 20px;
`;

const URLContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const URLInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  font-size: 14px;
  color: #64748b;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
`;

const CopyButton = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const LoadingContainer = styled.div`
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.p`
  font-size: 16px;
  color: #64748b;
`;
