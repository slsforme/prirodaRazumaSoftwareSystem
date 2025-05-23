import axios, { AxiosInstance, AxiosResponse } from "axios";
import qs from "qs";

const api: AxiosInstance = axios.create({
  baseURL: "https://prirodarazumadev.ru/api/v1", // http://localhost/api/v1
  withCredentials: true,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

api.interceptors.response.use((response: AxiosResponse) => response);

export const authService = {
  login: (credentials: { username: string; password: string }) => {
    const data = qs.stringify({
      grant_type: "password",
      username: credentials.username,
      password: credentials.password,
      scope: "",
      client_id: "",
      client_secret: "",
    });

    return api.post("/auth/login", data);
  },

  refreshToken: (refresh_token: string) => {
    const data = qs.stringify({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    });

    return api.post("/auth/refresh", data);
  },
};

export default api;
