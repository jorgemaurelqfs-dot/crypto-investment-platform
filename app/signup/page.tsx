"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import "../login/auth.css";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [agree, setAgree] = useState(false);

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

  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: "ENTER PASSWORD",
      };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      return {
        score,
        label: "WEAK",
      };
    }

    if (score <= 3) {
      return {
        score,
        label: "MODERATE",
      };
    }

    if (score === 4) {
      return {
        score,
        label: "STRONG",
      };
    }

    return {
      score,
      label: "VERY STRONG",
    };
  }, [password]);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !fullName.trim() ||
      !username.trim() ||
      !phone.trim() ||
      !country.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must contain at least 3 characters.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (!agree) {
      setError(
        "Please confirm that you agree to the platform terms."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Referral code is passed through metadata.
       *
       * Your existing handle_new_user() trigger can use
       * full_name to create the profile automatically.
       */
      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim(),
              phone: phone.trim(),
              country: country.trim(),
              referral_code: referralCode.trim() || null,
            },
          },
        });

      if (signupError) {
        throw new Error(signupError.message);
      }

      if (!data.user) {
        throw new Error(
          "Unable to create your account. Please try again."
        );
      }

      /*
       * If Supabase email confirmation is enabled,
       * there may be no active session yet.
       */
      if (!data.session) {
        setMessage(
          "Account created successfully. Please check your email to verify your account."
        );

        setPassword("");
        setConfirmPassword("");

        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account."
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

        <p>INITIALIZING SECURE ACCOUNT</p>
      </main>
    );
  }

  return (
    <main className="auth-page signup-auth-page">
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
        {/* LEFT */}
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
              NEXT-GENERATION FINANCE
            </div>

            <h1>
              Build your
              <br />
              <span>financial future.</span>
            </h1>

            <p>
              Create your account and enter a digital financial
              environment designed for modern investors.
            </p>

            <div className="system-card">
              <div className="system-card-header">
                <span>NETWORK STATUS</span>
                <span className="system-live">
                  ● LIVE
                </span>
              </div>

              <div className="system-bars">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="system-metrics">
                <div>
                  <strong>24/7</strong>
                  <span>ACCESS</span>
                </div>

                <div>
                  <strong>SECURE</strong>
                  <span>AUTH</span>
                </div>

                <div>
                  <strong>REAL</strong>
                  <span>TIME</span>
                </div>
              </div>
            </div>
          </div>

          <div className="showcase-footer">
            <span>DIGITAL FINANCE</span>
            <span>•</span>
            <span>SECURE NETWORK</span>
            <span>•</span>
            <span>2026</span>
          </div>
        </section>

        {/* RIGHT */}
        <section className="auth-panel signup-panel">
          <div className="auth-card signup-card">
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
                CREATE SECURE ACCOUNT
              </div>

              <h2>Start your journey.</h2>

              <p>
                Set up your account in less than a minute.
              </p>
            </div>

            <form
              onSubmit={handleSignup}
              className="auth-form signup-form"
            >
              <div className="two-column">
                <div className="field">
                  <label htmlFor="full-name">FULL NAME</label>

                  <div className="input-box">
                    <span className="input-symbol">◆</span>

                    <input
                      id="full-name"
                      type="text"
                      autoComplete="name"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="username">USERNAME</label>

                  <div className="input-box">
                    <span className="input-symbol">@</span>

                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      placeholder="johndoe"
                      value={username}
                      onChange={(event) =>
                        setUsername(event.target.value)
                      }
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="two-column">
                <div className="field">
                  <label htmlFor="phone">PHONE NUMBER</label>

                  <div className="input-box">
                    <span className="input-symbol">+</span>

                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+234..."
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="country">COUNTRY</label>

                  <div className="input-box">
                    <span className="input-symbol">◎</span>

                    <input
                      id="country"
                      type="text"
                      autoComplete="country-name"
                      placeholder="Nigeria"
                      value={country}
                      onChange={(event) =>
                        setCountry(event.target.value)
                      }
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="signup-email">
                  EMAIL ADDRESS
                </label>

                <div className="input-box">
                  <span className="input-symbol">@</span>

                  <input
                    id="signup-email"
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
                  <label htmlFor="signup-password">
                    PASSWORD
                  </label>

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
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="password-meter">
                  <div className="meter-track">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span
                        key={level}
                        className={
                          level <= passwordStrength.score
                            ? "meter-active"
                            : ""
                        }
                      />
                    ))}
                  </div>

                  <span className="strength-label">
                    {passwordStrength.label}
                  </span>
                </div>
              </div>

              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="confirm-password">
                    CONFIRM PASSWORD
                  </label>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>

                <div className="input-box">
                  <span className="input-symbol">◆</span>

                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="referral">
                  REFERRAL CODE
                  <span className="optional-label">
                    OPTIONAL
                  </span>
                </label>

                <div className="input-box">
                  <span className="input-symbol">◇</span>

                  <input
                    id="referral"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(event) =>
                      setReferralCode(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <label className="agreement">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(event) =>
                    setAgree(event.target.checked)
                  }
                  disabled={loading}
                />

                <span className="custom-check">
                  {agree ? "✓" : ""}
                </span>

                <p>
                  I agree to the platform's terms and
                  acknowledge the account policies.
                </p>
              </label>

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
                    CREATING ACCOUNT
                  </>
                ) : (
                  <>
                    CREATE ACCOUNT
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>ALREADY HAVE AN ACCOUNT?</span>
            </div>

            <Link
              href="/login"
              className="secondary-auth-button"
            >
              SIGN IN
              <span>→</span>
            </Link>

            <div className="security-footer">
              <span className="lock-icon">◇</span>

              <p>
                Your account is protected by secure
                authentication technology.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}