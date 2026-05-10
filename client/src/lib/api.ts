/**
 * Vite (default http://localhost:5173) proxies `/api` → Express (5000+).
 * ML: Flask on 5001; Express forwards features to it. Endpoints: login, signup, predict, save-history, history.
 */
export const API_URL = "/api";

if (typeof window !== "undefined" && import.meta.env.DEV) {
  console.log("API URL:", API_URL);
}
