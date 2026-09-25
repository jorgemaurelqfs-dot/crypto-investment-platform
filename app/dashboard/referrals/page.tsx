"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./referrals.css";

type Referral = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  commission_percentage: number | string;
  commission_amount: number | string;
  status:
    | "pending"
    | "approved"
    | "paid"
    | "cancelled"
    | string;
  created_at: string;
};

type Profile = {
  referral_code: string | null;
};

function formatAmount(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
      return "referral-status-paid";

    case "approved":
      return "referral-status-approved";

    case "pending":
      return "referral-status-pending";

    case "cancelled":
      return "referral-status-cancelled";

    default:
      return "referral-status-default";
  }
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [profile, setProfile] = useState<Profile | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  async function loadReferralData() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/crypto-investment-platform/login";
        return;
      }

      const [
        { data: profileData, error: profileError },
        { data: referralData, error: referralError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("referral_code")
          .eq("id", user.id)
          .single(),

        supabase
          .from("referrals")
          .select(
            "id, referrer_id, referred_user_id, commission_percentage, commission_amount, status, created_at"
          )
          .eq("referrer_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (profileError) {
        throw profileError;
      }

      if (referralError) {
        throw referralError;
      }

      setProfile(profileData);
      setReferrals(referralData || []);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load your referral information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferralData();
  }, []);

  const referralLink = useMemo(() => {
    if (!profile?.referral_code) {
      return "";
    }

    if (typeof window === "undefined") {
      return `/register?ref=${profile.referral_code}`;
    }

    return `${window.location.origin}/register?ref=${profile.referral_code}`;
  }, [profile]);

  const statistics = useMemo(() => {
    const total = referrals.length;

    const active = referrals.filter(
      (referral) =>
        referral.status.toLowerCase() !== "cancelled"
    ).length;

    const pending = referrals.filter(
      (referral) =>
        referral.status.toLowerCase() === "pending"
    ).length;

    const paidCommission = referrals
      .filter(
        (referral) =>
          referral.status.toLowerCase() === "paid"
      )
      .reduce(
        (totalAmount, referral) =>
          totalAmount +
          Number(referral.commission_amount || 0),
        0
      );

    const approvedCommission = referrals
      .filter(
        (referral) =>
          referral.status.toLowerCase() === "approved"
      )
      .reduce(
        (totalAmount, referral) =>
          totalAmount +
          Number(referral.commission_amount || 0),
        0
      );

    const pendingCommission = referrals
      .filter(
        (referral) =>
          referral.status.toLowerCase() === "pending"
      )
      .reduce(
        (totalAmount, referral) =>
          totalAmount +
          Number(referral.commission_amount || 0),
        0
      );

    return {
      total,
      active,
      pending,
      paidCommission,
      approvedCommission,
      pendingCommission,
    };
  }, [referrals]);

  const filteredReferrals = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return referrals;
    }

    return referrals.filter((referral) =>
      [
        referral.id,
        referral.referred_user_id,
        referral.status,
        String(referral.commission_percentage),
        String(referral.commission_amount),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [referrals, search]);

  async function copyReferralLink() {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        referralLink
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "Unable to copy the referral link. Please copy it manually."
      );
    }
  }

  if (loading) {
    return (
      <main className="referrals-page">
        <div className="referrals-loading">
          <div className="referrals-spinner" />
          <p>Loading referral center...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="referrals-page">
      <div className="referrals-container">

        <Link
          href="/dashboard"
          className="referrals-back"
        >
          <span aria-hidden="true">‹</span>
          Back to Dashboard
        </Link>

        <header className="referrals-heading">
          <div>
            <p className="referrals-eyebrow">
              REFERRAL CENTER
            </p>

            <h1>Invite & Earn</h1>

            <p className="referrals-subtitle">
              Invite new members and track your referral
              activity and commissions from one place.
            </p>
          </div>

          <div className="referrals-security">
            <span className="referrals-security-dot" />
            Referral Program
          </div>
        </header>

        {error && (
          <div className="referral-alert">
            <div className="referral-alert-icon">
              !
            </div>

            <div>
              <strong>
                Something went wrong
              </strong>

              <p>{error}</p>

              <button
                type="button"
                onClick={loadReferralData}
                className="referral-retry"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <section className="referral-hero">

          <div className="referral-hero-content">

            <div className="referral-hero-icon">
              ↗
            </div>

            <div>
              <p>YOUR REFERRAL CODE</p>

              <div className="referral-code">
                {profile?.referral_code || "Not available"}
              </div>

              <span>
                Share your referral link with people
                you want to invite.
              </span>
            </div>

          </div>

          <div className="referral-link-area">

            <label>
              REFERRAL LINK
            </label>

            <div className="referral-link-row">

              <input
                type="text"
                value={
                  referralLink ||
                  "Referral link unavailable"
                }
                readOnly
              />

              <button
                type="button"
                onClick={copyReferralLink}
                disabled={!referralLink}
                className={
                  copied
                    ? "copy-referral copied"
                    : "copy-referral"
                }
              >
                {copied ? "Copied" : "Copy Link"}
              </button>

            </div>

          </div>

        </section>

        <section className="referral-stat-grid">

          <div className="referral-stat-card">
            <div className="referral-stat-icon blue">
              👥
            </div>

            <div>
              <span>Total Referrals</span>
              <strong>
                {statistics.total}
              </strong>
            </div>
          </div>

          <div className="referral-stat-card">
            <div className="referral-stat-icon green">
              ✓
            </div>

            <div>
              <span>Active Referrals</span>
              <strong>
                {statistics.active}
              </strong>
            </div>
          </div>

          <div className="referral-stat-card">
            <div className="referral-stat-icon gold">
              $
            </div>

            <div>
              <span>Paid Commission</span>
              <strong>
                {formatAmount(
                  statistics.paidCommission
                )}
              </strong>
            </div>
          </div>

          <div className="referral-stat-card">
            <div className="referral-stat-icon purple">
              ◷
            </div>

            <div>
              <span>Pending Commission</span>
              <strong>
                {formatAmount(
                  statistics.pendingCommission
                )}
              </strong>
            </div>
          </div>

        </section>

        <section className="referral-info-grid">

          <div className="referral-info-card">

            <div className="referral-info-header">
              <div className="referral-info-symbol">
                %
              </div>

              <div>
                <span>COMMISSION PROGRAM</span>
                <h2>Referral Earnings</h2>
              </div>
            </div>

            <p>
              Referral commissions are recorded when
              qualifying referral activity is processed
              according to the platform's referral
              program.
            </p>

            <div className="referral-info-items">

              <div>
                <span>Pending</span>
                <strong>
                  {formatAmount(
                    statistics.pendingCommission
                  )}
                </strong>
              </div>

              <div>
                <span>Approved</span>
                <strong>
                  {formatAmount(
                    statistics.approvedCommission
                  )}
                </strong>
              </div>

              <div>
                <span>Paid</span>
                <strong>
                  {formatAmount(
                    statistics.paidCommission
                  )}
                </strong>
              </div>

            </div>

          </div>

          <div className="referral-how-card">

            <div className="referral-how-header">
              <span>HOW IT WORKS</span>
              <h2>Grow Your Network</h2>
            </div>

            <div className="referral-steps">

              <div className="referral-step">
                <div className="step-number">
                  01
                </div>

                <div>
                  <strong>Share your link</strong>
                  <p>
                    Send your personal referral link
                    to someone you want to invite.
                  </p>
                </div>
              </div>

              <div className="referral-step">
                <div className="step-number">
                  02
                </div>

                <div>
                  <strong>They register</strong>
                  <p>
                    The invited user creates an account
                    through your referral link.
                  </p>
                </div>
              </div>

              <div className="referral-step">
                <div className="step-number">
                  03
                </div>

                <div>
                  <strong>Track activity</strong>
                  <p>
                    Referral activity and commissions
                    appear in your referral center.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </section>

        <section className="referral-history-card">

          <div className="referral-history-header">

            <div>
              <span>REFERRAL LEDGER</span>
              <h2>Referral History</h2>
            </div>

            <div className="referral-record-count">
              {filteredReferrals.length}{" "}
              {filteredReferrals.length === 1
                ? "record"
                : "records"}
            </div>

          </div>

          <div className="referral-search-row">

            <div className="referral-search">

              <span aria-hidden="true">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search referral records..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

          </div>

          {filteredReferrals.length === 0 ? (
            <div className="referrals-empty">

              <div className="referrals-empty-icon">
                👥
              </div>

              <h3>
                {referrals.length === 0
                  ? "No referrals yet"
                  : "No matching referrals"}
              </h3>

              <p>
                {referrals.length === 0
                  ? "Your referral activity will appear here after someone joins through your referral link."
                  : "Try a different search term."}
              </p>

              {referrals.length > 0 && (
                <button
                  type="button"
                  className="clear-referral-search"
                  onClick={() => setSearch("")}
                >
                  Clear Search
                </button>
              )}

            </div>
          ) : (
            <div className="referral-table-wrapper">

              <table className="referral-table">

                <thead>
                  <tr>
                    <th>Referral</th>
                    <th>Commission Rate</th>
                    <th>Commission</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredReferrals.map(
                    (referral) => (
                      <tr key={referral.id}>

                        <td>
                          <div className="referral-user">

                            <div className="referral-avatar">
                              {referral.referred_user_id
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                Referred User
                              </strong>

                              <span>
                                ID:{" "}
                                {referral.referred_user_id.slice(
                                  0,
                                  8
                                )}
                                ...
                              </span>
                            </div>

                          </div>
                        </td>

                        <td>
                          <span className="commission-rate">
                            {formatAmount(
                              referral.commission_percentage
                            )}
                            %
                          </span>
                        </td>

                        <td>
                          <strong className="commission-amount">
                            {formatAmount(
                              referral.commission_amount
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`referral-status ${getStatusClass(
                              referral.status
                            )}`}
                          >
                            <span className="status-dot" />
                            {formatStatus(
                              referral.status
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="referral-date">
                            {formatDate(
                              referral.created_at
                            )}
                          </span>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        <div className="referral-footer-note">
          <span>✓</span>
          Referral records are read-only from the
          investor portal.
        </div>

      </div>
    </main>
  );
}
