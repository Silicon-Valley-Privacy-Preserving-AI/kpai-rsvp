export interface SeminarResponse {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  max_capacity: number | null;
  host: string | null;
  cover_image: string | null;
  rsvp_enabled: boolean;
  waitlist_enabled: boolean;
}

export interface SeminarUserResponse {
  id: number;
  email: string;
  username: string;
  checked_in: boolean;
  checked_in_at: string | null;
}

export interface SeminarWaitlistUserResponse {
  id: number;
  email: string;
  username: string;
  position: number;
  joined_at: string;
}

export interface SeminarDetailResponse extends SeminarResponse {
  current_rsvp_count: number;
  waitlist_count: number;
  users: SeminarUserResponse[];
  waitlist: SeminarWaitlistUserResponse[];
}

export interface CheckInTokenResponse {
  id: number;
  seminar_id: number;
  token: string;
  expires_at: string;
  is_active: boolean;
}

export interface RsvpResponse {
  message: string;
  waitlisted: boolean;
  position?: number;
}
