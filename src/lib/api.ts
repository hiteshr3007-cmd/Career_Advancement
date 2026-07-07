import axios from "axios";
import { STORAGE_KEYS } from "../constants/storage";

const api = axios.create({
  baseURL: "YOUR_BACKEND_BASE_URL",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
  
      return config;
    },
    (error) => Promise.reject(error)
  );

export default api;