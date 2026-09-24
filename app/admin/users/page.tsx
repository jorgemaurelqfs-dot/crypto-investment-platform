"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./user.css";

type UserRecord = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  country: string | null;
  referral_code: string | null;
  account_status: string | null;
  verification_status: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type UserStatistics = {
  total_users: number;
  active_users: number;
  suspended_users: number;
  verified_users: number;
  pending_verification: number;
  rejected_verification: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics>({
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    verified_users: 0,
    pending_verification: 0,
    rejected_verification: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, statsResponse] = await Promise.all([
        supabase.rpc("admin_get_users"),
        supabase.rpc("admin_get_user_statistics"),
      ]);

      if (usersResponse.error) {
        throw new Error(usersResponse.error.message);
      }

      if (statsResponse.error) {
        throw new Error(statsResponse.error.message);
      }

      const usersData = Array.isArray(usersResponse.data)
        ? usersResponse.data
        : [];

      let statsData: any = statsResponse.data;

      if (Array.isArray(statsData)) {
        statsData = statsData[0];
      }

      setUsers(usersData as UserRecord[]);

      setStatistics({
        total_users: Number(statsData?.total_users ?? 0),
        active_users: Number(statsData?.active_users ?? 0),
        suspended_users: Number(statsData?.suspended_users ?? 0),
        verified_users: Number(statsData?.verified_users ?? 0),
        pending_verification: Number(
          statsData?.pending_verification ?? 0
        ),
        rejected_verification: Number(
          statsData?.rejected_verification ?? 0
        ),
      });
    } catch (err: any) {
      console.error("Admin users error:", err);
      setError(
        err?.message ||
          "Unable to load users. Please check your administrator permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.country?.toLowerCase().includes(query) ||
        user.referral_code?.toLowerCase().includes(query) ||
        user.user_id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (user.account_status || "").toLowerCase() ===
          statusFilter.toLowerCase();

      const matchesVerification =
        verificationFilter === "all" ||
        (user.verification_status || "").toLowerCase() ===
          verificationFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [users, search, statusFilter, verificationFilter]);

  function formatDate(date: string | null) {
    if (!date) return "Never";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatLastLogin(date: string | null) {
    if (!date) return "Never";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getInitials(user: UserRecord) {
    if (user.full_name?.trim()) {
      const parts = user.full_name.trim().split(/\s+/);

      if (parts.length >= 2) {
        return (
          parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
        ).toUpperCase();
      }

      return parts[0].substring(0, 2).toUpperCase();
    }

    if (user.username?.trim()) {
      return user.username.substring(0, 2).toUpperCase();
    }

    if (user.email?.trim()) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return "US";
  }

  function statusClass(status: string | null) {
    const value = (status || "unknown").toLowerCase();

    if (value === "active") return "status-active";
    if (value === "suspended") return "status-suspended";
    if (value === "closed") return "status-closed";

    return "status-unknown";
  }

  function verificationClass(status: string | null) {
    const value = (status || "unverified").toLowerCase();

    if (value === "verified") return "verification-verified";
    if (value === "pending") return "verification-pending";
    if (value === "rejected") return "verification-rejected";

    return "verification-unverified";
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setVerificationFilter("all");
  }

  return (
    <main className="users-page">
      <div className="users-background-grid" />
      <div className="users-glow users-glow-one" />
      <div className="users-glow users-glow-two" />

      <section className="users-container">
        <header className="users-header">
          <div>
            <div className="page-kicker">
              <span className="kicker-dot" />
              ADMINISTRATION / USER MANAGEMENT
            </div>

            <h1>User Management</h1>

            <p>
              Manage customer accounts, verification status, account
              restrictions and user activity.
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadUsers}
            disabled={loading}
          >
            <span className={loading ? "refresh-icon spinning" : "refresh-icon"}>
              ↻
            </span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        <section className="statistics-grid">
          <div className="stat-card">
            <div className="stat-icon blue-icon">◉</div>

            <div className="stat-content">
              <span>Total Users</span>
              <strong>{statistics.total_users}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green-icon">✓</div>

            <div className="stat-content">
              <span>Active Users</span>
              <strong>{statistics.active_users}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange-icon">!</div>

            <div className="stat-content">
              <span>Suspended</span>
              <strong>{statistics.suspended_users}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple-icon">◆</div>

            <div className="stat-content">
              <span>Verified</span>
              <strong>{statistics.verified_users}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon yellow-icon">◌</div>

            <div className="stat-content">
              <span>Pending KYC</span>
              <strong>{statistics.pending_verification}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red-icon">×</div>

            <div className="stat-content">
              <span>Rejected KYC</span>
              <strong>{statistics.rejected_verification}</strong>
            </div>
          </div>
        </section>

        <section className="users-panel">
          <div className="panel-top">
            <div>
              <h2>Customer Accounts</h2>
              <span className="record-count">
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>

            <div className="live-indicator">
              <span />
              LIVE DATABASE
            </div>
          </div>

          <div className="filters">
            <div className="search-box">
              <span className="search-icon">⌕</span>

              <input
                type="text"
                placeholder="Search name, email, username, phone or ID..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="filter-select"
            >
              <option value="all">All Account Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(event) =>
                setVerificationFilter(event.target.value)
              }
              className="filter-select"
            >
              <option value="all">All Verification</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="unverified">Unverified</option>
              <option value="rejected">Rejected</option>
            </select>

            {(search ||
              statusFilter !== "all" ||
              verificationFilter !== "all") && (
              <button
                type="button"
                className="reset-button"
                onClick={clearFilters}
              >
                Reset
              </button>
            )}
          </div>

          {error && (
            <div className="error-banner">
              <div className="error-symbol">!</div>

              <div>
                <strong>Unable to load users</strong>
                <p>{error}</p>
              </div>

              <button type="button" onClick={loadUsers}>
                Try Again
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <h3>Loading User Database</h3>
              <p>Retrieving customer records securely...</p>
            </div>
          ) : !error && filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⌕</div>
              <h3>No Users Found</h3>
              <p>
                No customer accounts match your current search and
                filter settings.
              </p>

              <button type="button" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>CONTACT</th>
                    <th>COUNTRY</th>
                    <th>ACCOUNT</th>
                    <th>VERIFICATION</th>
                    <th>REGISTERED</th>
                    <th>LAST LOGIN</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td>
                        <div className="user-cell">
                          <div className="avatar">
                            {getInitials(user)}
                          </div>

                          <div className="user-main">
                            <strong>
                              {user.full_name || "Unnamed User"}
                            </strong>

                            <span>
                              {user.username
                                ? `@${user.username}`
                                : user.email || "No username"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="contact-cell">
                          <span>{user.email || "—"}</span>
                          <small>{user.phone || "No phone"}</small>
                        </div>
                      </td>

                      <td>
                        <span className="country-value">
                          {user.country || "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${statusClass(
                            user.account_status
                          )}`}
                        >
                          <i />
                          {user.account_status || "Unknown"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`verification-badge ${verificationClass(
                            user.verification_status
                          )}`}
                        >
                          {user.verification_status || "Unverified"}
                        </span>
                      </td>

                      <td>
                        <span className="date-value">
                          {formatDate(user.created_at)}
                        </span>
                      </td>

                      <td>
                        <span className="login-value">
                          {formatLastLogin(user.last_sign_in_at)}
                        </span>
                      </td>

                      <td>
                        <Link
                          href={`/admin/users/${user.user_id}`}
                          className="view-button"
                        >
                          <span>View</span>
                          <b>→</b>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filteredUsers.length > 0 && (
            <div className="panel-footer">
              <span>
                {filteredUsers.length} customer
                {filteredUsers.length === 1 ? "" : "s"} displayed
              </span>

              <span className="secure-label">
                <span>●</span>
                Secure Admin Access
              </span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}