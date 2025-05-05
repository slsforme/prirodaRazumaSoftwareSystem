import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1"
});

api.interceptors.request.use(
  (config) => {
    if (config.url !== "/auth/refresh") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url === "/auth/refresh") {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      try {
        originalRequest._retry = true;
        const refreshToken = localStorage.getItem("refresh_token");

        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await api.post("/auth/refresh", 
          new URLSearchParams({ refresh_token: refreshToken }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getUserById = (objId: number) => api.get(`/users/${objId}`);
export const getRoleById = (objId: number) => api.get(`/roles/${objId}`);

export default api;