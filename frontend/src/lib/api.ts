import axios from "axios";

function getBaseURL() {
  if (typeof window !== "undefined") {
    // Use the same hostname the browser is on, but port 8080 for the API
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        // Store current path so we can return after login
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== "/login" && currentPath !== "/register") {
          sessionStorage.setItem("returnTo", currentPath);
        }
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
