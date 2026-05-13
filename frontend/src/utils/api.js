import axios from "axios";

const getDeviceFingerprint = () => {
   let fp=localStorage.getItem("device_fingerprint");
   if(!fp) {
      fp= crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      localStorage.setItem("device_fingerprint",fp);
   }
   return fp;
}



const api = axios.create({
  baseURL: "http://localhost:3000",
headers: {
  "Content-Type": "application/json",
  "X-Device-Fingerprint": getDeviceFingerprint(),
},
});


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

    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401 && data?.error === 'Step-up authentication required') {
       window.dispatchEvent(new CustomEvent('step-up-required', { detail: data }));
       alert(`SECURITY ALERT: Your trust score dropped to ${data.currentScore}. You must verify your identity to access restricted features.`);
    } 
    else if (status === 403 && data?.tier === 'blocked') {
       alert("Session terminated due to suspicious activity.");
       localStorage.removeItem('nexora_token');
       localStorage.removeItem('nexora_user');
       window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
