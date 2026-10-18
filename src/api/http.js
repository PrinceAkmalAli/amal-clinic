import axios from "axios";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Har request ke sath token aur clinic ka slug jata hai.
// Django side par slug se pata chalta hai ke kis clinic ka database use karna hai.
http.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem("auth") || "null");
  if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  if (auth?.user?.clinicSlug) config.headers["X-Clinic-Slug"] = auth.user.clinicSlug;
  return config;
});

// Token expire ho jaye to login par wapas
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default http;
