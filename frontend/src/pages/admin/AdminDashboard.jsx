import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./AdminDashboard.css";
import "./Admin.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [screen, setScreen] = useState("dashboard");
  const [, setHistory] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [providerFilter, setProviderFilter] = useState("ALL");
  const [providerSearch, setProviderSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL");
  const [requestPriorityFilter, setRequestPriorityFilter] = useState("ALL");

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const token = localStorage.getItem("sahayak_token");

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("sahayak_user") || "null");
  } catch {
    user = null;
  }

  const loadDashboard = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      const [providerResponse, requestResponse] = await Promise.all([
        api.getAdminProviders(),
        api.getAdminRequests(),
      ]);

      setProviders(providerResponse.providers || []);
      setRequests(requestResponse.requests || []);
      setError("");
    } catch (loadError) {
      const message = loadError?.message || "Failed to load admin data.";
      setError(message);

      if (/authentication|required|token|unauthorized|forbidden/i.test(message)) {
        localStorage.removeItem("sahayak_token");
        localStorage.removeItem("sahayak_user");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
  if (!token || user?.role !== "ADMIN") {
    navigate("/admin/login");
    return;
  }

  const timeoutId = setTimeout(() => {
    void loadDashboard(false);
  }, 0);

  return () => clearTimeout(timeoutId);
  }, [token, user?.role, navigate, loadDashboard]);

  const getProviderStatus = (provider) =>
    String(
      provider?.verificationStatus ||
        (provider?.verified ? "APPROVED" : "PENDING")
    ).toUpperCase();

  const getStatusClass = (status) => {
    const value = String(status || "").toUpperCase();

    if (["APPROVED", "ACCEPTED", "COMPLETED", "FULFILLED"].includes(value)) {
      return "status-approved";
    }

    if (["REJECTED", "CANCELLED", "FAILED"].includes(value)) {
      return "status-rejected";
    }

    return "status-pending";
  };

  const formatStatus = (status) =>
    String(status || "PENDING").replaceAll("_", " ");

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
  };

  const formatCategory = (value) =>
    String(value || "Not specified").replaceAll("_", " ");

  const pendingProviders = useMemo(
    () => providers.filter((provider) => getProviderStatus(provider) === "PENDING"),
    [providers]
  );

  const visibleProviders = useMemo(() => {
    const query = providerSearch.trim().toLowerCase();

    return providers.filter((provider) => {
      const status = getProviderStatus(provider);
      const matchesStatus = providerFilter === "ALL" || status === providerFilter;
      const searchableText = [
        provider.organization,
        provider.type,
        provider.city,
        provider.address,
        provider.phone,
        provider.user?.name,
        provider.user?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [providers, providerFilter, providerSearch]);

  const visibleRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();

    return requests.filter((request) => {
      const status = String(request.status || "PENDING").toUpperCase();
      const priority = String(request.priority || "MEDIUM").toUpperCase();

      const matchesStatus =
        requestStatusFilter === "ALL" || status === requestStatusFilter;
      const matchesPriority =
        requestPriorityFilter === "ALL" || priority === requestPriorityFilter;

      const searchableText = [
        request.user?.name,
        request.user?.email,
        request.user?.city,
        request.resource?.name,
        request.resource?.category,
        request.resource?.provider?.organization,
        request.message,
        request.status,
        request.priority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesPriority &&
        (!query || searchableText.includes(query))
      );
    });
  }, [requests, requestSearch, requestStatusFilter, requestPriorityFilter]);

  const navigateToScreen = (nextScreen) => {
    setError("");
    setSuccess("");
    setHistory((previous) => [...previous, screen]);
    setScreen(nextScreen);
  };

  const goBack = () => {
    setError("");
    setSuccess("");
    setRejectTarget(null);
    setRejectionReason("");

    setHistory((previous) => {
      if (previous.length === 0) {
        setScreen("dashboard");
        return [];
      }

      const nextHistory = [...previous];
      const previousScreen = nextHistory.pop();
      setScreen(previousScreen || "dashboard");
      return nextHistory;
    });
  };

  const goToDashboard = () => {
    setScreen("dashboard");
    setHistory([]);
    setSelectedProvider(null);
    setSelectedResource(null);
    setSelectedRequest(null);
    setRejectTarget(null);
    setRejectionReason("");
    setError("");
    setSuccess("");
  };

  const openProvider = (provider) => {
    setSelectedProvider(provider);
    setSelectedResource(null);
    navigateToScreen("providerDetails");
  };

  const openResource = (resource) => {
    setSelectedResource(resource);
    navigateToScreen("resourceDetails");
  };

  const openRequest = (request) => {
    setSelectedRequest(request);
    navigateToScreen("requestDetails");
  };

  const approveProvider = async (providerId) => {
    setActionLoading(providerId);
    setError("");
    setSuccess("");

    try {
      await api.approveAdminProvider(providerId);
      setSuccess("Provider approved successfully.");
      await loadDashboard();
    } catch (actionError) {
      setError(actionError?.message || "Failed to approve provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const rejectProvider = async (event) => {
    event.preventDefault();

    if (!rejectTarget || rejectionReason.trim().length < 5) {
      setError("Enter a rejection reason of at least 5 characters.");
      return;
    }

    setActionLoading(rejectTarget);
    setError("");
    setSuccess("");

    try {
      await api.rejectAdminProvider(rejectTarget, rejectionReason.trim());
      setSuccess("Provider rejected. The profile has been retained.");
      setRejectTarget(null);
      setRejectionReason("");
      await loadDashboard();
    } catch (actionError) {
      setError(actionError?.message || "Failed to reject provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const openDocument = async (provider) => {
    setError("");

    try {
      const blob = await api.getAdminProviderDocument(provider.id);
      const url = URL.createObjectURL(blob);
      const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        const link = document.createElement("a");
        link.href = url;
        link.download =
          provider.verificationDocumentName || "provider-document";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (docError) {
      setError(docError?.message || "Unable to open provider document.");
    }
  };

  const logout = () => {
    localStorage.removeItem("sahayak_token");
    localStorage.removeItem("sahayak_user");
    navigate("/admin/login");
  };

  const renderStatus = (status) => (
    <span className={`pending-badge ${getStatusClass(status)}`}>
      {formatStatus(status)}
    </span>
  );

  const renderFeedback = () => (
    <>
      {error && (
        <div className="admin-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      {success && (
        <div className="admin-alert-success" role="status">
          <span aria-hidden="true">✓</span> {success}
        </div>
      )}
    </>
  );

  const renderPageHeading = (title, description, eyebrow = "SAHAYAK ADMIN") => (
    <div className="admin-page-heading">
      <div className="admin-page-heading-copy">
        <p className="admin-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="admin-page-description">{description}</p>
      </div>
      <button
        type="button"
        className="admin-refresh-button"
        onClick={() => loadDashboard(true)}
        disabled={loading || actionLoading !== null}
      >
        {loading ? "Refreshing..." : "↻ Refresh"}
      </button>
    </div>
  );

  const renderBackButton = (label = "Back") => (
    <button type="button" className="cancel-button back-button" onClick={goBack}>
      ← {label}
    </button>
  );

  const renderLoading = (message = "Loading admin data...") => (
    <div className="admin-empty-state">
      <div className="loading-spinner" />
      <p>{message}</p>
    </div>
  );

  const renderEmpty = (title, description, icon = "📂") => (
    <div className="admin-empty-state">
      <div className="admin-empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );

  const renderDashboard = () => (
    <>
      {renderPageHeading(
        "Admin Dashboard",
        "Choose a section to manage provider verification and citizen emergency requests.",
        "ADMIN CONTROL CENTER"
      )}

      <section className="admin-stats" aria-label="Dashboard summary">
        <article className="admin-stat-card">
          <div className="admin-stat-icon pending" aria-hidden="true">⏳</div>
          <div className="admin-stat-copy">
            <p>Pending Provider Requests</p>
            <h3>{pendingProviders.length}</h3>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon online" aria-hidden="true">🏥</div>
          <div className="admin-stat-copy">
            <p>All Providers</p>
            <h3>{providers.length}</h3>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon admin" aria-hidden="true">📋</div>
          <div className="admin-stat-copy">
            <p>Citizen Requests</p>
            <h3>{requests.length}</h3>
          </div>
        </article>
      </section>

      <section className="admin-navigation" aria-label="Admin navigation">
        <button
          type="button"
          className="admin-nav-card"
          onClick={() => navigateToScreen("providerRequests")}
        >
          <span className="admin-nav-icon providers-icon" aria-hidden="true">📝</span>
          <span className="admin-nav-copy">
            <strong>Provider Profile Requests</strong>
            <span>Review pending applications and verify submitted documents.</span>
            <span className="admin-nav-count">{pendingProviders.length} pending</span>
          </span>
          <span className="admin-nav-arrow" aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          className="admin-nav-card"
          onClick={() => navigateToScreen("allProviders")}
        >
          <span className="admin-nav-icon providers-icon" aria-hidden="true">🏥</span>
          <span className="admin-nav-copy">
            <strong>All Providers</strong>
            <span>Browse all provider profiles, verification status and resources.</span>
            <span className="admin-nav-count">{providers.length} providers</span>
          </span>
          <span className="admin-nav-arrow" aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          className="admin-nav-card"
          onClick={() => navigateToScreen("citizenRequests")}
        >
          <span className="admin-nav-icon requests-icon" aria-hidden="true">📋</span>
          <span className="admin-nav-copy">
            <strong>Citizen Requests</strong>
            <span>Review emergency requests and open their individual details.</span>
            <span className="admin-nav-count">{requests.length} requests</span>
          </span>
          <span className="admin-nav-arrow" aria-hidden="true">›</span>
        </button>
      </section>

      <footer className="admin-footer">
        <span>Sahayak Admin Console</span>
        <span>Provider verification · Emergency request monitoring</span>
      </footer>
    </>
  );

  const renderProviderRequests = () => (
    <>
      {renderPageHeading(
        "Provider Profile Requests",
        "Only provider profiles awaiting verification are shown here."
      )}
      {renderFeedback()}
      {renderBackButton("Dashboard")}

      <section className="provider-section">
        <div className="provider-section-header">
          <div>
            <h2>Pending Verification Applications</h2>
            <p>Review the submitted proof before approving an application.</p>
          </div>
          <span className="pending-count">{pendingProviders.length} Pending</span>
        </div>

        {loading ? (
          renderLoading()
        ) : pendingProviders.length === 0 ? (
          renderEmpty(
            "No pending applications",
            "New provider verification applications will appear here.",
            "✓"
          )
        ) : (
          <div className="provider-list">
            {pendingProviders.map((provider) => (
              <article className="provider-card" key={provider.id}>
                <div className="provider-card-main">
                  <div className="organization-avatar">
                    {provider.organization?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                  <div className="organization-details">
                    <h3>{provider.organization || "Unnamed organization"}</h3>
                    <p>{provider.user?.name || "Name unavailable"}</p>
                    <p>{provider.user?.email || "Email unavailable"}</p>
                    <p>{provider.type || "Type not specified"} · {provider.city || "City not provided"}</p>
                    <p>{provider.phone || "No phone"} · {provider.address || "No address"}</p>
                  </div>
                  <div className="provider-card-status">{renderStatus("PENDING")}</div>
                </div>

                <div className="provider-card-document">
                  <strong>Verification document</strong>
                  {provider.verificationDocumentName ? (
                    <>
                      <span>{provider.verificationDocumentName}</span>
                      <button
                        type="button"
                        className="document-button"
                        onClick={() => openDocument(provider)}
                      >
                        View document
                      </button>
                    </>
                  ) : (
                    <span className="muted-text">No document uploaded</span>
                  )}
                </div>

                <div className="provider-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => openProvider(provider)}
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    className="approve-button"
                    disabled={
                      actionLoading === provider.id ||
                      !provider.verificationDocumentName
                    }
                    onClick={() => approveProvider(provider.id)}
                  >
                    {actionLoading === provider.id ? "Saving..." : "✓ Approve"}
                  </button>
                  <button
                    type="button"
                    className="reject-button"
                    disabled={actionLoading === provider.id}
                    onClick={() => {
                      setRejectTarget(provider.id);
                      setRejectionReason("");
                      setError("");
                      setSuccess("");
                    }}
                  >
                    ✕ Reject
                  </button>
                </div>

                {rejectTarget === provider.id && (
                  <form className="rejection-form" onSubmit={rejectProvider}>
                    <label htmlFor={`rejection-${provider.id}`}>
                      Reason for rejection
                    </label>
                    <textarea
                      id={`rejection-${provider.id}`}
                      rows={3}
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      required
                      minLength={5}
                      placeholder="Explain what needs correction"
                    />
                    <div className="rejection-form-actions">
                      <button
                        type="submit"
                        className="reject-button"
                        disabled={actionLoading === provider.id}
                      >
                        {actionLoading === provider.id ? "Saving..." : "Confirm rejection"}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                          setRejectTarget(null);
                          setRejectionReason("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderAllProviders = () => (
    <>
      {renderPageHeading(
        "All Providers",
        "Search and filter all registered providers, including pending, approved and rejected profiles."
      )}
      {renderFeedback()}
      {renderBackButton("Dashboard")}

      <section className="provider-section">
        <div className="provider-section-header">
          <div>
            <h2>Provider Directory</h2>
            <p>Select a provider to open their profile and resources.</p>
          </div>
          <span className="pending-count">{providers.length} Total</span>
        </div>

        <div className="provider-filter-bar">
          <label htmlFor="provider-search">Search providers</label>
          <input
            id="provider-search"
            type="search"
            value={providerSearch}
            onChange={(event) => setProviderSearch(event.target.value)}
            placeholder="Organization, contact, email, city..."
          />
          <label htmlFor="provider-filter">Status</label>
          <select
            id="provider-filter"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {loading ? (
          renderLoading()
        ) : visibleProviders.length === 0 ? (
          renderEmpty(
            "No providers found",
            "Try changing your search or status filter.",
            "🏥"
          )
        ) : (
          <div className="provider-list">
            {visibleProviders.map((provider) => (
              <button
                type="button"
                className="provider-card provider-card-clickable"
                key={provider.id}
                onClick={() => openProvider(provider)}
              >
                <div className="provider-card-main">
                  <div className="organization-avatar">
                    {provider.organization?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                  <div className="organization-details">
                    <h3>{provider.organization || "Unnamed organization"}</h3>
                    <p>{provider.user?.name || "Name unavailable"} · {provider.user?.email || "Email unavailable"}</p>
                    <p>{provider.type || "Type not specified"} · {provider.city || "City not provided"}</p>
                    <p>{provider.resources?.length || 0} resource(s)</p>
                  </div>
                  <div className="provider-card-status">
                    {renderStatus(getProviderStatus(provider))}
                  </div>
                  <span className="admin-nav-arrow" aria-hidden="true">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderProviderDetails = () => {
    if (!selectedProvider) {
      return (
        <>
          {renderPageHeading("Provider Details", "Provider information is unavailable.")}
          {renderFeedback()}
          {renderBackButton("All Providers")}
          {renderEmpty("Provider not selected", "Go back and select a provider.")}
        </>
      );
    }

    const provider =
      providers.find((item) => item.id === selectedProvider.id) || selectedProvider;
    const status = getProviderStatus(provider);
    const resources = provider.resources || [];

    return (
      <>
        {renderPageHeading(
          "Provider Details",
          "Review the provider profile and open any listed resource."
        )}
        {renderFeedback()}
        {renderBackButton("All Providers")}

        <section className="provider-section">
          <div className="provider-section-header">
            <div>
              <h2>{provider.organization || "Unnamed organization"}</h2>
              <p>Provider ID: {provider.id}</p>
            </div>
            {renderStatus(status)}
          </div>

          <div className="detail-grid">
            <div className="detail-item"><span>Contact name</span><strong>{provider.user?.name || "—"}</strong></div>
            <div className="detail-item"><span>Email</span><strong>{provider.user?.email || "—"}</strong></div>
            <div className="detail-item"><span>Organization type</span><strong>{provider.type || "—"}</strong></div>
            <div className="detail-item"><span>Phone</span><strong>{provider.phone || "—"}</strong></div>
            <div className="detail-item"><span>City</span><strong>{provider.city || "—"}</strong></div>
            <div className="detail-item"><span>Address</span><strong>{provider.address || "—"}</strong></div>
            <div className="detail-item"><span>Created</span><strong>{formatDate(provider.createdAt)}</strong></div>
            <div className="detail-item"><span>Verified at</span><strong>{formatDate(provider.verifiedAt)}</strong></div>
          </div>

          <div className="detail-document">
            <h3>Verification document</h3>
            {provider.verificationDocumentName ? (
              <div className="document-cell">
                <span>{provider.verificationDocumentName}</span>
                <button
                  type="button"
                  className="document-button"
                  onClick={() => openDocument(provider)}
                >
                  View document
                </button>
              </div>
            ) : (
              <p className="muted-text">No verification document uploaded.</p>
            )}
          </div>

          {provider.verificationRejectionReason && (
            <div className="rejection-reason">
              <strong>Rejection reason:</strong> {provider.verificationRejectionReason}
            </div>
          )}

          {status === "PENDING" && (
            <div className="provider-actions detail-actions">
              <button
                type="button"
                className="approve-button"
                disabled={actionLoading === provider.id || !provider.verificationDocumentName}
                onClick={() => approveProvider(provider.id)}
              >
                {actionLoading === provider.id ? "Saving..." : "✓ Approve provider"}
              </button>
              <button
                type="button"
                className="reject-button"
                disabled={actionLoading === provider.id}
                onClick={() => {
                  setRejectTarget(provider.id);
                  setRejectionReason("");
                  setError("");
                  setSuccess("");
                }}
              >
                ✕ Reject provider
              </button>
            </div>
          )}

          {rejectTarget === provider.id && (
            <form className="rejection-form" onSubmit={rejectProvider}>
              <label htmlFor={`detail-rejection-${provider.id}`}>Reason for rejection</label>
              <textarea
                id={`detail-rejection-${provider.id}`}
                rows={3}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                required
                minLength={5}
                placeholder="Explain what needs correction"
              />
              <div className="rejection-form-actions">
                <button type="submit" className="reject-button" disabled={actionLoading === provider.id}>
                  {actionLoading === provider.id ? "Saving..." : "Confirm rejection"}
                </button>
                <button type="button" className="cancel-button" onClick={() => { setRejectTarget(null); setRejectionReason(""); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="provider-section">
          <div className="provider-section-header">
            <div>
              <h2>Provider Resources</h2>
              <p>Choose a resource to see its complete details. Resource details are view-only.</p>
            </div>
            <span className="pending-count">{resources.length} Resource(s)</span>
          </div>

          {resources.length === 0 ? (
            renderEmpty("No resources listed", "This provider has not added any resources.", "📦")
          ) : (
            <div className="resource-card-grid">
              {resources.map((resource) => (
                <button
                  type="button"
                  className="resource-card"
                  key={resource.id}
                  onClick={() => openResource(resource)}
                >
                  <div className="resource-card-top">
                    <span className="resource-card-icon" aria-hidden="true">📦</span>
                    <span className={`pending-badge ${resource.available ? "status-approved" : "status-rejected"}`}>
                      {resource.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <h3>{resource.name || "Unnamed resource"}</h3>
                  <p>{formatCategory(resource.category)}</p>
                  <p>Quantity: {resource.quantity ?? "—"}</p>
                  <p>{resource.city || provider.city || "City not provided"}</p>
                  <span className="resource-card-link">View resource details →</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </>
    );
  };

  const renderResourceDetails = () => {
    if (!selectedResource) {
      return (
        <>
          {renderPageHeading("Resource Details", "Resource information is unavailable.")}
          {renderBackButton("Provider Details")}
          {renderEmpty("Resource not selected", "Go back and select a resource.")}
        </>
      );
    }

    const resource = selectedResource;
    const provider = resource.provider || selectedProvider;

    return (
      <>
        {renderPageHeading(
          "Resource Details",
          "Complete information about this resource. This screen is read-only."
        )}
        {renderBackButton("Provider Details")}

        <section className="provider-section">
          <div className="provider-section-header">
            <div>
              <h2>{resource.name || "Unnamed resource"}</h2>
              <p>Resource ID: {resource.id}</p>
            </div>
            <span className={`pending-badge ${resource.available ? "status-approved" : "status-rejected"}`}>
              {resource.available ? "Available" : "Unavailable"}
            </span>
          </div>

          <div className="detail-grid">
            <div className="detail-item"><span>Resource name</span><strong>{resource.name || "—"}</strong></div>
            <div className="detail-item"><span>Category</span><strong>{formatCategory(resource.category)}</strong></div>
            <div className="detail-item"><span>Quantity</span><strong>{resource.quantity ?? "—"}</strong></div>
            <div className="detail-item"><span>Availability</span><strong>{resource.available ? "Available" : "Unavailable"}</strong></div>
            <div className="detail-item"><span>City</span><strong>{resource.city || "—"}</strong></div>
            <div className="detail-item"><span>Address</span><strong>{resource.address || "—"}</strong></div>
            <div className="detail-item"><span>Provider</span><strong>{provider?.organization || "—"}</strong></div>
            <div className="detail-item"><span>Last updated</span><strong>{formatDate(resource.updatedAt)}</strong></div>
            <div className="detail-item"><span>Created</span><strong>{formatDate(resource.createdAt)}</strong></div>
          </div>

          <div className="detail-document">
            <h3>Description</h3>
            <p className="detail-description">{resource.description || "No description provided."}</p>
          </div>

          <p className="read-only-note">🔒 Admin access to resource details is view-only.</p>
        </section>
      </>
    );
  };

  const renderCitizenRequests = () => (
    <>
      {renderPageHeading(
        "Citizen Requests",
        "Browse all emergency requests and select a request to view its full details."
      )}
      {renderFeedback()}
      {renderBackButton("Dashboard")}

      <section className="provider-section">
        <div className="provider-section-header">
          <div>
            <h2>All Emergency Requests</h2>
            <p>Requests remain listed regardless of their current status.</p>
          </div>
          <span className="pending-count">{requests.length} Total</span>
        </div>

        <div className="provider-filter-bar request-filter-bar">
          <label htmlFor="request-search">Search requests</label>
          <input
            id="request-search"
            type="search"
            value={requestSearch}
            onChange={(event) => setRequestSearch(event.target.value)}
            placeholder="Citizen, resource, provider, message..."
          />

          <label htmlFor="request-status-filter">Status</label>
          <select
            id="request-status-filter"
            value={requestStatusFilter}
            onChange={(event) => setRequestStatusFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <label htmlFor="request-priority-filter">Priority</label>
          <select
            id="request-priority-filter"
            value={requestPriorityFilter}
            onChange={(event) => setRequestPriorityFilter(event.target.value)}
          >
            <option value="ALL">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        {loading ? (
          renderLoading("Loading citizen requests...")
        ) : visibleRequests.length === 0 ? (
          renderEmpty(
            "No requests found",
            "No requests match the selected search and filters.",
            "📋"
          )
        ) : (
          <div className="request-card-list">
            {visibleRequests.map((request) => (
              <button
                type="button"
                className="request-card"
                key={request.id}
                onClick={() => openRequest(request)}
              >
                <div className="request-card-header">
                  <div>
                    <h3>Request #{request.id}</h3>
                    <p>{request.resource?.name || "Resource unavailable"}</p>
                  </div>
                  {renderStatus(request.status)}
                </div>
                <div className="request-card-meta">
                  <span><strong>Citizen:</strong> {request.user?.name || "Unknown"}</span>
                  <span><strong>Provider:</strong> {request.resource?.provider?.organization || "Unavailable"}</span>
                  <span><strong>Quantity:</strong> {request.quantity ?? "—"}</span>
                  <span><strong>Priority:</strong> {formatStatus(request.priority || "MEDIUM")}</span>
                  <span><strong>Submitted:</strong> {formatDate(request.createdAt)}</span>
                </div>
                {request.message && <p className="request-card-message">{request.message}</p>}
                <span className="resource-card-link">View request details →</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderRequestDetails = () => {
    if (!selectedRequest) {
      return (
        <>
          {renderPageHeading("Request Details", "Request information is unavailable.")}
          {renderBackButton("Citizen Requests")}
          {renderEmpty("Request not selected", "Go back and select a citizen request.", "📋")}
        </>
      );
    }

    const request = selectedRequest;

    return (
      <>
        {renderPageHeading(
          `Request #${request.id} Details`,
          "Review the citizen, resource, provider and request information."
        )}
        {renderFeedback()}
        {renderBackButton("Citizen Requests")}

        <section className="provider-section">
          <div className="provider-section-header">
            <div>
              <h2>Emergency Request</h2>
              <p>Submitted: {formatDate(request.createdAt)}</p>
            </div>
            {renderStatus(request.status)}
          </div>

          <div className="detail-grid">
            <div className="detail-item"><span>Request ID</span><strong>{request.id}</strong></div>
            <div className="detail-item"><span>Status</span><strong>{formatStatus(request.status)}</strong></div>
            <div className="detail-item"><span>Priority</span><strong>{formatStatus(request.priority || "MEDIUM")}</strong></div>
            <div className="detail-item"><span>Quantity requested</span><strong>{request.quantity ?? "—"}</strong></div>
            <div className="detail-item"><span>Citizen name</span><strong>{request.user?.name || "Unknown"}</strong></div>
            <div className="detail-item"><span>Citizen email</span><strong>{request.user?.email || "—"}</strong></div>
            <div className="detail-item"><span>Citizen city</span><strong>{request.user?.city || "—"}</strong></div>
            <div className="detail-item"><span>Resource</span><strong>{request.resource?.name || "Unavailable"}</strong></div>
            <div className="detail-item"><span>Resource category</span><strong>{formatCategory(request.resource?.category)}</strong></div>
            <div className="detail-item"><span>Resource city</span><strong>{request.resource?.city || "—"}</strong></div>
            <div className="detail-item"><span>Provider organization</span><strong>{request.resource?.provider?.organization || "Unavailable"}</strong></div>
            <div className="detail-item"><span>Provider contact</span><strong>{request.resource?.provider?.phone || "—"}</strong></div>
            <div className="detail-item"><span>Last updated</span><strong>{formatDate(request.updatedAt)}</strong></div>
          </div>

          <div className="detail-document">
            <h3>Citizen message</h3>
            <p className="detail-description">{request.message || "No message provided."}</p>
          </div>

          {request.rejectionReason && (
            <div className="rejection-reason">
              <strong>Rejection reason:</strong> {request.rejectionReason}
            </div>
          )}
        </section>
      </>
    );
  };

  const renderCurrentScreen = () => {
    switch (screen) {
      case "providerRequests":
        return renderProviderRequests();
      case "allProviders":
        return renderAllProviders();
      case "providerDetails":
        return renderProviderDetails();
      case "resourceDetails":
        return renderResourceDetails();
      case "citizenRequests":
        return renderCitizenRequests();
      case "requestDetails":
        return renderRequestDetails();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <button
            type="button"
            className="admin-brand admin-brand-button"
            onClick={goToDashboard}
            aria-label="Go to admin dashboard"
          >
            <span className="admin-brand-icon" aria-hidden="true">🚑</span>
            <span className="admin-brand-copy">
              <span className="admin-brand-title">Sahayak Admin</span>
              <span className="admin-brand-subtitle">Provider and emergency request management</span>
            </span>
          </button>

          <div className="admin-header-actions">
            <span className="admin-welcome">{user?.name || "Administrator"}</span>
            {screen !== "dashboard" && (
              <button
                type="button"
                className="admin-refresh-button"
                onClick={goToDashboard}
              >
                Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="admin-logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {renderFeedback()}
        {loading && screen === "dashboard" ? (
          renderLoading()
        ) : (
          renderCurrentScreen()
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
