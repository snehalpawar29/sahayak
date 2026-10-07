import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import "./Admin.css";

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem(
        "sahayak_user"
      );

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    return null;
  }
};

const AdminDashboard = () => {
  const navigate =
    useNavigate();

  const [providers, setProviders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [error, setError] =
    useState("");

  const token =
    localStorage.getItem(
      "sahayak_token"
    );

  const [user] =
    useState(getStoredUser);

  const fetchPendingProviders =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.getPendingProviders();

        setProviders(
          response.providers || []
        );
      } catch (error) {
        console.error(
          "Fetch providers error:",
          error
        );

        if (
          error.status === 401 ||
          error.status === 403
        ) {
          localStorage.removeItem(
            "sahayak_token"
          );

          localStorage.removeItem(
            "sahayak_user"
          );

          navigate(
            "/admin/login"
          );

          return;
        }

        setError(
          error.message ||
            "Failed to load pending providers."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (
      !token ||
      user?.role !== "ADMIN"
    ) {
      navigate(
        "/admin/login"
      );

      return;
    }

    fetchPendingProviders();
  }, []);

  const approveProvider =
    async (providerId) => {
      try {
        setActionLoading(
          providerId
        );

        setError("");

        await api.approveProvider(
          providerId
        );

        setProviders(
          (previous) =>
            previous.filter(
              (provider) =>
                provider.id !==
                providerId
            )
        );
      } catch (error) {
        console.error(
          "Approve provider error:",
          error
        );

        setError(
          error.message ||
            "Failed to approve provider."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const rejectProvider =
    async (providerId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to reject this provider?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(
          providerId
        );

        setError("");

        await api.rejectProvider(
          providerId
        );

        setProviders(
          (previous) =>
            previous.filter(
              (provider) =>
                provider.id !==
                providerId
            )
        );
      } catch (error) {
        console.error(
          "Reject provider error:",
          error
        );

        setError(
          error.message ||
            "Failed to reject provider."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const logout = () => {
    localStorage.removeItem(
      "sahayak_token"
    );

    localStorage.removeItem(
      "sahayak_user"
    );

    navigate(
      "/admin/login"
    );
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-brand">
            <div className="admin-brand-icon">
              🚑
            </div>

            <div>
              <h1>
                Sahayak Admin
              </h1>

              <p>
                Provider Verification Dashboard
              </p>
            </div>
          </div>

          <div className="admin-header-actions">
            <span className="admin-welcome">
              {user?.name ||
                "Administrator"}
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

      <main className="admin-main">
        <div className="admin-page-heading">
          <div>
            <h2>
              Dashboard
            </h2>

            <p>
              Review and verify emergency resource providers.
            </p>
          </div>

          <button
            onClick={
              fetchPendingProviders
            }
            className="admin-refresh-button"
            disabled={loading}
          >
            ↻{" "}
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-icon pending">
              ⏳
            </div>

            <div>
              <p>
                Pending Providers
              </p>

              <h3>
                {providers.length}
              </h3>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon online">
              ✓
            </div>

            <div>
              <p>
                System Status
              </p>

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
              <p>
                Administrator
              </p>

              <h3 className="admin-name">
                {user?.name ||
                  "Admin"}
              </h3>
            </div>
          </div>
        </div>

        {error && (
          <div className="admin-error">
            <strong>
              Error:
            </strong>{" "}
            {error}
          </div>
        )}

        <section className="provider-section">
          <div className="provider-section-header">
            <div>
              <h2>
                Pending Provider Verification
              </h2>

              <p>
                Review providers before they can manage emergency resources.
              </p>
            </div>

            <div className="pending-count">
              {providers.length}{" "}
              Pending
            </div>
          </div>

          {loading ? (
            <div className="admin-empty-state">
              <div className="loading-spinner"></div>

              <p>
                Loading pending providers...
              </p>
            </div>
          ) : providers.length ===
            0 ? (
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
                  {providers.map(
                    (provider) => (
                      <tr
                        key={
                          provider.id
                        }
                      >
                        <td>
                          <div className="organization-cell">
                            <div className="organization-avatar">
                              {provider.organization
                                ?.charAt(
                                  0
                                )
                                ?.toUpperCase() ||
                                "P"}
                            </div>

                            <div>
                              <strong>
                                {
                                  provider.organization
                                }
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
                              {provider.user
                                ?.name ||
                                "Not available"}
                            </strong>

                            <span>
                              {provider.user
                                ?.email ||
                                "No email"}
                            </span>

                            {provider.phone && (
                              <span>
                                {
                                  provider.phone
                                }
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="type-badge">
                            {
                              provider.type
                            }
                          </span>
                        </td>

                        <td>
                          <span className="city-text">
                            📍{" "}
                            {
                              provider.city
                            }
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
                                approveProvider(
                                  provider.id
                                )
                              }
                              disabled={
                                actionLoading ===
                                provider.id
                              }
                              className="approve-button"
                            >
                              {actionLoading ===
                              provider.id
                                ? "Processing..."
                                : "✓ Approve"}
                            </button>

                            <button
                              onClick={() =>
                                rejectProvider(
                                  provider.id
                                )
                              }
                              disabled={
                                actionLoading ===
                                provider.id
                              }
                              className="reject-button"
                            >
                              {actionLoading ===
                              provider.id
                                ? "Processing..."
                                : "✕ Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
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