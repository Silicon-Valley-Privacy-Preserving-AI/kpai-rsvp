import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 3000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/** Clear session and redirect to sign-in. No-op if already on that page. */
function forceLogout() {
  sessionStorage.removeItem("accessToken");
  if (window.location.pathname !== "/signin") {
    window.location.replace("/signin");
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Server responded with 4xx / 5xx
    if (error.response) {
      console.error("❌ API Error");
      console.error("URL:", error.config?.url);
      console.error("Method:", error.config?.method);
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);

      const status = error.response.status as number;
      const url: string = error.config?.url ?? "";

      // 401 / 403 with a stored token → token is expired or revoked
      if (status === 401 || status === 403) {
        if (sessionStorage.getItem("accessToken")) {
          forceLogout();
        }
      }

      // 404 on the "get current user" endpoint → account no longer exists
      if (status === 404 && url.includes("/api/v1/users") && !url.match(/\/api\/v1\/users\/\d+/)) {
        forceLogout();
      }
    }
    // Request sent but no response received (network error, etc.)
    else if (error.request) {
      console.error("❌ Network Error:", error.message);
    }
    // Request setup error
    else {
      console.error("❌ Axios Config Error:", error.message);
    }

    return Promise.reject(error);
  },
);
