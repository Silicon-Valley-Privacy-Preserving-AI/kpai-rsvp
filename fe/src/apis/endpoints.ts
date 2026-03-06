export const api = {
  v1: {
    users: "/api/v1/users",

    auth: {
      login: "/api/v1/auth/login",
    },

    seminars: "/api/v1/seminars",
    seminarDetail: (seminarId: number) => `/api/v1/seminars/${seminarId}`,
    seminarRsvp: (seminarId: number) => `/api/v1/seminars/${seminarId}/rsvp`,
    seminarCheckIn: (seminarId: number) =>
      `/api/v1/seminars/${seminarId}/check-in`,
  },
};
