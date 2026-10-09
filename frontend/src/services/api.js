const API_URL =
  import.meta.env.VITE_API_URL ||  "/api";

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("sahayak_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

const api = {
  // =========================
  // AUTH
  // =========================

  register: (data) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  login: (data) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  getMe: () =>
    request("/auth/me"),

  // =========================
  // PROVIDERS
  // =========================

  getProviders: (params = "") =>
    request(`/providers${params}`),

  getProviderProfile: () =>
    request("/providers/profile"),

  getProviderDashboard: () =>
    request("/providers/dashboard"),

  createProvider: (data) =>
    request("/providers", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // =========================
  // ADMIN
  // =========================

  getPendingProviders: () =>
    request("/admin/providers/pending"),

  getAllProviders: () =>
    request("/admin/providers"),

  getAllEmergencyRequests: () =>
    request("/admin/requests"),

  getProviderById: (id) =>
    request(`/admin/providers/${id}`),

  approveProvider: (id) =>
    request(`/admin/providers/${id}/approve`, {
      method: "PATCH"
    }),

  rejectProvider: (id, reason) =>
    request(`/admin/providers/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason })
    }),

  // =========================
  // RESOURCES
  // =========================

  getResources: (params = "") =>
    request(`/resources${params}`),

  getResource: (id) =>
    request(`/resources/${id}`),

  createResource: (data) =>
    request("/resources", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateResource: (id, data) =>
    request(`/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  deleteResource: (id) =>
    request(`/resources/${id}`, {
      method: "DELETE"
    }),

  // =========================
  // EMERGENCY REQUESTS
  // =========================

  createRequest: (data) =>
    request("/requests", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  getMyRequests: () =>
    request("/requests/my"),

  getProviderRequests: () =>
    request("/requests/provider"),

  updateRequestStatus: (id, status, rejectionReason) =>
    request(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) })
    })
};

export default api;