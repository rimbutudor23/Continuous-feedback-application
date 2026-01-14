export const API_BASE = import.meta.env.VITE_API_BASE;

function getToken() {
  return sessionStorage.getItem("authToken") || null;
}

export async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!resp.ok) {
    const err = new Error("API error");
    err.status = resp.status;
    err.data = data;
    throw err;
  }

  return data;
}
