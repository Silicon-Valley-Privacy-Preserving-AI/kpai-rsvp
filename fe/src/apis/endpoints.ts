export const api = {
  v1: {
    users: "/api/v1/users",

    auth: {
      login: "/api/v1/auth/login",
    },

    seminars: "/api/v1/seminars",
    seminarDetail: (seminarId: number) => `/api/v1/seminars/${seminarId}`,
    seminarRsvp: (seminarId: number) => `/api/v1/seminars/${seminarId}/rsvp`,
    seminarWaitlist: (seminarId: number) => `/api/v1/seminars/${seminarId}/waitlist`,
    seminarCheckinToken: (seminarId: number) => `/api/v1/seminars/${seminarId}/checkin-token`,
    seminarUserCheckin: (seminarId: number, userId: number) =>
      `/api/v1/seminars/${seminarId}/users/${userId}/checkin`,

    // Legacy direct check-in
    seminarCheckIn: (seminarId: number) => `/api/v1/seminars/${seminarId}/check-in`,

    // Token-based check-in
    checkIn: "/api/v1/check-in",
  },
};
