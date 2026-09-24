"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import "./login.css";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Authentication failed.");
      }

      /*
       * Verify that the authenticated user is actually
       * registered as an active administrator.
       */
      const { data: adminRecord, error: adminError } = await supabase
        .from("admin_users")
        .select("id, role, is_active")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (adminError) {
        await supabase.auth.signOut();
        throw new Error(
          "Unable to verify administrator access. Please try again."
        );
      }

      if (!adminRecord) {
        await supabase.auth.signOut();
        throw new Error(
          "This account does not have administrator privileges."
        );
      }

      if (!adminRecord.is_active) {
        await supabase.auth.signOut();
        throw new Error(
          "Your administrator account has been disabled."
        );
      }

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="login-background">
        <div className="grid-overlay" />
        <div className="glow glow-one" />
        <div className="glow glow-two" />
      </div>

      <section className="admin-login-card">
        <div className="login-brand">
          <div className="brand-mark">
            M
          </div>

          <div>
            <h1>ADMIN COMMAND</h1>
            <p>SECURE MANAGEMENT PORTAL</p>
          </div>
        </div>

        <div className="login-divider" />

        <div className="login-heading">
          <span className="status-dot" />
          <span>AUTHORIZED PERSONNEL ONLY</span>
        </div>

        <h2>Welcome Back</h2>

        <p className="login-description">
          Sign in to access the platform administration center.
        </p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="email">ADMIN EMAIL</label>

            <div className="input-wrapper">
              <span className="input-icon">@</span>

              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">PASSWORD</label>

            <div className="input-wrapper">
              <span className="input-icon">●</span>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                AUTHENTICATING...
              </>
            ) : (
              <>
                ACCESS ADMIN CENTER
                <span>→</span>
              </>
            )}
          </button>
        </form>

        <div className="security-note">
          <span>◆</span>
          <p>
            Protected by Supabase Authentication and administrator
            authorization controls.
          </p>
        </div>

        <div className="login-footer">
          <span>SECURE ADMIN ACCESS</span>
          <span>•</span>
          <span>AUTHORIZED USERS ONLY</span>
        </div>
      </section>
    </main>
  );
}