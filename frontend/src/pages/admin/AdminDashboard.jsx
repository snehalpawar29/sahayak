import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Admin.css";

const getStoredUser = () => {
  try {
    const value = localStorage.getItem("sahayak_user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const dateTime = (value) => value ? new Date(value).toLocaleString() : "—";
const label = (value) => String(value || "").replaceAll("_", " ");

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user] = useState(getStoredUser);
  const [tab, setTab] = useState("providers");
  const [providers, setProviders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [providerResult, requestResult] = await Promise.all([
        api.getAllProviders(),
        api.getAllEmergencyRequests()
      ]);
      setProviders(providerResult.providers || []);
      setRequests(requestResult.requests || []);
    } catch (err) {
      setError(err.message || "Unable to load administrator data.");
      if (/unauthorized|authentication|token/i.test(err.message || "")) {
        localStorage.removeItem("sahayak_token");
        localStorage.removeItem("sahayak_user");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("sahayak_token") || user?.role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    loadDashboard();
  }, [loadDashboard, navigate, user]);

  const approve = async (provider) => {
    if (!window.confirm(`Approve ${provider.organization} as a verified provider?`)) return;
    setActionLoading(provider.id);
    setError("");
    try {
      await api.approveProvider(provider.id);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Failed to approve provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (provider) => {
    const reason = window.prompt(`Enter the reason for rejecting ${provider.organization} (required, max 500 characters):`);
    if (reason === null) return;
    if (!reason.trim() || reason.trim().length > 500) {
      setError("Enter a rejection reason between 1 and 500 characters.");
      return;
    }
    setActionLoading(provider.id);
    setError("");
    try {
      await api.rejectProvider(provider.id, reason.trim());
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Failed to reject provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("sahayak_token");
    localStorage.removeItem("sahayak_user");
    navigate("/admin/login");
  };

  const pendingCount = providers.filter((p) => (p.status || (p.verified ? "APPROVED" : "PENDING")) === "PENDING").length;
  const approvedCount = providers.filter((p) => p.status === "APPROVED" || (!p.status && p.verified)).length;
  const rejectedCount = providers.filter((p) => p.status === "REJECTED").length;

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-brand">
            <div className="admin-brand-icon">🚑</div>
            <div><h1>Sahayak Admin</h1><p>Emergency Resource Oversight</p></div>
          </div>
          <div className="admin-header-actions">
            <span className="admin-welcome">{user?.name || "Administrator"}</span>
            <button onClick={logout} className="admin-logout-button">Logout</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-page-heading">
          <div><h2>Dashboard</h2><p>Review providers, resource inventory and emergency requests.</p></div>
          <button onClick={loadDashboard} className="admin-refresh-button" disabled={loading}>{loading ? "Refreshing..." : "↻ Refresh"}</button>
        </div>

        <div className="admin-stats">
          <div className="admin-stat-card"><div className="admin-stat-icon pending">⏳</div><div><p>Pending Providers</p><h3>{pendingCount}</h3></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon online">✓</div><div><p>Approved Providers</p><h3>{approvedCount}</h3></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon admin">📋</div><div><p>Emergency Requests</p><h3>{requests.length}</h3></div></div>
        </div>

        {error && <div className="admin-error"><strong>Notice:</strong> {error}</div>}

        <div className="admin-tabs" style={{ display: "flex", gap: 10, margin: "18px 0", flexWrap: "wrap" }}>
          <button className={tab === "providers" ? "approve-button" : "admin-refresh-button"} onClick={() => setTab("providers")}>All Providers ({providers.length})</button>
          <button className={tab === "requests" ? "approve-button" : "admin-refresh-button"} onClick={() => setTab("requests")}>Emergency Requests ({requests.length})</button>
        </div>

        {loading ? <div className="admin-empty-state"><div className="loading-spinner" /><p>Loading administrator data...</p></div> : tab === "providers" ? (
          <section className="provider-section">
            <div className="provider-section-header"><div><h2>All Providers</h2><p>Inventory, verification status and application decisions.</p></div><div className="pending-count">{pendingCount} Pending · {rejectedCount} Rejected</div></div>
            {providers.length === 0 ? <div className="admin-empty-state"><h3>No provider profiles yet</h3></div> : (
              <div className="provider-table-wrapper">
                <table className="provider-table">
                  <thead><tr><th>Organization</th><th>Contact</th><th>Location</th><th>Status</th><th>Resources</th><th>Actions</th></tr></thead>
                  <tbody>{providers.map((p) => {
                    const status = p.status || (p.verified ? "APPROVED" : "PENDING");
                    return <tr key={p.id}>
                      <td><div className="organization-cell"><div className="organization-avatar">{p.organization?.charAt(0)?.toUpperCase() || "P"}</div><div><strong>{p.organization}</strong><span>{p.type}</span><span>Registered: {dateTime(p.createdAt)}</span></div></div></td>
                      <td><div className="contact-cell"><strong>{p.user?.name || "—"}</strong><span>{p.user?.email || "—"}</span><span>{p.phone || "Phone not provided"}</span></div></td>
                      <td>{p.city}{p.address ? <><br />{p.address}</> : null}</td>
                      <td><span className={status === "APPROVED" ? "pending-badge" : status === "REJECTED" ? "reject-button" : "type-badge"}>{label(status)}</span>{p.rejectionReason && <p style={{ maxWidth: 220, whiteSpace: "normal" }}>Reason: {p.rejectionReason}</p>}</td>
                      <td>{(p.resources || []).length === 0 ? "No resources" : <div>{p.resources.map((r) => <div key={r.id} style={{ marginBottom: 8 }}><strong>{r.name}</strong><br /><small>{label(r.category)} · Qty {r.quantity} · {r.available ? "Available" : "Unavailable"}</small><br /><small>Updated: {dateTime(r.updatedAt)}</small></div>)}</div>}</td>
                      <td>{status === "PENDING" ? <div className="provider-actions"><button className="approve-button" disabled={actionLoading === p.id} onClick={() => approve(p)}>Approve</button><button className="reject-button" disabled={actionLoading === p.id} onClick={() => reject(p)}>Reject</button></div> : <span>—</span>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="provider-section">
            <div className="provider-section-header"><div><h2>All Emergency Requests</h2><p>Includes pending, accepted, rejected, completed and cancelled requests.</p></div><div className="pending-count">{requests.length} Total</div></div>
            {requests.length === 0 ? <div className="admin-empty-state"><h3>No emergency requests yet</h3></div> : (
              <div className="provider-table-wrapper"><table className="provider-table">
                <thead><tr><th>Citizen</th><th>Resource / Provider</th><th>Quantity</th><th>Priority</th><th>Status / Reason</th><th>Submitted / Updated</th></tr></thead>
                <tbody>{requests.map((r) => <tr key={r.id}>
                  <td><div className="contact-cell"><strong>{r.user?.name || "—"}</strong><span>{r.user?.email || "—"}</span><span>{r.user?.city || ""}</span></div></td>
                  <td><strong>{r.resource?.name || "Resource removed"}</strong><br /><span>{r.resource?.provider?.organization || "Provider unavailable"}</span><br /><small>{label(r.resource?.category)}</small></td>
                  <td>{r.quantity}</td><td>{r.priority}</td>
                  <td><span className={r.status === "REJECTED" ? "reject-button" : "type-badge"}>{r.status}</span>{r.rejectionReason && <p style={{ maxWidth: 220, whiteSpace: "normal" }}>{r.rejectionReason}</p>}</td>
                  <td><small>Created: {dateTime(r.createdAt)}<br />Updated: {dateTime(r.updatedAt)}</small></td>
                </tr>)}</tbody>
              </table></div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
