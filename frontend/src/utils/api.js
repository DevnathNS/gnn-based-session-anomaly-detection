// frontend/src/utils/api.ts

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000", // ✅ FIXED (backend port)
headers: {
  "Content-Type": "application/json",
},
});

// ✅ ALWAYS attach latest token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("nexora_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ optional: debug responses (helps you now)
api.interceptors.response.use(
  (response) => {
    console.log("API RESPONSE:", response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error(
      "API ERROR:",
      error.response?.status,
      error.response?.data
    );
    return Promise.reject(error);
  }
);

export default api;
