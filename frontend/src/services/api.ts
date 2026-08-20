import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8765",
  // gemma4:26b runs locally and may need time to load into memory on the
  // first request. Avoid treating a normal cold start as a failed request.
  timeout: 10 * 60 * 1000,
});

export function getApiErrorDetail(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail ?? fallback;
  }

  return fallback;
}

export default api;
