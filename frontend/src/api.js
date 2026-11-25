// All calls to the FastAPI backend live here.
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the server. It may be waking up, please try again in a moment.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.detail || `Request failed (${response.status})`);
    error.fieldErrors = data?.errors || {}; // per-field messages from backend validation
    throw error;
  }
  return data;
}

export const api = {
  getOptions: () => request("/api/options"),

  getPatients: (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return request(`/api/patients?${params.toString()}`);
  },

  createPatient: (patient) =>
    request("/api/patients", { method: "POST", body: JSON.stringify(patient) }),

  updatePatient: (id, patient) =>
    request(`/api/patients/${id}`, { method: "PUT", body: JSON.stringify(patient) }),

  dischargePatient: (id) => request(`/api/patients/${id}/discharge`, { method: "PATCH" }),

  deletePatient: (id) => request(`/api/patients/${id}`, { method: "DELETE" }),
};
