"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./verifications.css";

type VerificationRow = {
  id: string;
  user_id: string;
  document_type: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  full_name: string | null;
  email: string | null;
  username: string | null;
};

export default function AdminVerificationsPage() {
  const [documents, setDocuments] = useState<
    VerificationRow[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] =
    useState<string | null>(null);

  const [selectedDocument, setSelectedDocument] =
    useState<VerificationRow | null>(null);

  const [documentUrl, setDocumentUrl] =
    useState<string | null>(null);

  const [openingDocument, setOpeningDocument] =
    useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadVerifications();
  }, []);

  // =========================================================
  // CHECK ADMIN
  // =========================================================

  async function checkAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Authentication error:",
        userError
      );

      window.location.href = "/crypto-investment-platform/login";

      return false;
    }

    if (!user) {
      window.location.href = "/crypto-investment-platform/login";

      return false;
    }

    const {
      data: admin,
      error: adminError,
    } = await supabase
      .from("admin_users")
      .select("id, is_active")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError) {
      console.error(
        "Admin check error:",
        adminError
      );

      alert(
        "Unable to verify administrator access:\n\n" +
          adminError.message
      );

      return false;
    }

    if (!admin) {
      window.location.href = "/crypto-investment-platform/dashboard";

      return false;
    }

    return true;
  }

  // =========================================================
  // LOAD VERIFICATIONS
  // =========================================================

  async function loadVerifications() {
    setLoading(true);

    try {
      const isAdmin = await checkAdmin();

      if (!isAdmin) {
        return;
      }

      console.log(
        "Loading verification records..."
      );

      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_get_verifications"
      );

      if (error) {
        console.error(
          "Verification RPC error:",
          error
        );

        alert(
          "Unable to load verification records:\n\n" +
            error.message
        );

        setDocuments([]);

        setStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        });

        return;
      }

      console.log(
        "Verification records returned:",
        data
      );

      const rows =
        (data as VerificationRow[]) || [];

      setDocuments(rows);

      setStats({
        total: rows.length,

        pending: rows.filter(
          (item) =>
            item.status === "pending"
        ).length,

        approved: rows.filter(
          (item) =>
            item.status === "approved"
        ).length,

        rejected: rows.filter(
          (item) =>
            item.status === "rejected"
        ).length,
      });
    } catch (error) {
      console.error(
        "Unexpected verification error:",
        error
      );

      alert(
        "An unexpected error occurred while loading verification records."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // OPEN VERIFICATION DOCUMENT
  // =========================================================

  async function openDocument(
    document: VerificationRow
  ) {
    setOpeningDocument(true);

    setSelectedDocument(document);

    setDocumentUrl(null);

    try {
      console.log(
        "Opening verification document:",
        document.storage_path
      );

      const {
        data,
        error,
      } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(
          document.storage_path,
          300
        );

      if (error) {
        console.error(
          "Signed URL error:",
          error
        );

        alert(
          "Unable to open this verification document:\n\n" +
            error.message
        );

        return;
      }

      if (!data?.signedUrl) {
        alert(
          "The document URL could not be generated."
        );

        return;
      }

      setDocumentUrl(
        data.signedUrl
      );
    } catch (error) {
      console.error(
        "Document opening error:",
        error
      );

      alert(
        "Unable to open the document."
      );
    } finally {
      setOpeningDocument(false);
    }
  }

  // =========================================================
  // CLOSE DOCUMENT MODAL
  // =========================================================

  function closeDocument() {
    setSelectedDocument(null);
    setDocumentUrl(null);
  }

  // =========================================================
  // APPROVE VERIFICATION
  // =========================================================

  async function approveVerification(
    documentId: string
  ) {
    const confirmed =
      window.confirm(
        "Approve this identity verification?"
      );

    if (!confirmed) {
      return;
    }

    setProcessing(documentId);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_review_verification",
        {
          p_document_id:
            documentId,

          p_status:
            "approved",

          p_rejection_reason:
            null,
        }
      );

      if (error) {
        console.error(
          "Approval RPC error:",
          error
        );

        alert(
          "Approval failed:\n\n" +
            error.message
        );

        return;
      }

      console.log(
        "Approval result:",
        data
      );

      alert(
        "Verification approved successfully."
      );

      closeDocument();

      await loadVerifications();
    } catch (error) {
      console.error(
        "Approval error:",
        error
      );

      alert(
        "An unexpected error occurred while approving the verification."
      );
    } finally {
      setProcessing(null);
    }
  }

  // =========================================================
  // REJECT VERIFICATION
  // =========================================================

  async function rejectVerification(
    documentId: string
  ) {
    const reason =
      window.prompt(
        "Enter the reason for rejecting this verification:"
      );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      alert(
        "Please enter a rejection reason."
      );

      return;
    }

    setProcessing(documentId);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_review_verification",
        {
          p_document_id:
            documentId,

          p_status:
            "rejected",

          p_rejection_reason:
            reason.trim(),
        }
      );

      if (error) {
        console.error(
          "Rejection RPC error:",
          error
        );

        alert(
          "Rejection failed:\n\n" +
            error.message
        );

        return;
      }

      console.log(
        "Rejection result:",
        data
      );

      alert(
        "Verification rejected successfully."
      );

      closeDocument();

      await loadVerifications();
    } catch (error) {
      console.error(
        "Rejection error:",
        error
      );

      alert(
        "An unexpected error occurred while rejecting the verification."
      );
    } finally {
      setProcessing(null);
    }
  }

  // =========================================================
  // FORMAT DOCUMENT TYPE
  // =========================================================

  function formatDocumentType(
    type: string
  ) {
    switch (type) {
      case "passport":
        return "Passport";

      case "national_id":
        return "National ID";

      case "drivers_license":
        return "Driver's License";

      default:
        return type;
    }
  }

  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "—";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleString();
  }

  // =========================================================
  // FORMAT FILE SIZE
  // =========================================================

  function formatFileSize(
    bytes: number | null
  ) {
    if (
      bytes === null ||
      bytes === undefined
    ) {
      return "Unknown size";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
  }

  // =========================================================
  // GET DISPLAY NAME
  // =========================================================

  function getDisplayName(
    row: VerificationRow
  ) {
    return (
      row.full_name ||
      row.username ||
      row.email ||
      "Unknown User"
    );
  }

  // =========================================================
  // GET EMAIL
  // =========================================================

  function getEmail(
    row: VerificationRow
  ) {
    return (
      row.email ||
      "No email available"
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="verification-page">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="verification-sidebar">

        <div className="verification-brand">

          <div className="verification-brand-mark">
            M
          </div>

          <div>
            <strong>
              ADMIN PANEL
            </strong>

            <span>
              Investment Platform
            </span>
          </div>

        </div>


        <nav className="verification-nav">

          <Link href="/admin">

            <span>
              ⌂
            </span>

            Dashboard

          </Link>


          <Link href="/admin/users">

            <span>
              ◎
            </span>

            Users

          </Link>


          <Link
            href="/admin/verifications"
            className="active"
          >

            <span>
              ✓
            </span>

            Identity Verification

          </Link>


          <Link href="/admin/deposits">

            <span>
              ↓
            </span>

            Deposits

          </Link>


          <Link href="/admin/withdrawals">

            <span>
              ↑
            </span>

            Withdrawals

          </Link>


          <Link href="/admin/investments">

            <span>
              ◈
            </span>

            Investments

          </Link>


          <Link href="/admin/transactions">

            <span>
              ↔
            </span>

            Transactions

          </Link>

        </nav>


        <div className="verification-sidebar-bottom">

          <Link href="/dashboard">

            ← Back to User Dashboard

          </Link>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="verification-main">

        {/* HEADER */}

        <header className="verification-header">

          <div>

            <div className="verification-eyebrow">
              ADMINISTRATION
            </div>

            <h1>
              Identity Verification
            </h1>

            <p>
              Review and manage investor
              identity verification requests.
            </p>

          </div>


          <button
            className="refresh-button"
            onClick={loadVerifications}
            disabled={loading}
          >

            ↻ Refresh

          </button>

        </header>


        {/* =================================================
            STATISTICS
        ================================================== */}

        <section className="verification-stats">

          <div className="verification-stat-card">

            <span className="stat-label">
              Total Requests
            </span>

            <strong>
              {stats.total}
            </strong>

            <small>
              All submissions
            </small>

          </div>


          <div className="verification-stat-card pending">

            <span className="stat-label">
              Pending
            </span>

            <strong>
              {stats.pending}
            </strong>

            <small>
              Awaiting review
            </small>

          </div>


          <div className="verification-stat-card approved">

            <span className="stat-label">
              Approved
            </span>

            <strong>
              {stats.approved}
            </strong>

            <small>
              Verified investors
            </small>

          </div>


          <div className="verification-stat-card rejected">

            <span className="stat-label">
              Rejected
            </span>

            <strong>
              {stats.rejected}
            </strong>

            <small>
              Declined requests
            </small>

          </div>

        </section>


        {/* =================================================
            VERIFICATION REQUESTS
        ================================================== */}

        <section className="verification-panel">

          <div className="verification-panel-header">

            <div>

              <h2>
                Verification Requests
              </h2>

              <p>
                Identity documents submitted
                by investors.
              </p>

            </div>

          </div>


          {loading ? (

            /* LOADING */

            <div className="verification-loading">

              <div className="loading-spinner"></div>

              <p>
                Loading verification requests...
              </p>

            </div>

          ) : documents.length === 0 ? (

            /* EMPTY */

            <div className="verification-empty">

              <div className="empty-icon">
                ✓
              </div>

              <h3>
                No verification requests
              </h3>

              <p>
                There are currently no identity
                verification submissions.
              </p>

            </div>

          ) : (

            /* TABLE */

            <div className="verification-table-wrapper">

              <table className="verification-table">

                <thead>

                  <tr>

                    <th>
                      Investor
                    </th>

                    <th>
                      Document
                    </th>

                    <th>
                      Submitted
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {documents.map(
                    (document) => (

                    <tr
                      key={
                        document.id
                      }
                    >

                      {/* INVESTOR */}

                      <td>

                        <div className="investor-cell">

                          <div className="investor-avatar">

                            {getDisplayName(
                              document
                            )
                              .charAt(0)
                              .toUpperCase()}

                          </div>


                          <div>

                            <strong>
                              {getDisplayName(
                                document
                              )}
                            </strong>

                            <span>
                              {getEmail(
                                document
                              )}
                            </span>

                          </div>

                        </div>

                      </td>


                      {/* DOCUMENT */}

                      <td>

                        <div
                          style={{
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            gap:
                              "4px",
                          }}
                        >

                          <span className="document-type">

                            {formatDocumentType(
                              document.document_type
                            )}

                          </span>

                          {document.original_file_name && (

                            <small
                              style={{
                                opacity:
                                  0.6,
                                fontSize:
                                  "11px",
                              }}
                            >
                              {
                                document.original_file_name
                              }
                            </small>

                          )}

                        </div>

                      </td>


                      {/* SUBMITTED */}

                      <td>

                        <span className="date-cell">

                          {formatDate(
                            document.submitted_at ||
                              document.created_at
                          )}

                        </span>

                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={`status-badge ${document.status}`}
                        >

                          <span></span>

                          {document.status
                            .charAt(0)
                            .toUpperCase() +
                            document.status.slice(
                              1
                            )}

                        </span>

                      </td>


                      {/* ACTIONS */}

                      <td>

                        <div className="verification-actions">

                          <button
                            className="view-button"
                            onClick={() =>
                              openDocument(
                                document
                              )
                            }
                          >
                            View ID
                          </button>


                          {document.status ===
                            "pending" && (

                            <>

                              <button
                                className="approve-button"
                                disabled={
                                  processing ===
                                  document.id
                                }
                                onClick={() =>
                                  approveVerification(
                                    document.id
                                  )
                                }
                              >

                                {processing ===
                                document.id
                                  ? "..."
                                  : "Approve"}

                              </button>


                              <button
                                className="reject-button"
                                disabled={
                                  processing ===
                                  document.id
                                }
                                onClick={() =>
                                  rejectVerification(
                                    document.id
                                  )
                                }
                              >

                                Reject

                              </button>

                            </>

                          )}

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


      {/* =====================================================
          DOCUMENT MODAL
      ====================================================== */}

      {selectedDocument && (

        <div
          className="document-modal-overlay"
          onClick={closeDocument}
        >

          <div
            className="document-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="document-modal-header">

              <div>

                <span>
                  IDENTITY DOCUMENT
                </span>

                <h2>

                  {formatDocumentType(
                    selectedDocument.document_type
                  )}

                </h2>

              </div>


              <button
                className="modal-close"
                onClick={closeDocument}
              >

                ×

              </button>

            </div>


            {/* USER INFORMATION */}

            <div className="document-modal-user">

              <strong>

                {getDisplayName(
                  selectedDocument
                )}

              </strong>

              <span>

                {getEmail(
                  selectedDocument
                )}

              </span>

            </div>


            {/* FILE INFORMATION */}

            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap:
                  "14px",
                padding:
                  "12px 0",
                fontSize:
                  "12px",
                opacity:
                  0.75,
              }}
            >

              <span>
                File:{" "}
                {selectedDocument.original_file_name ||
                  "Unknown"}
              </span>

              <span>
                Type:{" "}
                {selectedDocument.mime_type ||
                  "Unknown"}
              </span>

              <span>
                Size:{" "}
                {formatFileSize(
                  selectedDocument.file_size
                )}
              </span>

            </div>


            {/* DOCUMENT PREVIEW */}

            <div className="document-preview">

              {openingDocument ? (

                <div className="preview-loading">

                  <div className="loading-spinner"></div>

                  <p>
                    Opening secure document...
                  </p>

                </div>

              ) : documentUrl ? (

                <iframe
                  src={documentUrl}
                  title="Identity document"
                  className="document-frame"
                />

              ) : (

                <div className="preview-error">

                  <strong>
                    Document unavailable
                  </strong>

                  <p>
                    The document could not
                    be opened.
                  </p>

                </div>

              )}

            </div>


            {/* MODAL ACTIONS */}

            {selectedDocument.status ===
              "pending" && (

              <div className="modal-actions">

                <button
                  className="modal-approve"
                  disabled={
                    processing ===
                    selectedDocument.id
                  }
                  onClick={() =>
                    approveVerification(
                      selectedDocument.id
                    )
                  }
                >

                  ✓ Approve Verification

                </button>


                <button
                  className="modal-reject"
                  disabled={
                    processing ===
                    selectedDocument.id
                  }
                  onClick={() =>
                    rejectVerification(
                      selectedDocument.id
                    )
                  }
                >

                  × Reject Verification

                </button>

              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
}
