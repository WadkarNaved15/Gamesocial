import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const sessionId =
      localStorage.getItem(
        "rigzer_analytics_session"
      );

    if (sessionId) {
      config.headers["x-session-id"] =
        sessionId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;