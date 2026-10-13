import { useEffect, useState } from "react";
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
  const [filter, setFilter] = useState("ALL");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeSection, setActiveSection] = useState("providers");

  const token = localStorage.getItem("sahayak_token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("sahayak_user") || "null");
  } catch {
    user = null;
  }

  const colors = {
    ink: "#172033",
    muted: "#687386",
    line: "#e2e8f0",
    primary: "#3457d5",
    canvas: "#f4f7fb",
    white: "#ffffff",
    green: "#166534",
    greenBg: "#dcfce7",
    red: "#991b1b",
    redBg: "#fee2e2",
    amber: "#92400e",
    amberBg: "#fef3c7",
  };

  const loadDashboard = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const [providerResponse, requestResponse] = await Promise.all([
        api.getAdminProviders(),
        api.getAdminRequests(),
      ]);

      setProviders(providerResponse.providers || []);
      setRequests(requestResponse.requests || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load admin data.");

      if (/authentication|required|token/i.test(loadError.message)) {
        localStorage.removeItem("sahayak_token");
        localStorage.removeItem("sahayak_user");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }

    loadDashboard(true);
  }, []);

  const approveProvider = async (providerId) => {
    setActionLoading(providerId);
    setError("");
    setSuccess("");

    try {
      await api.approveAdminProvider(providerId);
      setSuccess("Provider approved.");
      await loadDashboard();
    } catch (actionError) {
      setError(actionError.message);
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
      setSuccess("Provider rejection and reason saved. The provider profile was retained.");
      setRejectTarget(null);
      setRejectionReason("");
      await loadDashboard();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openDocument = async (provider) => {
    setError("");

    try {
      const blob = await api.getAdminProviderDocument(provider.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = provider.verificationDocumentName || "provider-document";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (docError) {
      setError(docError.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("sahayak_token");
    localStorage.removeItem("sahayak_user");
    navigate("/admin/login");
  };

  const visibleProviders =
    filter === "ALL"
      ? providers
      : providers.filter(
          (provider) =>
            (provider.verificationStatus ||
              (provider.verified ? "APPROVED" : "PENDING")) === filter
        );

  const pendingCount = providers.filter(
    (provider) =>
      (provider.verificationStatus ||
        (provider.verified ? "APPROVED" : "PENDING")) === "PENDING"
  ).length;

  const rejectedCount = providers.filter(
    (provider) => provider.verificationStatus === "REJECTED"
  ).length;

  const jumpToSection = (section) => {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const sectionStyle = {
    background: colors.white,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    marginTop: 18,
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(23,32,51,0.04)",
    scrollMarginTop: 18,
  };

  const sectionHeaderStyle = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 20px",
    borderBottom: `1px solid ${colors.line}`,
  };

  const tableWrapStyle = {
    width: "100%",
    overflowX: "auto",
  };

  const tableStyle = {
    width: "100%",
    minWidth: 850,
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 13,
  };

  const cellStyle = {
    padding: "12px 14px",
    borderBottom: `1px solid ${colors.line}`,
    verticalAlign: "top",
    lineHeight: 1.5,
  };

  const navCardStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    minWidth: 0,
    padding: "17px 19px",
    textAlign: "left",
    border: `1px solid ${active ? colors.primary : colors.line}`,
    borderRadius: 13,
    background: active ? "#eef2ff" : colors.white,
    color: colors.ink,
    boxShadow: active ? "0 0 0 2px rgba(52,87,213,0.08)" : "none",
    cursor: "pointer",
  });

  const badgeStyle = (status) => {
    if (status === "APPROVED" || status === "ACCEPTED" || status === "COMPLETED") {
      return { background: colors.greenBg, color: colors.green };
    }
    if (status === "REJECTED") {
      return { background: colors.redBg, color: colors.red };
    }
    return { background: colors.amberBg, color: colors.amber };
  };

  const buttonStyle = (background, disabled = false) => ({
    border: "none",
    borderRadius: 7,
    padding: "8px 11px",
    background,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div
      className="admin-dashboard"
      style={{
        minHeight: "100vh",
        background: colors.canvas,
        color: colors.ink,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <header
        className="admin-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: colors.white,
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        <div
          className="admin-header-content"
          style={{ maxWidth: 1500, margin: "0 auto", padding: "12px 22px" }}
        >
          <div className="admin-brand">
            <div className="admin-brand-icon">🚑</div>
            <div>
              <h1 style={{ fontSize: 21, margin: 0 }}>Sahayak Admin</h1>
              <p style={{ margin: "3px 0 0", color: colors.muted, fontSize: 12 }}>
                Provider and emergency request management
              </p>
            </div>
          </div>

          <div className="admin-header-actions">
            <span className="admin-welcome">{user?.name || "Administrator"}</span>
            <button onClick={logout} className="admin-logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main
        className="admin-main"
        style={{ maxWidth: 1500, padding: "22px 22px 40px", margin: "0 auto" }}
      >
        <div
          className="admin-page-heading"
          style={{ marginBottom: 18, alignItems: "center" }}
        >
          <div>
            <p
              style={{
                color: colors.primary,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 1.2,
                margin: "0 0 5px",
                textTransform: "uppercase",
              }}
            >
              ADMIN CONTROL CENTER
            </p>
            <h2 style={{ margin: 0, fontSize: 26, letterSpacing: -0.6 }}>
              Dashboard
            </h2>
            <p style={{ margin: "5px 0 0", color: colors.muted, fontSize: 13 }}>
              Manage provider verification and monitor citizen emergency requests.
            </p>
          </div>

          <button
            onClick={() => loadDashboard(true)}
            className="admin-refresh-button"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div
          className="admin-stats"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {[
            { label: "Pending Providers", value: pendingCount, icon: "⏳", tone: "pending" },
            { label: "All Providers", value: providers.length, icon: "✓", tone: "online" },
            { label: "Citizen Requests", value: requests.length, icon: "📋", tone: "admin" },
          ].map((stat) => (
            <div
              className="admin-stat-card"
              key={stat.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "15px 17px",
                background: colors.white,
                border: `1px solid ${colors.line}`,
                borderRadius: 12,
                minWidth: 0,
              }}
            >
              <div className={`admin-stat-icon ${stat.tone}`}>{stat.icon}</div>
              <div>
                <p style={{ margin: 0, color: colors.muted, fontSize: 12 }}>
                  {stat.label}
                </p>
                <h3 style={{ margin: "4px 0 0", fontSize: 25 }}>{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div
            className="admin-error"
            role="alert"
            style={{ marginBottom: 12, padding: 12, borderRadius: 9 }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div
            className="alert success"
            role="status"
            style={{ marginBottom: 12, padding: 12, borderRadius: 9 }}
          >
            {success}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={() => jumpToSection("providers-section")}
            aria-pressed={activeSection === "providers"}
            style={navCardStyle(activeSection === "providers")}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 45,
                height: 45,
                flexShrink: 0,
                borderRadius: 11,
                background: "#dbeafe",
                fontSize: 23,
              }}
            >
              🏥
            </span>
            <span style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: 15 }}>
                Providers
              </strong>
              <span style={{ display: "block", color: colors.muted, fontSize: 12, marginTop: 4 }}>
                Verify organizations and review submitted resources.
              </span>
            </span>
            <span style={{ fontSize: 20, color: colors.primary }}>›</span>
          </button>

          <button
            type="button"
            onClick={() => jumpToSection("requests-section")}
            aria-pressed={activeSection === "requests"}
            style={navCardStyle(activeSection === "requests")}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 45,
                height: 45,
                flexShrink: 0,
                borderRadius: 11,
                background: "#dcfce7",
                fontSize: 23,
              }}
            >
              📋
            </span>
            <span style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: 15 }}>
                Citizen Requests
              </strong>
              <span style={{ display: "block", color: colors.muted, fontSize: 12, marginTop: 4 }}>
                Track emergency requests and their current status.
              </span>
            </span>
            <span style={{ fontSize: 20, color: colors.primary }}>›</span>
          </button>
        </div>

        <section
          id="providers-section"
          className="provider-section"
          style={sectionStyle}
        >
          <div className="provider-section-header" style={sectionHeaderStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>All Provider Profiles</h2>
              <p style={{ margin: "5px 0 0", color: colors.muted, fontSize: 12 }}>
                Review organization details, verification documents, and resources.
              </p>
            </div>
            <div className="pending-count">
              {pendingCount} Pending · {rejectedCount} Rejected
            </div>
          </div>

          <div
            style={{
              padding: "12px 18px",
              background: "#fafbfe",
              borderBottom: `1px solid ${colors.line}`,
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 650 }}>
              Filter providers{" "}
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                style={{
                  marginLeft: 8,
                  padding: "8px 10px",
                  border: `1px solid ${colors.line}`,
                  borderRadius: 7,
                  background: colors.white,
                }}
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="admin-empty-state">
              <div className="loading-spinner" />
              <p>Loading admin data...</p>
            </div>
          ) : visibleProviders.length === 0 ? (
            <div className="admin-empty-state">
              <h3>No providers in this filter</h3>
              <p>Provider profiles will appear here after submission.</p>
            </div>
          ) : (
            <div className="provider-table-wrapper" style={tableWrapStyle}>
              <table className="provider-table" style={tableStyle}>
                <thead>
                  <tr>
                    {[
                      "Organization / Contact",
                      "Type / City",
                      "Verification proof",
                      "Resources",
                      "Status / Reason",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          ...cellStyle,
                          position: "sticky",
                          top: 0,
                          background: "#f8faff",
                          color: colors.muted,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleProviders.map((provider) => {
                    const status =
                      provider.verificationStatus ||
                      (provider.verified ? "APPROVED" : "PENDING");

                    return (
                      <tr key={provider.id}>
                        <td style={cellStyle}>
                          <div className="organization-cell">
                            <div className="organization-avatar">
                              {provider.organization?.charAt(0)?.toUpperCase() || "P"}
                            </div>
                            <div>
                              <strong>{provider.organization}</strong>
                              <span>{provider.user?.name} · {provider.user?.email}</span>
                              <span>
                                {provider.phone || "No phone"} · {provider.address || "No address"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={cellStyle}>
                          <strong>{provider.type}</strong>
                          <br />
                          <span className="city-text">📍 {provider.city}</span>
                        </td>
                        <td style={cellStyle}>
                          {provider.verificationDocumentName ? (
                            <>
                              <span>{provider.verificationDocumentName}</span>
                              <br />
                              <button
                                className="admin-refresh-button"
                                onClick={() => openDocument(provider)}
                              >
                                View document
                              </button>
                            </>
                          ) : (
                            <span>Not uploaded</span>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {provider.resources?.length ? (
                            <details>
                              <summary>{provider.resources.length} resource(s)</summary>
                              {provider.resources.map((resource) => (
                                <div
                                  key={resource.id}
                                  style={{
                                    padding: "6px 0",
                                    borderBottom: `1px solid ${colors.line}`,
                                  }}
                                >
                                  <strong>{resource.name}</strong>
                                  <br />
                                  <span>
                                    {resource.category.replaceAll("_", " ")} · Qty{" "}
                                    {resource.quantity} ·{" "}
                                    {resource.available ? "Available" : "Unavailable"}
                                  </span>
                                </div>
                              ))}
                            </details>
                          ) : (
                            "No resources"
                          )}
                        </td>
                        <td style={cellStyle}>
                          <span
                            className="pending-badge"
                            style={{
                              ...badgeStyle(status),
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {status}
                          </span>
                          {provider.verificationRejectionReason && (
                            <p style={{ maxWidth: 230, whiteSpace: "normal" }}>
                              <strong>Reason:</strong>{" "}
                              {provider.verificationRejectionReason}
                            </p>
                          )}
                        </td>
                        <td style={cellStyle}>
                          <div className="provider-actions">
                            {status === "PENDING" && (
                              <>
                                <button
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
                                  className="reject-button"
                                  disabled={actionLoading === provider.id}
                                  onClick={() => {
                                    setRejectTarget(provider.id);
                                    setRejectionReason("");
                                  }}
                                >
                                  ✕ Reject
                                </button>
                              </>
                            )}
                            {status === "REJECTED" && <span>Awaiting resubmission</span>}
                            {status === "APPROVED" && <span>Verified</span>}
                          </div>

                          {rejectTarget === provider.id && (
                            <form
                              onSubmit={rejectProvider}
                              style={{ marginTop: 10, minWidth: 200 }}
                            >
                              <label>
                                Reason for rejection
                                <textarea
                                  rows={3}
                                  value={rejectionReason}
                                  onChange={(event) => setRejectionReason(event.target.value)}
                                  required
                                  minLength={5}
                                  placeholder="Explain what needs correction"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    margin: "6px 0",
                                    padding: 8,
                                    border: `1px solid ${colors.line}`,
                                    borderRadius: 7,
                                    font: "inherit",
                                  }}
                                />
                              </label>
                              <button
                                className="reject-button"
                                disabled={actionLoading === provider.id}
                              >
                                {actionLoading === provider.id ? "Saving..." : "Confirm rejection"}
                              </button>
                              <button
                                type="button"
                                className="admin-refresh-button"
                                onClick={() => {
                                  setRejectTarget(null);
                                  setRejectionReason("");
                                }}
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          id="requests-section"
          className="provider-section"
          style={sectionStyle}
        >
          <div className="provider-section-header" style={sectionHeaderStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>All Citizen Emergency Requests</h2>
              <p style={{ margin: "5px 0 0", color: colors.muted, fontSize: 12 }}>
                Requests remain visible after acceptance, rejection, or completion.
              </p>
            </div>
            <div className="pending-count">{requests.length} Total</div>
          </div>

          {loading ? (
            <div className="admin-empty-state"><p>Loading requests...</p></div>
          ) : requests.length === 0 ? (
            <div className="admin-empty-state"><h3>No citizen requests yet</h3></div>
          ) : (
            <div className="provider-table-wrapper" style={tableWrapStyle}>
              <table className="provider-table" style={tableStyle}>
                <thead>
                  <tr>
                    {["Citizen", "Resource / Provider", "Request", "Status", "Rejection reason", "Submitted"].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          ...cellStyle,
                          background: "#f8faff",
                          color: colors.muted,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td style={cellStyle}>
                        <strong>{request.user?.name || "Unknown"}</strong>
                        <span style={{ display: "block" }}>{request.user?.email}</span>
                        <span style={{ display: "block" }}>{request.user?.city || "City not provided"}</span>
                      </td>
                      <td style={cellStyle}>
                        <strong>{request.resource?.name}</strong>
                        <span style={{ display: "block" }}>
                          {request.resource?.provider?.organization || "Provider unavailable"}
                        </span>
                        <span style={{ display: "block" }}>{request.resource?.city}</span>
                      </td>
                      <td style={cellStyle}>
                        Qty {request.quantity} · {request.priority}
                        <br />
                        {request.message || "No message"}
                      </td>
                      <td style={cellStyle}>
                        <span
                          className="pending-badge"
                          style={{
                            ...badgeStyle(request.status),
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td style={cellStyle}>{request.rejectionReason || "—"}</td>
                      <td style={cellStyle}>
                        {new Date(request.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;