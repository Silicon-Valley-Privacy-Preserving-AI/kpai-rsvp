export const api = {
  v1: {
    users: "/api/v1/users",
    usersList: "/api/v1/users/list",
    setPassword: "/api/v1/users/set-password",
    myProfile: "/api/v1/users/me/profile",
    myHistory: "/api/v1/users/me/history",

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
    staffCancelRsvp: (seminarId: number, userId: number) =>
      `/api/v1/seminars/${seminarId}/users/${userId}/rsvp`,

    adminDeleteUser: (userId: number) => `/api/v1/users/${userId}`,

    seminarPreviewFromLuma: "/api/v1/seminars/preview-from-luma",
    importCsv: (seminarId: number) => `/api/v1/import/${seminarId}`,
    seminarReminder: (seminarId: number) => `/api/v1/seminars/${seminarId}/reminder`,

    // Legacy direct check-in
    seminarCheckIn: (seminarId: number) => `/api/v1/seminars/${seminarId}/check-in`,

    // Token-based check-in
    checkIn: "/api/v1/check-in",

    // System (admin raw data)
    systemSeminars: "/api/v1/system/seminars",
    systemRsvps: "/api/v1/system/seminar_rsvps",
  },
};
