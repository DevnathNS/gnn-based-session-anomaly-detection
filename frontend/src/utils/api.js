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

let lastStepUpTime = 0;

api.interceptors.response.use(
  (response) => {
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

    if ((status === 403 && data?.tier === 'blocked') || (status === 401 && data?.error === 'Session terminated due to suspicious activity.')) {
       alert("Session terminated due to suspicious activity.");
       localStorage.removeItem('nexora_token');
       localStorage.removeItem('nexora_user');
       window.location.href = '/login';
       return Promise.reject(error);
    }
    const needsStepUp = data?.requiresStepUp || data?.tier === 'restricted' || data?.message?.toLowerCase().includes('step-up');
    
    if ((status === 401 || status === 403 )&& needsStepUp) {
    	const now= Date.now();
    	if(now-lastStepUpTime > 2000) {
    		lastStepUpTime= now;
    		window.dispatchEvent(new CustomEvent('step-up-required', { 
          detail: { message: data?.message || 'Trust score too low. Identity verification required.' }
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
