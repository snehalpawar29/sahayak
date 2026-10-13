import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
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

  const token = localStorage.getItem("sahayak_token");
  let user = null;
  try { user = JSON.parse(localStorage.getItem("sahayak_user") || "null"); } catch { user = null; }

  const loadDashboard = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const [providerResponse, requestResponse] = await Promise.all([api.getAdminProviders(), api.getAdminRequests()]);
      setProviders(providerResponse.providers || []);
      setRequests(requestResponse.requests || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load admin data.");
      if (/authentication|required|token/i.test(loadError.message)) {
        localStorage.removeItem("sahayak_token");
        localStorage.removeItem("sahayak_user");
        navigate("/admin/login");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") { navigate("/admin/login"); return; }
    loadDashboard(true);
  }, []);

  const approveProvider = async (providerId) => {
    setActionLoading(providerId); setError(""); setSuccess("");
    try { await api.approveAdminProvider(providerId); setSuccess("Provider approved."); await loadDashboard(); }
    catch (actionError) { setError(actionError.message); }
    finally { setActionLoading(null); }
  };

  const rejectProvider = async (event) => {
    event.preventDefault();
    if (!rejectTarget || rejectionReason.trim().length < 5) { setError("Enter a rejection reason of at least 5 characters."); return; }
    setActionLoading(rejectTarget); setError(""); setSuccess("");
    try {
      await api.rejectAdminProvider(rejectTarget, rejectionReason.trim());
      setSuccess("Provider rejection and reason saved. The provider profile was retained.");
      setRejectTarget(null); setRejectionReason(""); await loadDashboard();
    } catch (actionError) { setError(actionError.message); }
    finally { setActionLoading(null); }
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
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (docError) { setError(docError.message); }
  };

  const logout = () => { localStorage.removeItem("sahayak_token"); localStorage.removeItem("sahayak_user"); navigate("/admin/login"); };
  const visibleProviders = filter === "ALL" ? providers : providers.filter((provider) => (provider.verificationStatus || (provider.verified ? "APPROVED" : "PENDING")) === filter);
  const pendingCount = providers.filter((p) => (p.verificationStatus || (p.verified ? "APPROVED" : "PENDING")) === "PENDING").length;
  const rejectedCount = providers.filter((p) => p.verificationStatus === "REJECTED").length;

  return (
    <div className="admin-dashboard">
      <header className="admin-header"><div className="admin-header-content"><div className="admin-brand"><div className="admin-brand-icon">🚑</div><div><h1>Sahayak Admin</h1><p>Provider and emergency request management</p></div></div><div className="admin-header-actions"><span className="admin-welcome">{user?.name || "Administrator"}</span><button onClick={logout} className="admin-logout-button">Logout</button></div></div></header>
      <main className="admin-main">
        <div className="admin-page-heading"><div><h2>Dashboard</h2><p>Review provider documents, inventory and all citizen requests.</p></div><button onClick={() => loadDashboard(true)} className="admin-refresh-button">↻ Refresh</button></div>
        <div className="admin-stats">
          <div className="admin-stat-card"><div className="admin-stat-icon pending">⏳</div><div><p>Pending Providers</p><h3>{pendingCount}</h3></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon online">✓</div><div><p>All Providers</p><h3>{providers.length}</h3></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon admin">📋</div><div><p>Citizen Requests</p><h3>{requests.length}</h3></div></div>
        </div>
        {error && <div className="admin-error" role="alert"><strong>Error:</strong> {error}</div>}
        {success && <div className="alert success" role="status">{success}</div>}

        <section className="provider-section">
          <div className="provider-section-header"><div><h2>All Provider Profiles</h2><p>Review organization details, submitted proof and resources for each provider.</p></div><div className="pending-count">{pendingCount} Pending · {rejectedCount} Rejected</div></div>
          <div style={{ padding: "18px 24px" }}><label>Filter providers <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">All statuses</option><option value="PENDING">Pending review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label></div>
          {loading ? <div className="admin-empty-state"><div className="loading-spinner" /><p>Loading admin data...</p></div> : visibleProviders.length === 0 ? <div className="admin-empty-state"><h3>No providers in this filter</h3><p>Provider profiles will appear here after submission.</p></div> : <div className="provider-table-wrapper"><table className="provider-table"><thead><tr><th>Organization / Contact</th><th>Type / City</th><th>Verification proof</th><th>Resources</th><th>Status / Reason</th><th>Actions</th></tr></thead><tbody>{visibleProviders.map((provider) => {
            const status = provider.verificationStatus || (provider.verified ? "APPROVED" : "PENDING");
            return <tr key={provider.id}>
              <td><div className="organization-cell"><div className="organization-avatar">{provider.organization?.charAt(0)?.toUpperCase() || "P"}</div><div><strong>{provider.organization}</strong><span>{provider.user?.name} · {provider.user?.email}</span><span>{provider.phone || "No phone"} · {provider.address || "No address"}</span></div></div></td>
              <td><strong>{provider.type}</strong><br /><span className="city-text">📍 {provider.city}</span></td>
              <td>{provider.verificationDocumentName ? <><span>{provider.verificationDocumentName}</span><br /><button className="admin-refresh-button" onClick={() => openDocument(provider)}>View document</button></> : <span>Not uploaded</span>}</td>
              <td>{provider.resources?.length ? <details><summary>{provider.resources.length} resource(s)</summary>{provider.resources.map((resource) => <div key={resource.id} style={{ padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}><strong>{resource.name}</strong><br /><span>{resource.category.replaceAll("_", " ")} · Qty {resource.quantity} · {resource.available ? "Available" : "Unavailable"}</span></div>)}</details> : "No resources"}</td>
              <td><span className={status === "APPROVED" ? "pending-badge" : "pending-badge"} style={status === "APPROVED" ? { background: "#dcfce7", color: "#166534" } : status === "REJECTED" ? { background: "#fee2e2", color: "#991b1b" } : {}}>{status}</span>{provider.verificationRejectionReason && <p style={{ maxWidth: 230, whiteSpace: "normal" }}><strong>Reason:</strong> {provider.verificationRejectionReason}</p>}</td>
              <td><div className="provider-actions">{status === "PENDING" && <><button className="approve-button" disabled={actionLoading === provider.id || !provider.verificationDocumentName} onClick={() => approveProvider(provider.id)}>{actionLoading === provider.id ? "Saving..." : "✓ Approve"}</button><button className="reject-button" disabled={actionLoading === provider.id} onClick={() => { setRejectTarget(provider.id); setRejectionReason(""); }}>✕ Reject</button></>}{status === "REJECTED" && <span>Awaiting resubmission</span>}{status === "APPROVED" && <span>Verified</span>}</div>
                {rejectTarget === provider.id && <form onSubmit={rejectProvider} style={{ marginTop: 10, minWidth: 200 }}><label>Reason for rejection<textarea rows="3" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} required minLength={5} placeholder="Explain what needs correction" /></label><button className="reject-button" disabled={actionLoading === provider.id}>{actionLoading === provider.id ? "Saving..." : "Confirm rejection"}</button><button type="button" className="admin-refresh-button" onClick={() => { setRejectTarget(null); setRejectionReason(""); }}>Cancel</button></form>}
              </td>
            </tr>;
          })}</tbody></table></div>}
        </section>

        <section className="provider-section" style={{ marginTop: 28 }}>
          <div className="provider-section-header"><div><h2>All Citizen Emergency Requests</h2><p>Requests remain visible here after acceptance, rejection or completion.</p></div><div className="pending-count">{requests.length} Total</div></div>
          {loading ? <div className="admin-empty-state"><p>Loading requests...</p></div> : requests.length === 0 ? <div className="admin-empty-state"><h3>No citizen requests yet</h3></div> : <div className="provider-table-wrapper"><table className="provider-table"><thead><tr><th>Citizen</th><th>Resource / Provider</th><th>Request</th><th>Status</th><th>Rejection reason</th><th>Submitted</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><strong>{request.user?.name || "Unknown"}</strong><span style={{ display: "block" }}>{request.user?.email}</span><span style={{ display: "block" }}>{request.user?.city || "City not provided"}</span></td><td><strong>{request.resource?.name}</strong><span style={{ display: "block" }}>{request.resource?.provider?.organization || "Provider unavailable"}</span><span style={{ display: "block" }}>{request.resource?.city}</span></td><td>Qty {request.quantity} · {request.priority}<br />{request.message || "No message"}</td><td><span className="pending-badge" style={request.status === "ACCEPTED" || request.status === "COMPLETED" ? { background: "#dcfce7", color: "#166534" } : request.status === "REJECTED" ? { background: "#fee2e2", color: "#991b1b" } : {}}>{request.status}</span></td><td>{request.rejectionReason || "—"}</td><td>{new Date(request.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
