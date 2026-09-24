"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import "./auth.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/dashboard");
        return;
      }

      if (mounted) {
        setChecking(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw new Error(loginError.message);
      }

      if (!data.session) {
        throw new Error("Unable to create a secure session.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="auth-page auth-loading-page">
        <div className="loading-orbit">
          <div />
        </div>

        <p>SECURE CONNECTION</p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-background">
        <div className="auth-grid" />

        <div className="energy-line energy-line-one" />
        <div className="energy-line energy-line-two" />

        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="orb orb-three" />

        <div className="floating-particle particle-one" />
        <div className="floating-particle particle-two" />
        <div className="floating-particle particle-three" />
        <div className="floating-particle particle-four" />
        <div className="floating-particle particle-five" />
        <div className="floating-particle particle-six" />
      </div>

      <div className="auth-layout">
        {/* LEFT SIDE */}
        <section className="auth-showcase">
          <div className="brand">
            <div className="brand-icon">M</div>

            <div>
              <strong>MERIDIAN</strong>
              <span>FINANCIAL NETWORK</span>
            </div>
          </div>

          <div className="showcase-content">
            <div className="live-status">
              <span className="live-dot" />
              SYSTEM ONLINE
            </div>

            <h1>
              Your wealth.
              <br />
              <span>Engineered.</span>
            </h1>

            <p>
              Access a modern digital investment environment built
              around transparency, intelligent portfolio management,
              and secure financial technology.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">↗</div>
                <div>
                  <strong>SMART INVESTING</strong>
                  <span>Manage your investment portfolio.</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">◇</div>
                <div>
                  <strong>SECURE WALLET</strong>
                  <span>Monitor your digital asset balances.</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">◈</div>
                <div>
                  <strong>REAL-TIME CONTROL</strong>
                  <span>Track transactions and account activity.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="showcase-footer">
            <span>FINTECH SYSTEM</span>
            <span>•</span>
            <span>SECURE ACCESS</span>
            <span>•</span>
            <span>24/7</span>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="auth-panel">
          <div className="auth-card">
            <div className="mobile-brand">
              <div className="brand-icon">M</div>

              <div>
                <strong>MERIDIAN</strong>
                <span>FINANCIAL NETWORK</span>
              </div>
            </div>

            <div className="auth-card-top">
              <div className="auth-eyebrow">
                <span className="status-pulse" />
                SECURE MEMBER ACCESS
              </div>

              <h2>Welcome back.</h2>

              <p>
                Sign in to continue to your financial dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              <div className="field">
                <label htmlFor="login-email">EMAIL ADDRESS</label>

                <div className="input-box">
                  <span className="input-symbol">@</span>

                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="login-password">PASSWORD</label>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>

                <div className="input-box">
                  <span className="input-symbol">◆</span>

                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="auth-alert error-alert">
                  <div className="alert-icon">!</div>

                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="auth-alert success-alert">
                  <div className="alert-icon">✓</div>

                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className="primary-auth-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="button-spinner" />
                    AUTHENTICATING
                  </>
                ) : (
                  <>
                    SIGN IN
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>NEW TO THE PLATFORM?</span>
            </div>

            <Link
              href="/signup"
              className="secondary-auth-button"
            >
              CREATE AN ACCOUNT
              <span>+</span>
            </Link>

            <div className="security-footer">
              <span className="lock-icon">◇</span>

              <p>
                Your connection is protected by secure
                authentication technology.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}