"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./profile.css";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  country: string | null;
  referral_code: string | null;
  avatar_url: string | null;
  account_status: string | null;
  verification_status: string | null;
  created_at: string | null;
};

function formatStatus(status: string | null) {
  if (!status) {
    return "Unknown";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(
  fullName: string | null,
  email: string | null
) {
  const source = fullName?.trim() || email?.trim() || "User";

  const parts = source
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0][0] + parts[parts.length - 1][0]
    ).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function getVerificationClass(status: string | null) {
  switch (status?.toLowerCase()) {
    case "verified":
      return "profile-status verified";

    case "pending":
      return "profile-status pending";

    case "rejected":
      return "profile-status rejected";

    default:
      return "profile-status unverified";
  }
}

function getAccountClass(status: string | null) {
  switch (status?.toLowerCase()) {
    case "active":
      return "profile-status verified";

    case "suspended":
      return "profile-status rejected";

    case "closed":
      return "profile-status rejected";

    default:
      return "profile-status unverified";
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadProfile() {
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
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");

      const { data, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, username, phone, country, referral_code, avatar_url, account_status, verification_status, created_at"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(data);

      setFullName(data.full_name || "");
      setUsername(data.username || "");
      setPhone(data.phone || "");
      setCountry(data.country || "");
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveProfile() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const cleanFullName = fullName.trim();
      const cleanUsername = username.trim();
      const cleanPhone = phone.trim();
      const cleanCountry = country.trim();

      if (!cleanFullName) {
        setError("Please enter your full name.");
        return;
      }

      if (!cleanUsername) {
        setError("Please enter a username.");
        return;
      }

      if (cleanUsername.length < 3) {
        setError(
          "Username must contain at least 3 characters."
        );
        return;
      }

      if (cleanUsername.length > 30) {
        setError(
          "Username cannot exceed 30 characters."
        );
        return;
      }

      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        setError(
          "Username can only contain letters, numbers, dots, underscores and hyphens."
        );
        return;
      }

      const { data: existingUsername, error: usernameError } =
        await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .neq("id", user.id)
          .maybeSingle();

      if (usernameError) {
        throw usernameError;
      }

      if (existingUsername) {
        setError(
          "That username is already in use. Please choose another."
        );
        return;
      }

      const { data, error: updateError } =
        await supabase
          .from("profiles")
          .update({
            full_name: cleanFullName,
            username: cleanUsername,
            phone: cleanPhone || null,
            country: cleanCountry || null,
          })
          .eq("id", user.id)
          .select(
            "id, full_name, username, phone, country, referral_code, avatar_url, account_status, verification_status, created_at"
          )
          .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(data);
      setFullName(data.full_name || "");
      setUsername(data.username || "");
      setPhone(data.phone || "");
      setCountry(data.country || "");

      setMessage("Your profile has been updated successfully.");
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    if (!profile) {
      return;
    }

    setFullName(profile.full_name || "");
    setUsername(profile.username || "");
    setPhone(profile.phone || "");
    setCountry(profile.country || "");

    setMessage("");
    setError("");
  }

  async function copyReferralCode() {
    if (!profile?.referral_code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        profile.referral_code
      );

      setMessage("Referral code copied.");
    } catch {
      setError(
        "Unable to copy the referral code."
      );
    }
  }

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-loading">
          <div className="profile-spinner" />
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-container">

        <Link
          href="/dashboard"
          className="profile-back"
        >
          <span aria-hidden="true">‹</span>
          Back to Dashboard
        </Link>

        <header className="profile-heading">
          <div>
            <p className="profile-eyebrow">
              ACCOUNT SETTINGS
            </p>

            <h1>My Profile</h1>

            <p className="profile-subtitle">
              Manage your personal information and
              review your account details.
            </p>
          </div>

          <div className="profile-security">
            <span className="profile-security-dot" />
            Secure Account
          </div>
        </header>

        {error && (
          <div className="profile-alert error">
            <div className="profile-alert-icon">
              !
            </div>

            <div>
              <strong>
                Update unsuccessful
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {message && !error && (
          <div className="profile-alert success">
            <div className="profile-alert-icon">
              ✓
            </div>

            <div>
              <strong>
                Changes saved
              </strong>

              <p>{message}</p>
            </div>
          </div>
        )}

        <section className="profile-layout">

          <aside className="profile-sidebar">

            <div className="profile-avatar">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile avatar"
                />
              ) : (
                getInitials(
                  profile?.full_name || null,
                  email
                )
              )}
            </div>

            <h2>
              {profile?.full_name ||
                "Investor"}
            </h2>

            <p className="profile-email">
              {email || "Email unavailable"}
            </p>

            <div
              className={getVerificationClass(
                profile?.verification_status || null
              )}
            >
              <span className="status-dot" />

              {formatStatus(
                profile?.verification_status || null
              )}
            </div>

            <div className="profile-side-divider" />

            <div className="profile-side-item">
              <span>ACCOUNT ID</span>

              <strong>
                {profile?.id
                  ? `${profile.id.slice(0, 8)}...`
                  : "—"}
              </strong>
            </div>

            <div className="profile-side-item">
              <span>MEMBER SINCE</span>

              <strong>
                {formatDate(
                  profile?.created_at || null
                )}
              </strong>
            </div>

          </aside>

          <div className="profile-main">

            <section className="profile-card">

              <div className="profile-card-header">
                <div>
                  <span>
                    PERSONAL INFORMATION
                  </span>

                  <h2>
                    Profile Details
                  </h2>
                </div>

                <div className="profile-card-icon">
                  ✦
                </div>
              </div>

              <div className="profile-form">

                <div className="profile-field full">
                  <label htmlFor="fullName">
                    FULL NAME
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="username">
                    USERNAME
                  </label>

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                      )
                    }
                    placeholder="Choose a username"
                    autoComplete="username"
                  />

                  <small>
                    3–30 characters. Letters,
                    numbers, dots, underscores and
                    hyphens.
                  </small>
                </div>

                <div className="profile-field">
                  <label htmlFor="email">
                    EMAIL ADDRESS
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                  />

                  <small>
                    Your email is managed by the
                    authentication system.
                  </small>
                </div>

                <div className="profile-field">
                  <label htmlFor="phone">
                    PHONE NUMBER
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    placeholder="Enter phone number"
                    autoComplete="tel"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="country">
                    COUNTRY
                  </label>

                  <input
                    id="country"
                    type="text"
                    value={country}
                    onChange={(event) =>
                      setCountry(
                        event.target.value
                      )
                    }
                    placeholder="Enter your country"
                    autoComplete="country-name"
                  />
                </div>

              </div>

              <div className="profile-form-actions">

                <button
                  type="button"
                  className="profile-reset-button"
                  onClick={resetChanges}
                  disabled={saving}
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="profile-save-button"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>

              </div>

            </section>

            <section className="profile-card">

              <div className="profile-card-header">
                <div>
                  <span>
                    REFERRAL INFORMATION
                  </span>

                  <h2>
                    Your Referral Code
                  </h2>
                </div>

                <div className="profile-card-icon referral">
                  %
                </div>
              </div>

              <p className="profile-card-description">
                Your referral code is automatically
                assigned to your account. Use the
                Referral Center to share your referral
                link and monitor referral activity.
              </p>

              <div className="profile-referral-box">

                <div>
                  <span>
                    REFERRAL CODE
                  </span>

                  <strong>
                    {profile?.referral_code ||
                      "Not available"}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={copyReferralCode}
                  disabled={!profile?.referral_code}
                >
                  Copy Code
                </button>

              </div>

              <Link
                href="/dashboard/referrals"
                className="profile-referral-link"
              >
                Open Referral Center
                <span aria-hidden="true">
                  →
                </span>
              </Link>

            </section>

            <section className="profile-card">

              <div className="profile-card-header">
                <div>
                  <span>
                    ACCOUNT STATUS
                  </span>

                  <h2>
                    Account Information
                  </h2>
                </div>

                <div className="profile-card-icon">
                  ✓
                </div>
              </div>

              <div className="account-information-grid">

                <div className="account-information-item">
                  <span>
                    ACCOUNT STATUS
                  </span>

                  <div
                    className={getAccountClass(
                      profile?.account_status || null
                    )}
                  >
                    <span className="status-dot" />
                    {formatStatus(
                      profile?.account_status ||
                        null
                    )}
                  </div>
                </div>

                <div className="account-information-item">
                  <span>
                    VERIFICATION STATUS
                  </span>

                  <div
                    className={getVerificationClass(
                      profile?.verification_status ||
                        null
                    )}
                  >
                    <span className="status-dot" />
                    {formatStatus(
                      profile?.verification_status ||
                        null
                    )}
                  </div>
                </div>

                <div className="account-information-item">
                  <span>
                    MEMBER SINCE
                  </span>

                  <strong>
                    {formatDate(
                      profile?.created_at || null
                    )}
                  </strong>
                </div>

                <div className="account-information-item">
                  <span>
                    USER ID
                  </span>

                  <strong className="account-id">
                    {profile?.id
                      ? `${profile.id.slice(
                          0,
                          12
                        )}...`
                      : "—"}
                  </strong>
                </div>

              </div>

            </section>

          </div>

        </section>

        <div className="profile-footer-note">
          <span>✓</span>
          Your personal profile information is
          protected by your account security policies.
        </div>

      </div>
    </main>
  );
}