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

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // 서버가 응답을 준 경우 (4xx, 5xx)
    if (error.response) {
      console.error("❌ API Error");
      console.error("URL:", error.config?.url);
      console.error("Method:", error.config?.method);
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    // 요청은 보냈지만 응답이 없는 경우 (네트워크 오류 등)
    else if (error.request) {
      console.error("❌ Network Error:", error.message);
    }
    // 요청 자체가 잘못된 경우
    else {
      console.error("❌ Axios Config Error:", error.message);
    }

    return Promise.reject(error);
  },
);
