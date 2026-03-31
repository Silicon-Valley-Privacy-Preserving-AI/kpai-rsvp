export const api = {
  v1: {
    users: "/api/v1/users",
    usersList: "/api/v1/users/list",
    setPassword: "/api/v1/users/set-password",

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

    importCsv: (seminarId: number) => `/api/v1/import/${seminarId}`,
    seminarReminder: (seminarId: number) => `/api/v1/seminars/${seminarId}/reminder`,

    // Legacy direct check-in
    seminarCheckIn: (seminarId: number) => `/api/v1/seminars/${seminarId}/check-in`,

    // Token-based check-in
    checkIn: "/api/v1/check-in",
  },
};
