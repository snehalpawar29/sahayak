const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("sahayak_token");
  const headers = { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
  if (!response.ok) throw new Error(data.message || `Request failed (HTTP ${response.status})`);
  return data;
};

export const api = {
  register: (userData) => request("/auth/register", { method: "POST", body: JSON.stringify(userData) }),
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  getMe: () => request("/auth/me"),
  getResources: (params = "") => request(`/resources${params}`),
  getResource: (id) => request(`/resources/${id}`),
  getProviders: (params = "") => request(`/providers${params}`),
  getMyProvider: () => request("/providers/me"),
  createProvider: (providerData) => request("/providers", { method: "POST", body: JSON.stringify(providerData) }),
  updateProviderDocument: (documentData) => request("/providers/verification-document", { method: "POST", body: JSON.stringify(documentData) }),
  createResource: (resourceData) => request("/resources", { method: "POST", body: JSON.stringify(resourceData) }),
  updateResource: (id, resourceData) => request(`/resources/${id}`, { method: "PATCH", body: JSON.stringify(resourceData) }),
  deleteResource: (id) => request(`/resources/${id}`, { method: "DELETE" }),
  createGuestRequest: (requestData) => request("/requests/guest", { method: "POST", body: JSON.stringify(requestData) }),
  createRequest: (requestData) => request("/requests", { method: "POST", body: JSON.stringify(requestData) }),
  getMyRequests: () => request("/requests/my"),
  getProviderRequests: () => request("/requests/provider"),
  updateRequestStatus: (id, status, reason = "") => request(`/requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) }),
  getAdminProviders: () => request("/admin/providers"),
  getAdminRequests: () => request("/admin/requests"),
  approveAdminProvider: (id) => request(`/admin/providers/${id}/approve`, { method: "PATCH" }),
  rejectAdminProvider: (id, reason) => request(`/admin/providers/${id}/reject`, { method: "DELETE", body: JSON.stringify({ reason }) }),
  getAdminProviderDocument: async (id) => {
    const token = localStorage.getItem("sahayak_token");
    const response = await fetch(`${API_URL}/admin/providers/${id}/document`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Unable to open provider document.");
    }
    return response.blob();
  }
};

export default api;
