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
  (response) => {
    console.log(`Response received from: ${response.config.url}`, response);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error(
      `Error in response from: ${originalRequest.url}`,
      error.response,
    );

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("Attempting token refresh...");
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          console.error("Refresh token not found in local storage");
          localStorage.removeItem("access_token");
          window.location.href = "/login";
          return Promise.reject(new Error("Refresh token not found"));
        }

        const response = await api.post(
          "/auth/refresh",
          new URLSearchParams({ refresh_token: refreshToken }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        localStorage.setItem("access_token", response.data.access_token);
        localStorage.setItem("refresh_token", response.data.refresh_token);

        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token error:", refreshError);
        if (axios.isAxiosError(refreshError)) {
          console.error("Server response:", refreshError.response?.data);
        }
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const getUserById = (objId: number) => api.get(`/users/${objId}`);
export const getRoleById = (objId: number) => api.get(`/roles/${objId}`);

export default api;