const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    throw new Error(
      data.message || "Something went wrong"
    );
  }

  return data;
};

export const api = {
  register: (userData) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    }),

  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),

  getMe: () =>
    request("/auth/me"),

  getResources: (params = "") =>
    request(`/resources${params}`),

  getResource: (id) =>
    request(`/resources/${id}`),

  getProviders: (params = "") =>
    request(`/providers${params}`),

  createProvider: (providerData) =>
    request("/providers", {
      method: "POST",
      body: JSON.stringify(providerData)
    }),

  createResource: (resourceData) =>
    request("/resources", {
      method: "POST",
      body: JSON.stringify(resourceData)
    }),

  updateResource: (id, resourceData) =>
    request(`/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(resourceData)
    }),

  createRequest: (requestData) =>
    request("/requests", {
      method: "POST",
      body: JSON.stringify(requestData)
    }),

  getMyRequests: () =>
    request("/requests/my"),

  getProviderRequests: () =>
    request("/requests/provider"),

  updateRequestStatus: (id, status) =>
    request(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
};

export default api;