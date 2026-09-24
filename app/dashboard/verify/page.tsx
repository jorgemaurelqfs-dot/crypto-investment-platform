"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import "./verify.css";

type Verification = {
  id: string;
  document_type: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Profile = {
  full_name: string | null;
  username: string | null;
  verification_status: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function VerifyPage() {
  const router = useRouter();

  const [verification, setVerification] =
    useState<Verification | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [documentType, setDocumentType] =
    useState("passport");

  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    loadVerification();
  }, []);

  /* ============================================================
     LOAD VERIFICATION
     ============================================================ */

  async function loadVerification() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const [
        profileResult,
        verificationResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name, username, verification_status"
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("verification_documents")
          .select(
            `
              id,
              document_type,
              storage_path,
              original_file_name,
              mime_type,
              file_size,
              status,
              rejection_reason,
              submitted_at,
              reviewed_at,
              created_at
            `
          )
          .eq("user_id", user.id)
          .order("submitted_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (verificationResult.error) {
        throw verificationResult.error;
      }

      setProfile(
        profileResult.data || null
      );

      setVerification(
        verificationResult.data || null
      );
    } catch (err: any) {
      console.error(
        "Load verification error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load verification information."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     FILE CHANGE
     ============================================================ */

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setSuccess("");

    const selected =
      event.target.files?.[0];

    if (!selected) {
      setFile(null);
      return;
    }

    if (
      !ALLOWED_TYPES.includes(
        selected.type
      )
    ) {
      setError(
        "Please upload a JPG, PNG, WEBP image or PDF document."
      );

      event.target.value = "";
      setFile(null);

      return;
    }

    if (
      selected.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "The maximum file size is 10 MB."
      );

      event.target.value = "";
      setFile(null);

      return;
    }

    setFile(selected);
  }

  /* ============================================================
     SUBMIT VERIFICATION
     ============================================================ */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!file) {
      setError(
        "Please select your identification document."
      );

      return;
    }

    try {
      setUploading(true);

      /* --------------------------------------------------------
         AUTH USER
         -------------------------------------------------------- */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      /* --------------------------------------------------------
         CHECK EXISTING VERIFICATION
         -------------------------------------------------------- */

      const {
        data: existingVerification,
        error: existingError,
      } = await supabase
        .from("verification_documents")
        .select(
          `
            id,
            document_type,
            storage_path,
            original_file_name,
            mime_type,
            file_size,
            status,
            rejection_reason,
            submitted_at,
            reviewed_at,
            created_at
          `
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (
        existingVerification &&
        existingVerification.status ===
          "pending"
      ) {
        setVerification(
          existingVerification
        );

        setError(
          "You already have a verification submission under review."
        );

        return;
      }

      if (
        existingVerification &&
        existingVerification.status ===
          "approved"
      ) {
        setVerification(
          existingVerification
        );

        setError(
          "Your identity has already been verified."
        );

        return;
      }

      /* --------------------------------------------------------
         CREATE UNIQUE STORAGE PATH
         -------------------------------------------------------- */

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "file";

      const storagePath =
        `${user.id}/${crypto.randomUUID()}.${extension}`;

      /* --------------------------------------------------------
         UPLOAD FILE
         -------------------------------------------------------- */

      const {
        error: uploadError,
      } = await supabase.storage
        .from("verification-documents")
        .upload(
          storagePath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      /* --------------------------------------------------------
         INSERT DATABASE RECORD
         -------------------------------------------------------- */

      const {
        data: verificationRecord,
        error: insertError,
      } = await supabase
        .from("verification_documents")
        .insert({
          user_id: user.id,

          document_type:
            documentType,

          storage_path:
            storagePath,

          original_file_name:
            file.name,

          mime_type:
            file.type,

          file_size:
            file.size,

          status:
            "pending",
        })
        .select(
          `
            id,
            document_type,
            storage_path,
            original_file_name,
            mime_type,
            file_size,
            status,
            rejection_reason,
            submitted_at,
            reviewed_at,
            created_at
          `
        )
        .single();

      /* --------------------------------------------------------
         DATABASE INSERT FAILED
         -------------------------------------------------------- */

      if (insertError) {
        await supabase.storage
          .from("verification-documents")
          .remove([
            storagePath,
          ]);

        throw insertError;
      }

      /* --------------------------------------------------------
         VERIFICATION RECORD IS NOW SUCCESSFULLY CREATED
         -------------------------------------------------------- */

      setVerification(
        verificationRecord
      );

      /*
       * Update the profile separately.
       *
       * IMPORTANT:
       * Failure here will NOT delete the verification record.
       */

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({
          verification_status:
            "pending",
        })
        .eq("id", user.id);

      if (profileError) {
        console.error(
          "Profile verification status update failed:",
          profileError
        );

        /*
         * Do not treat this as a failed verification
         * submission because the verification_documents
         * record was already successfully created.
         */
      }

      /* --------------------------------------------------------
         UPDATE LOCAL PROFILE STATE
         -------------------------------------------------------- */

      setProfile(
        (previous) => ({
          ...(previous || {
            full_name: null,
            username: null,
          }),

          verification_status:
            "pending",
        })
      );

      setFile(null);

      setSuccess(
        "Your verification document has been submitted successfully."
      );

      /* --------------------------------------------------------
         CLEAR FILE INPUT
         -------------------------------------------------------- */

      const input =
        document.getElementById(
          "identity-document"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

    } catch (err: any) {
      console.error(
        "Verification submission error:",
        err
      );

      setError(
        err?.message ||
          "Unable to submit verification."
      );
    } finally {
      setUploading(false);
    }
  }

  /* ============================================================
     STATUS
     ============================================================ */

  function getStatus() {
    return (
      verification?.status ||
      profile?.verification_status ||
      "unverified"
    ).toLowerCase();
  }

  function getStatusTitle() {
    const status =
      getStatus();

    if (
      status === "approved" ||
      status === "verified"
    ) {
      return "Identity Verified";
    }

    if (
      status === "pending"
    ) {
      return "Verification Pending";
    }

    if (
      status === "rejected"
    ) {
      return "Verification Requires Attention";
    }

    return "Identity Verification";
  }

  function getStatusText() {
    const status =
      getStatus();

    if (
      status === "approved" ||
      status === "verified"
    ) {
      return "Your identity verification has been completed successfully.";
    }

    if (
      status === "pending"
    ) {
      return "Your identification document has been received and is currently awaiting review.";
    }

    if (
      status === "rejected"
    ) {
      return (
        verification?.rejection_reason ||
        "Your previous verification submission was not approved. You may submit a new document."
      );
    }

    return "Verify your identity by submitting a valid government-issued identification document.";
  }

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <main className="verify-page">

        <div className="verify-loading">

          <div className="verify-loader" />

          <h2>
            Loading verification
          </h2>

          <p>
            Preparing your secure
            verification area...
          </p>

        </div>

      </main>
    );
  }

  const status =
    getStatus();

  const isVerified =
    status === "verified" ||
    status === "approved";

  /* ============================================================
     PAGE
     ============================================================ */

  return (
    <main className="verify-page">

      <div className="verify-shell">

        {/* HEADER */}

        <header className="verify-header">

          <Link
            href="/dashboard"
            className="verify-back"
          >
            ← Dashboard
          </Link>

          <div className="verify-brand">

            <div className="verify-brand-mark">
              ◆
            </div>

            <div>

              <strong>
                INVESTOR
              </strong>

              <span>
                PORTAL
              </span>

            </div>

          </div>

          <div className="verify-secure">

            <span>
              ✓
            </span>

            Secure Verification

          </div>

        </header>


        {/* CONTENT */}

        <div className="verify-content">

          {/* INTRO */}

          <div className="verify-intro">

            <span className="verify-kicker">
              ACCOUNT SECURITY
            </span>

            <h1>
              Verify your identity
            </h1>

            <p>
              Complete identity verification
              by submitting a valid
              government-issued identification
              document.
            </p>

          </div>


          {/* STATUS */}

          <section
            className={`verify-status-card ${status}`}
          >

            <div className="verify-status-icon">

              {isVerified
                ? "✓"
                : status === "pending"
                ? "⏳"
                : status === "rejected"
                ? "!"
                : "○"}

            </div>

            <div className="verify-status-content">

              <span>
                CURRENT STATUS
              </span>

              <h2>
                {getStatusTitle()}
              </h2>

              <p>
                {getStatusText()}
              </p>

            </div>

          </section>


          {/* ERROR */}

          {error && (
            <div className="verify-message error">

              <span>
                !
              </span>

              <div>

                <strong>
                  Something went wrong
                </strong>

                <p>
                  {error}
                </p>

              </div>

            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div className="verify-message success">

              <span>
                ✓
              </span>

              <div>

                <strong>
                  Submission received
                </strong>

                <p>
                  {success}
                </p>

              </div>

            </div>
          )}


          {/* VERIFIED */}

          {isVerified ? (

            <section className="verify-complete">

              <div className="complete-icon">
                ✓
              </div>

              <h2>
                Your account is verified
              </h2>

              <p>
                Your submitted identity
                information has been reviewed
                and approved.
              </p>

              <Link
                href="/dashboard"
                className="verify-primary-button"
              >
                Return to Dashboard
                <span>
                  →
                </span>
              </Link>

            </section>

          ) : status === "pending" ? (

            /* PENDING */

            <section className="verify-pending">

              <div className="pending-icon">
                ⏳
              </div>

              <h2>
                Document submitted
              </h2>

              <p>
                Your verification request is
                currently under review. You
                don't need to submit another
                document unless requested.
              </p>

              {verification && (
                <div className="submission-details">

                  <div>

                    <span>
                      Document
                    </span>

                    <strong>
                      {verification.document_type}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Submitted
                    </span>

                    <strong>

                      {verification.submitted_at
                        ? new Date(
                            verification.submitted_at
                          ).toLocaleDateString(
                            "en-US",
                            {
                              month:
                                "short",
                              day:
                                "numeric",
                              year:
                                "numeric",
                            }
                          )
                        : "Pending"}

                    </strong>

                  </div>

                  <div>

                    <span>
                      Status
                    </span>

                    <strong>
                      Pending review
                    </strong>

                  </div>

                </div>
              )}

              <Link
                href="/dashboard"
                className="verify-secondary-button"
              >
                Return to Dashboard
              </Link>

            </section>

          ) : (

            /* UPLOAD FORM */

            <section className="verify-form-card">

              <div className="verify-form-heading">

                <span>
                  STEP 01
                </span>

                <h2>
                  Select identification type
                </h2>

                <p>
                  Choose the government-issued
                  document you are submitting.
                </p>

              </div>


              <form
                onSubmit={handleSubmit}
              >

                {/* DOCUMENT TYPES */}

                <div className="document-types">

                  {/* PASSPORT */}

                  <label
                    className={`document-type ${
                      documentType ===
                      "passport"
                        ? "selected"
                        : ""
                    }`}
                  >

                    <input
                      type="radio"
                      name="documentType"
                      value="passport"
                      checked={
                        documentType ===
                        "passport"
                      }
                      onChange={(event) =>
                        setDocumentType(
                          event.target.value
                        )
                      }
                    />

                    <span className="document-type-icon">
                      ▣
                    </span>

                    <span>

                      <strong>
                        Passport
                      </strong>

                      <small>
                        International passport
                      </small>

                    </span>

                    <i>
                      ✓
                    </i>

                  </label>


                  {/* NATIONAL ID */}

                  <label
                    className={`document-type ${
                      documentType ===
                      "national_id"
                        ? "selected"
                        : ""
                    }`}
                  >

                    <input
                      type="radio"
                      name="documentType"
                      value="national_id"
                      checked={
                        documentType ===
                        "national_id"
                      }
                      onChange={(event) =>
                        setDocumentType(
                          event.target.value
                        )
                      }
                    />

                    <span className="document-type-icon">
                      ▤
                    </span>

                    <span>

                      <strong>
                        National ID
                      </strong>

                      <small>
                        Government identity card
                      </small>

                    </span>

                    <i>
                      ✓
                    </i>

                  </label>


                  {/* DRIVER LICENSE */}

                  <label
                    className={`document-type ${
                      documentType ===
                      "drivers_license"
                        ? "selected"
                        : ""
                    }`}
                  >

                    <input
                      type="radio"
                      name="documentType"
                      value="drivers_license"
                      checked={
                        documentType ===
                        "drivers_license"
                      }
                      onChange={(event) =>
                        setDocumentType(
                          event.target.value
                        )
                      }
                    />

                    <span className="document-type-icon">
                      ▥
                    </span>

                    <span>

                      <strong>
                        Driver's License
                      </strong>

                      <small>
                        Valid government-issued
                        license
                      </small>

                    </span>

                    <i>
                      ✓
                    </i>

                  </label>

                </div>


                {/* UPLOAD */}

                <div className="verify-form-heading upload-heading">

                  <span>
                    STEP 02
                  </span>

                  <h2>
                    Upload your document
                  </h2>

                  <p>
                    Upload a clear image or PDF
                    showing the document details.
                  </p>

                </div>


                <label
                  htmlFor="identity-document"
                  className={`document-upload ${
                    file
                      ? "has-file"
                      : ""
                  }`}
                >

                  <input
                    id="identity-document"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={
                      handleFileChange
                    }
                  />

                  <div className="upload-icon">

                    {file
                      ? "✓"
                      : "↑"}

                  </div>

                  <strong>

                    {file
                      ? file.name
                      : "Upload identification document"}

                  </strong>

                  <span>

                    {file
                      ? `${(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(2)} MB`
                      : "JPG, PNG, WEBP or PDF • Maximum 10 MB"}

                  </span>

                  {!file && (
                    <b>
                      Choose file
                    </b>
                  )}

                </label>


                {/* REQUIREMENTS */}

                <div className="verification-requirements">

                  <strong>
                    Document requirements
                  </strong>

                  <div>

                    <span>
                      ✓
                    </span>

                    Document must be valid
                    and government issued

                  </div>

                  <div>

                    <span>
                      ✓
                    </span>

                    All important details
                    must be clearly visible

                  </div>

                  <div>

                    <span>
                      ✓
                    </span>

                    Image must not be
                    cropped or heavily blurred

                  </div>

                  <div>

                    <span>
                      ✓
                    </span>

                    Do not upload passwords,
                    payment cards or unrelated
                    documents

                  </div>

                </div>


                {/* SUBMIT */}

                <button
                  type="submit"
                  className="verify-submit-button"
                  disabled={
                    uploading ||
                    !file
                  }
                >

                  {uploading ? (
                    <>
                      <span className="button-spinner" />

                      Submitting securely...
                    </>
                  ) : (
                    <>
                      Submit for verification

                      <span>
                        →
                      </span>
                    </>
                  )}

                </button>

              </form>

            </section>

          )}


          {/* PRIVACY */}

          <div className="verify-privacy">

            <div>

              <span>
                ✓
              </span>

            </div>

            <p>

              <strong>
                Your document is private.
              </strong>{" "}

              Identification documents are
              stored in a protected verification
              area and are only accessible to
              authorized verification personnel.

            </p>

          </div>

        </div>

      </div>

    </main>
  );
}