import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const token = localStorage.getItem("sahayak_token");

  const storedUser = localStorage.getItem("sahayak_user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : null;

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchPendingProviders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${apiUrl}/admin/providers/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        throw new Error(
          text || `Server returned HTTP ${response.status}`
        );
      }

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("sahayak_token");
        localStorage.removeItem("sahayak_user");

        navigate("/admin/login");

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load providers"
        );
      }

      setProviders(data.providers || []);
    } catch (error) {
      console.error("Fetch providers error:", error);

      setError(
        error.message || "Failed to load pending providers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }

    fetchPendingProviders();
  }, []);

  const approveProvider = async (providerId) => {
    try {
      setActionLoading(providerId);
      setError("");

      const response = await fetch(
        `${apiUrl}/admin/providers/${providerId}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to approve provider"
        );
      }

      setProviders((previous) =>
        previous.filter(
          (provider) => provider.id !== providerId
        )
      );
    } catch (error) {
      console.error("Approve provider error:", error);

      setError(
        error.message || "Failed to approve provider."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const rejectProvider = async (providerId) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this provider?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(providerId);
      setError("");

      const response = await fetch(
        `${apiUrl}/admin/providers/${providerId}/reject`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to reject provider"
        );
      }

      setProviders((previous) =>
        previous.filter(
          (provider) => provider.id !== providerId
        )
      );
    } catch (error) {
      console.error("Reject provider error:", error);

      setError(
        error.message || "Failed to reject provider."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("sahayak_token");
    localStorage.removeItem("sahayak_user");

    navigate("/admin/login");
  };

  return (
    <div className="admin-dashboard">

      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">

          <div className="admin-brand">
            <div className="admin-brand-icon">
              🚑
            </div>

            <div>
              <h1>Sahayak Admin</h1>
              <p>Provider Verification Dashboard</p>
            </div>
          </div>

          <div className="admin-header-actions">
            <span className="admin-welcome">
              {user?.name || "Administrator"}
            </span>

            <button
              onClick={logout}
              className="admin-logout-button"
            >
              Logout
            </button>
          </div>

        </div>
      </header>


      {/* Main */}
      <main className="admin-main">

        {/* Page heading */}
        <div className="admin-page-heading">
          <div>
            <h2>Dashboard</h2>

            <p>
              Review and verify emergency resource providers.
            </p>
          </div>

          <button
            onClick={fetchPendingProviders}
            className="admin-refresh-button"
          >
            ↻ Refresh
          </button>
        </div>


        {/* Statistics */}
        <div className="admin-stats">

          <div className="admin-stat-card">
            <div className="admin-stat-icon pending">
              ⏳
            </div>

            <div>
              <p>Pending Providers</p>

              <h3>{providers.length}</h3>
            </div>
          </div>


          <div className="admin-stat-card">
            <div className="admin-stat-icon online">
              ✓
            </div>

            <div>
              <p>System Status</p>

              <h3 className="status-online">
                Online
              </h3>
            </div>
          </div>


          <div className="admin-stat-card">
            <div className="admin-stat-icon admin">
              👤
            </div>

            <div>
              <p>Administrator</p>

              <h3 className="admin-name">
                {user?.name || "Admin"}
              </h3>
            </div>
          </div>

        </div>


        {/* Error */}
        {error && (
          <div className="admin-error">
            <strong>Error:</strong> {error}
          </div>
        )}


        {/* Provider section */}
        <section className="provider-section">

          <div className="provider-section-header">

            <div>
              <h2>Pending Provider Verification</h2>

              <p>
                Review providers before they can manage
                emergency resources.
              </p>
            </div>

            <div className="pending-count">
              {providers.length} Pending
            </div>

          </div>


          {loading ? (
            <div className="admin-empty-state">
              <div className="loading-spinner"></div>

              <p>
                Loading pending providers...
              </p>
            </div>

          ) : providers.length === 0 ? (

            <div className="admin-empty-state">

              <div className="empty-icon">
                ✓
              </div>

              <h3>
                No pending providers
              </h3>

              <p>
                All provider registrations have been reviewed.
              </p>

            </div>

          ) : (

            <div className="provider-table-wrapper">

              <table className="provider-table">

                <thead>
                  <tr>

                    <th>
                      Organization
                    </th>

                    <th>
                      Contact
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      City
                    </th>

                    <th>
                      Status
                    </th>

                    <th className="actions-column">
                      Actions
                    </th>

                  </tr>
                </thead>


                <tbody>

                  {providers.map((provider) => (

                    <tr key={provider.id}>

                      <td>
                        <div className="organization-cell">

                          <div className="organization-avatar">
                            {provider.organization
                              ?.charAt(0)
                              ?.toUpperCase() || "P"}
                          </div>

                          <div>
                            <strong>
                              {provider.organization}
                            </strong>

                            <span>
                              {provider.address ||
                                "Address not provided"}
                            </span>
                          </div>

                        </div>
                      </td>


                      <td>
                        <div className="contact-cell">

                          <strong>
                            {provider.user?.name ||
                              "Not available"}
                          </strong>

                          <span>
                            {provider.user?.email ||
                              "No email"}
                          </span>

                          {provider.phone && (
                            <span>
                              {provider.phone}
                            </span>
                          )}

                        </div>
                      </td>


                      <td>
                        <span className="type-badge">
                          {provider.type}
                        </span>
                      </td>


                      <td>
                        <span className="city-text">
                          📍 {provider.city}
                        </span>
                      </td>


                      <td>
                        <span className="pending-badge">
                          Pending
                        </span>
                      </td>


                      <td>
                        <div className="provider-actions">

                          <button
                            onClick={() =>
                              approveProvider(provider.id)
                            }
                            disabled={
                              actionLoading === provider.id
                            }
                            className="approve-button"
                          >
                            {actionLoading === provider.id
                              ? "Processing..."
                              : "✓ Approve"}
                          </button>


                          <button
                            onClick={() =>
                              rejectProvider(provider.id)
                            }
                            disabled={
                              actionLoading === provider.id
                            }
                            className="reject-button"
                          >
                            ✕ Reject
                          </button>

                        </div>
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