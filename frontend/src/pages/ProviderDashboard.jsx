import { useCallback, useEffect, useState } from "react";
import "./ProviderDashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const categories = [
  "BLOOD",
  "HOSPITAL_BED",
  "MEDICINE",
  "AMBULANCE",
  "SHELTER",
  "FOOD",
  "WATER",
];

const emptyResource = {
  name: "",
  category: "BLOOD",
  quantity: 0,
  available: true,
  city: "",
  address: "",
  description: "",
};

const viewDetails = {
  register: {
    title: "Register Resource",
    description: "Manage your provider profile and register emergency resources.",
  },
  requests: {
    title: "Incoming Requests",
    description: "Review citizen requests and update their status.",
  },
  resources: {
    title: "All My Resources",
    description: "View, edit, delete, and update your resource availability.",
  },
};

function getToken() {
  return (
    localStorage.getItem("sahayak_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error
        : data;

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}



function normalizeList(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }

    if (Array.isArray(data?.data?.[key])) {
      return data.data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}



function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatStatus(status) {
  if (!status) return "Unknown";

  return String(status)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Could not read the registration document."));
        return;
      }

      resolve(result.split(",")[1]);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the registration document."));
    };

    reader.readAsDataURL(file);
  });
}
function ProviderDashboard() {
  const [activeView, setActiveView] = useState("home");

  const [provider, setProvider] = useState(null);
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [providerForm, setProviderForm] = useState({
    organizationName: "",
    organizationType: "NGO",
    contactPerson: "",
    phone: "",
    city: "",
    address: "",
    registrationNumber: "",
    description: "",
  });

  const [documentFile, setDocumentFile] = useState(null);

  const [resourceForm, setResourceForm] = useState(emptyResource);
  const [editingResourceId, setEditingResourceId] = useState(null);

  const [rejectionReasons, setRejectionReasons] = useState({});

  const providerVerified =
    provider?.verified === true ||
    String(provider?.verificationStatus || "").toUpperCase() === "APPROVED";

  const verificationStatus = provider?.verificationStatus || "PENDING";

  const loadDashboard = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      const providerResult = await apiRequest("/api/providers/me");

      const providerData =
        providerResult?.provider ??
        providerResult?.data ??
        providerResult ??
        null;

      setProvider(providerData);

      if (providerData) {
        setProviderForm((previous) => ({
          ...previous,
          organizationName:
            providerData.organization ??
            providerData.organizationName ??
            providerData.name ??
            previous.organizationName,
          organizationType:
            providerData.organizationType ??
            providerData.type ??
            previous.organizationType,
          contactPerson:
            providerData.contactPerson ?? previous.contactPerson,
          phone: providerData.phone ?? previous.phone,
          city: providerData.city ?? previous.city,
          address: providerData.address ?? previous.address,
          registrationNumber:
            providerData.registrationNumber ?? previous.registrationNumber,
          description: providerData.description ?? previous.description,
        }));
      }

      const [resourceResult, requestResult] = await Promise.allSettled([
        apiRequest("/api/resources/provider"),
        apiRequest("/api/requests/provider"),
      ]);

      if (resourceResult.status === "fulfilled") {
        setResources(
          normalizeList(resourceResult.value, ["resources", "data"])
        );
      } else {
        setResources([]);
        console.error(
          "Could not load provider resources:",
          resourceResult.reason
        );
      }

      if (requestResult.status === "fulfilled") {
        setRequests(
          normalizeList(requestResult.value, ["requests", "data"])
        );
      } else {
        setRequests([]);
        console.error(
          "Could not load provider requests:",
          requestResult.reason
        );
      }

      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadDashboard(false);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadDashboard]);

  function updateProviderForm(event) {
    const { name, value } = event.target;

    setProviderForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function updateResourceForm(event) {
    const { name, value, type, checked } = event.target;

    setResourceForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : name === "quantity"
            ? value
            : value,
    }));
  }

  function handleDocumentChange(event) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setDocumentFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Upload a PDF, JPG, or PNG registration document.");
      event.target.value = "";
      setDocumentFile(null);
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("The registration document must be 4 MB or smaller.");
      event.target.value = "";
      setDocumentFile(null);
      return;
    }

    setError("");
    setDocumentFile(file);
  }

  async function createProvider(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!documentFile) {
      setError("Please upload your registration document.");
      return;
    }

    setSaving(true);

    try {
      const documentBase64 = await fileToBase64(documentFile);

      const payload = {
        organization: providerForm.organizationName.trim(),
        type: providerForm.organizationType,
        city: providerForm.city.trim(),
        address: providerForm.address.trim(),
        phone: providerForm.phone.trim(),
        documentBase64,
        documentName: documentFile.name,
        documentMimeType: documentFile.type,
      };

      await apiRequest("/api/providers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setDocumentFile(null);
      setSuccess("Provider registration submitted successfully.");

      await loadDashboard(false);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function resubmitDocument(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!documentFile) {
      setError("Please select your updated registration document.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("document", documentFile);

      await apiRequest("/api/providers/resubmit-document", {
        method: "PATCH",
        body: formData,
      });

      setDocumentFile(null);
      setSuccess("Your document has been resubmitted for verification.");
      await loadDashboard(false);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(resource) {
    setEditingResourceId(resource.id);

    setResourceForm({
      name: resource.name || "",
      category: resource.category || "BLOOD",
      quantity: resource.quantity ?? 0,
      available: resource.available ?? true,
      city: resource.city || "",
      address: resource.address || "",
      description: resource.description || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingResourceId(null);
    setResourceForm(emptyResource);
    setError("");
  }

  async function saveResource(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!providerVerified) {
      setError("Your provider account must be approved before managing resources.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...resourceForm,
        quantity: Number(resourceForm.quantity),
      };

      if (editingResourceId !== null) {
        await apiRequest(`/api/resources/${editingResourceId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        setSuccess("Resource updated successfully.");
      } else {
        await apiRequest("/api/resources", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Resource registered successfully.");
      }

      setResourceForm(emptyResource);
      setEditingResourceId(null);

      await loadDashboard(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(resourceId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resource?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/resources/${resourceId}`, {
        method: "DELETE",
      });

      setSuccess("Resource deleted successfully.");

      if (editingResourceId === resourceId) {
        cancelEditing();
      }

      await loadDashboard(false);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  async function toggleResourceAvailability(resource) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/resources/${resource.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: resource.name,
          category: resource.category,
          quantity: resource.quantity,
          city: resource.city,
          address: resource.address,
          description: resource.description,
          available: !resource.available,
        }),
      });

      setSuccess("Resource availability updated.");
      await loadDashboard(false);
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function updateRequest(requestId, status) {
    setError("");
    setSuccess("");

    const reason = rejectionReasons[requestId] || "";

    if (status === "REJECTED" && !reason.trim()) {
      setError("Please provide a reason before rejecting this request.");
      return;
    }

    try {
      await apiRequest(`/api/requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(status === "REJECTED" ? { reason: reason.trim() } : {}),
        }),
      });

      setSuccess(`Request marked as ${formatStatus(status)}.`);
      await loadDashboard(false);
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  function openView(view) {
    setError("");
    setSuccess("");
    setActiveView(view);
  }

  function goHome() {
    setError("");
    setSuccess("");
    setActiveView("home");
  }

  if (loading) {
    return (
      <main className="container page provider-dashboard">
        <div className="page-header">
          <span className="eyebrow">PROVIDER PORTAL</span>
          <h1>Provider Dashboard</h1>
          <p>Loading your provider information...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container page provider-dashboard">
      <header className="page-header">
        <span className="eyebrow">PROVIDER PORTAL</span>
        <h1>Provider Dashboard</h1>
        <p>Manage your verification, resources, and citizen requests.</p>
      </header>

      {error && (
        <div className="provider-alert provider-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="provider-alert provider-alert-success" role="status">
          {success}
        </div>
      )}

      {/* HOME: Three dashboard cards */}
      {activeView === "home" && (
        <section className="provider-navigation" aria-label="Provider dashboard sections">
          <button
            type="button"
            className="provider-nav-card"
            onClick={() => openView("register")}
          >
            <span className="provider-nav-icon" aria-hidden="true">
              +
            </span>
            <h2>Register Resource</h2>
            <p>
              Manage your provider registration and add emergency resources
              after your account is approved.
            </p>
            <span className="provider-nav-link">Open section →</span>
          </button>

          <button
            type="button"
            className="provider-nav-card"
            onClick={() => openView("requests")}
          >
            <span className="provider-nav-icon" aria-hidden="true">
              ⇄
            </span>
            <h2>Incoming Requests</h2>
            <p>
              Review requests from citizens and accept, reject, or complete
              requests as appropriate.
            </p>
            <span className="provider-nav-link">
              View {requests.length} request{requests.length === 1 ? "" : "s"} →
            </span>
          </button>

          <button
            type="button"
            className="provider-nav-card"
            onClick={() => openView("resources")}
          >
            <span className="provider-nav-icon" aria-hidden="true">
              ▤
            </span>
            <h2>All My Resources</h2>
            <p>
              Review your registered resources, change availability, edit
              details, or remove resources.
            </p>
            <span className="provider-nav-link">
              View {resources.length} resource{resources.length === 1 ? "" : "s"} →
            </span>
          </button>
        </section>
      )}

      {/* SECTION HEADER + BACK NAVIGATION */}
      {activeView !== "home" && (
        <section className="provider-section">
          <button
            type="button"
            className="provider-back-button"
            onClick={goHome}
          >
            ← Back to Dashboard
          </button>

          <div className="provider-section-heading">
            <h2>{viewDetails[activeView]?.title}</h2>
            <p>{viewDetails[activeView]?.description}</p>
          </div>
        </section>
      )}

      {/* REGISTER RESOURCE: provider profile registration */}
      {activeView === "register" && !provider && (
        <section className="provider-panel">
          <div className="provider-panel-header">
            <h2>Register as a Provider</h2>
            <p>
              Submit your organization details and registration document for
              administrator verification.
            </p>
          </div>

          <form className="provider-form" onSubmit={createProvider}>
            <div className="provider-form-grid">
              <label className="provider-field">
                Organization Name *
                <input
                  name="organizationName"
                  value={providerForm.organizationName}
                  onChange={updateProviderForm}
                  required
                />
              </label>

              <label className="provider-field">
                Organization Type *
                <select
                  name="organizationType"
                  value={providerForm.organizationType}
                  onChange={updateProviderForm}
                  required
                >
                  <option value="NGO">NGO</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="BLOOD_BANK">Blood Bank</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="AMBULANCE_SERVICE">Ambulance Service</option>
                  <option value="SHELTER">Shelter</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="provider-field">
                Contact Person *
                <input
                  name="contactPerson"
                  value={providerForm.contactPerson}
                  onChange={updateProviderForm}
                  required
                />
              </label>

              <label className="provider-field">
                Contact Number *
                <input
                  name="phone"
                  type="tel"
                  value={providerForm.phone}
                  onChange={updateProviderForm}
                  required
                />
              </label>

              <label className="provider-field">
                City *
                <input
                  name="city"
                  value={providerForm.city}
                  onChange={updateProviderForm}
                  required
                />
              </label>

              <label className="provider-field">
                Registration Number *
                <input
                  name="registrationNumber"
                  value={providerForm.registrationNumber}
                  onChange={updateProviderForm}
                  required
                />
              </label>

              <label className="provider-field provider-field-full">
                Organization Address *
                <textarea
                  name="address"
                  value={providerForm.address}
                  onChange={updateProviderForm}
                  rows={3}
                  required
                />
              </label>

              <label className="provider-field provider-field-full">
                Description
                <textarea
                  name="description"
                  value={providerForm.description}
                  onChange={updateProviderForm}
                  rows={3}
                  placeholder="Briefly describe your organization and services."
                />
              </label>

              <label className="provider-field provider-field-full">
                Registration Document (PDF, JPG, PNG; max 4 MB) *
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleDocumentChange}
                  required
                />
                {documentFile && (
                  <span className="provider-file-name">
                    Selected: {documentFile.name}
                  </span>
                )}
              </label>
            </div>

            <button
              className="provider-primary-button"
              type="submit"
              disabled={saving}
            >
              {saving ? "Submitting..." : "Submit Registration"}
            </button>
          </form>
        </section>
      )}

      {/* REGISTER RESOURCE: existing provider profile and verification */}

      {/* REGISTER RESOURCE: existing provider profile and verification */}
      {activeView === "register" && provider && (
        <section className="provider-panel">
          <div className="provider-panel-header">
            <h2>
              {provider.organization ||
                provider.organizationName ||
                provider.name ||
                "Provider Profile"}
            </h2>
            <p>
              Your provider profile and verification status are shown below.
            </p>
          </div>

          <div className="provider-profile-grid">
            <div className="provider-profile-item">
              <span>Organization</span>
              <strong>
                {provider.organization ||
                  provider.organizationName ||
                  provider.name ||
                  "Not provided"}
              </strong>
            </div>

            <div className="provider-profile-item">
              <span>Organization Type</span>
              <strong>
                {formatStatus(
                  provider.type || provider.organizationType
                )}
              </strong>
            </div>

            <div className="provider-profile-item">
              <span>City</span>
              <strong>{provider.city || "Not provided"}</strong>
            </div>

            <div className="provider-profile-item">
              <span>Verification Status</span>
              <strong
                className={`provider-status provider-status-${String(
                  verificationStatus
                ).toLowerCase()}`}
              >
                {formatStatus(verificationStatus)}
              </strong>
            </div>
          </div>

          {!providerVerified && (
            <div className="provider-verification-notice">
              <h3>
                {String(verificationStatus).toUpperCase() === "REJECTED"
                  ? "Registration document needs attention"
                  : "Verification pending"}
              </h3>

              <p>
                {String(verificationStatus).toUpperCase() === "REJECTED"
                  ? provider.rejectionReason ||
                  provider.rejectionNotes ||
                  "Please upload an updated registration document for review."
                  : "Your provider profile must be approved by an administrator before you can register resources or handle requests."}
              </p>

              <form className="provider-form" onSubmit={resubmitDocument}>
                <label className="provider-field">
                  Upload Updated Registration Document
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleDocumentChange}
                  />

                  {documentFile && (
                    <span className="provider-file-name">
                      Selected: {documentFile.name}
                    </span>
                  )}
                </label>

                <button
                  type="submit"
                  className="provider-primary-button"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Resubmit Document"}
                </button>
              </form>
            </div>
          )}

          {providerVerified && (
            <div className="provider-verification-notice provider-verification-approved">
              <h3>Provider verified</h3>
              <p>
                Your account is approved. You can register and manage emergency
                resources.
              </p>
            </div>
          )}
        </section>
      )}


      {/* REGISTER RESOURCE: resource creation and editing form */}
      {activeView === "register" && providerVerified && (
        <section className="provider-panel">
          <div className="provider-panel-header">
            <h2>{editingResourceId !== null ? "Edit Resource" : "Register a New Resource"}</h2>
            <p>
              Provide accurate resource details so citizens can find available
              emergency support.
            </p>
          </div>

          <form className="provider-form" onSubmit={saveResource}>
            <div className="provider-form-grid">
              <label className="provider-field">
                Resource Name *
                <input
                  name="name"
                  value={resourceForm.name}
                  onChange={updateResourceForm}
                  required
                />
              </label>

              <label className="provider-field">
                Category *
                <select
                  name="category"
                  value={resourceForm.category}
                  onChange={updateResourceForm}
                  required
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {formatStatus(category)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="provider-field">
                Quantity *
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  value={resourceForm.quantity}
                  onChange={updateResourceForm}
                  required
                />
              </label>

              <label className="provider-field">
                City *
                <input
                  name="city"
                  value={resourceForm.city}
                  onChange={updateResourceForm}
                  required
                />
              </label>

              <label className="provider-field provider-field-full">
                Address *
                <textarea
                  name="address"
                  value={resourceForm.address}
                  onChange={updateResourceForm}
                  rows={2}
                  required
                />
              </label>

              <label className="provider-field provider-field-full">
                Description
                <textarea
                  name="description"
                  value={resourceForm.description}
                  onChange={updateResourceForm}
                  rows={3}
                />
              </label>

              <label className="provider-checkbox-field">
                <input
                  name="available"
                  type="checkbox"
                  checked={Boolean(resourceForm.available)}
                  onChange={updateResourceForm}
                />
                Resource is currently available
              </label>
            </div>

            <div className="provider-form-actions">
              <button
                type="submit"
                className="provider-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingResourceId !== null
                    ? "Save Changes"
                    : "Register Resource"}
              </button>

              {editingResourceId !== null && (
                <button
                  type="button"
                  className="provider-secondary-button"
                  onClick={cancelEditing}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* ALL MY RESOURCES */}
      {activeView === "resources" && (
        <section className="provider-panel">
          {!provider && (
            <div className="provider-empty-state">
              <h3>Register your provider profile first</h3>
              <p>
                Submit your organization details before managing resources.
              </p>
              <button
                type="button"
                className="provider-primary-button"
                onClick={() => openView("register")}
              >
                Register as Provider
              </button>
            </div>
          )}

          {provider && !providerVerified && (
            <div className="provider-empty-state">
              <h3>Verification required</h3>
              <p>
                Your account must be approved before you can manage resources.
              </p>
              <button
                type="button"
                className="provider-primary-button"
                onClick={() => openView("register")}
              >
                View Verification Status
              </button>
            </div>
          )}

          {providerVerified && resources.length === 0 && (
            <div className="provider-empty-state">
              <h3>No resources registered yet</h3>
              <p>Add your first emergency resource to make it available to citizens.</p>
              <button
                type="button"
                className="provider-primary-button"
                onClick={() => openView("register")}
              >
                + Register Resource
              </button>
            </div>
          )}

          {providerVerified && resources.length > 0 && (
            <div className="resource-grid">
              {resources.map((resource) => (
                <article className="resource-card" key={resource.id}>
                  <div className="resource-card-header">
                    <span className="resource-category">
                      {formatStatus(resource.category)}
                    </span>

                    <span
                      className={`provider-status ${resource.available
                        ? "provider-status-approved"
                        : "provider-status-rejected"
                        }`}
                    >
                      {resource.available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <h3>{resource.name}</h3>

                  <p>
                    <strong>Quantity:</strong> {resource.quantity ?? 0}
                  </p>

                  <p>
                    <strong>Location:</strong>{" "}
                    {[resource.address, resource.city].filter(Boolean).join(", ") || "—"}
                  </p>

                  {resource.description && <p>{resource.description}</p>}

                  <div className="resource-card-actions">
                    <button
                      type="button"
                      className="provider-secondary-button"
                      onClick={() => {
                        setActiveView("register");
                        startEditing(resource);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="provider-secondary-button"
                      onClick={() => toggleResourceAvailability(resource)}
                    >
                      Mark {resource.available ? "Unavailable" : "Available"}
                    </button>

                    <button
                      type="button"
                      className="provider-danger-button"
                      onClick={() => deleteResource(resource.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* INCOMING REQUESTS */}
      {activeView === "requests" && (
        <section className="provider-panel">
          {!provider && (
            <div className="provider-empty-state">
              <h3>Register your provider profile first</h3>
              <p>You need a provider profile to manage incoming requests.</p>
              <button
                type="button"
                className="provider-primary-button"
                onClick={() => openView("register")}
              >
                Register as Provider
              </button>
            </div>
          )}

          {provider && !providerVerified && (
            <div className="provider-empty-state">
              <h3>Verification required</h3>
              <p>
                Incoming request management is available after your provider
                account is approved.
              </p>
            </div>
          )}

          {providerVerified && requests.length === 0 && (
            <div className="provider-empty-state">
              <h3>No incoming requests</h3>
              <p>New citizen requests will appear here when they are assigned to you.</p>
            </div>
          )}

          {providerVerified && requests.length > 0 && (
            <div className="request-list">
              {requests.map((request) => {
                const requestId = request.id;
                const status = String(request.status || "PENDING").toUpperCase();
                const isPending = status === "PENDING";
                const isAccepted = status === "ACCEPTED";

                return (
                  <article className="request-card" key={requestId}>
                    <div className="request-card-header">
                      <div>
                        <span className="request-category">
                          {formatStatus(
                            request.category ||
                            request.resourceCategory ||
                            request.resource?.category
                          )}
                        </span>

                        <h3>
                          {request.title ||
                            request.resourceName ||
                            request.resource?.name ||
                            "Resource Request"}
                        </h3>
                      </div>

                      <span className={`provider-status provider-status-${status.toLowerCase()}`}>
                        {formatStatus(status)}
                      </span>
                    </div>

                    <div className="request-details">
                      <p>
                        <strong>Quantity:</strong>{" "}
                        {request.quantity ?? request.requestedQuantity ?? "—"}
                      </p>

                      <p>
                        <strong>City:</strong> {request.city || "—"}
                      </p>

                      <p>
                        <strong>Address:</strong> {request.address || "—"}
                      </p>

                      {request.description && (
                        <p>
                          <strong>Details:</strong> {request.description}
                        </p>
                      )}

                      {request.reason && (
                        <p>
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                    </div>

                    {isPending && (
                      <div className="request-card-actions">
                        <button
                          type="button"
                          className="provider-primary-button"
                          onClick={() => updateRequest(requestId, "ACCEPTED")}
                        >
                          Accept
                        </button>

                        <label className="provider-field request-rejection-field">
                          Rejection reason
                          <input
                            type="text"
                            value={rejectionReasons[requestId] || ""}
                            onChange={(event) =>
                              setRejectionReasons((previous) => ({
                                ...previous,
                                [requestId]: event.target.value,
                              }))
                            }
                            placeholder="Explain why you cannot fulfill this request"
                          />
                        </label>

                        <button
                          type="button"
                          className="provider-danger-button"
                          onClick={() => updateRequest(requestId, "REJECTED")}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {isAccepted && (
                      <div className="request-card-actions">
                        <button
                          type="button"
                          className="provider-primary-button"
                          onClick={() => updateRequest(requestId, "COMPLETED")}
                        >
                          Mark Complete
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default ProviderDashboard;