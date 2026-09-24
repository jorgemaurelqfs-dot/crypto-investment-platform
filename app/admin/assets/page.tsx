"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import "./assets.css";

type Asset = {
  id: string;
  name: string;
  symbol: string;
  logo_url: string | null;
  decimals: number;
  is_active: boolean;
};

type Network = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  is_active: boolean;
};

type DepositWallet = {
  id: string;
  currency: string;
  network: string;
  wallet_address: string;
  is_active: boolean;
  wallet_label: string | null;
  asset_id: string | null;
  network_id: string | null;
  created_at: string;
  updated_at: string;
  assets: Asset | null;
  networks: Network | null;
};

type FormState = {
  assetName: string;
  symbol: string;
  logoUrl: string;
  network: string;
  walletAddress: string;
  active: boolean;
};

const emptyForm: FormState = {
  assetName: "",
  symbol: "",
  logoUrl: "",
  network: "",
  walletAddress: "",
  active: true,
};

function shortenAddress(address: string) {
  if (!address) return "—";
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AssetsPage() {
  const [wallets, setWallets] = useState<DepositWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [showModal, setShowModal] = useState(false);
  const [editingWallet, setEditingWallet] =
    useState<DepositWallet | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadWallets();
  }, []);

  async function verifyAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Authentication required.");
    }

    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError) {
      throw new Error(adminError.message);
    }

    if (
      !admin ||
      !admin.is_active ||
      !["admin", "manager"].includes(admin.role)
    ) {
      throw new Error("You do not have permission to manage wallets.");
    }

    return user;
  }

  async function loadWallets() {
    setLoading(true);
    setError("");

    try {
      await verifyAdmin();

      const { data, error: walletError } = await supabase
        .from("deposit_wallets")
        .select(`
          id,
          currency,
          network,
          wallet_address,
          is_active,
          wallet_label,
          asset_id,
          network_id,
          created_at,
          updated_at,
          assets (
            id,
            name,
            symbol,
            logo_url,
            decimals,
            is_active
          ),
          networks (
            id,
            name,
            short_name,
            logo_url,
            is_active
          )
        `)
        .order("created_at", { ascending: false });

      if (walletError) {
        throw new Error(walletError.message);
      }

      setWallets((data || []) as DepositWallet[]);
    } catch (err: any) {
      setError(err?.message || "Unable to load wallet configuration.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingWallet(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setShowModal(true);
  }

  function openEdit(wallet: DepositWallet) {
    setEditingWallet(wallet);

    setForm({
      assetName: wallet.assets?.name || wallet.currency || "",
      symbol: wallet.assets?.symbol || wallet.currency || "",
      logoUrl: wallet.assets?.logo_url || "",
      network:
        wallet.networks?.name ||
        wallet.network ||
        "",
      walletAddress: wallet.wallet_address || "",
      active: wallet.is_active,
    });

    setError("");
    setMessage("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingWallet(null);
    setForm(emptyForm);
  }

  async function findOrCreateAsset() {
    const name = form.assetName.trim();
    const symbol = form.symbol.trim().toUpperCase();

    if (!name) {
      throw new Error("Asset name is required.");
    }

    if (!symbol) {
      throw new Error("Asset symbol is required.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("assets")
      .select("id, name, symbol, logo_url, decimals, is_active")
      .eq("symbol", symbol)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("assets")
        .update({
          name,
          symbol,
          logo_url: form.logoUrl.trim() || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return existing.id;
    }

    const { error: insertError } = await supabase
      .from("assets")
      .insert({
        name,
        symbol,
        logo_url: form.logoUrl.trim() || null,
        decimals: 8,
        is_active: true,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { data: created, error: createdError } = await supabase
      .from("assets")
      .select("id")
      .eq("symbol", symbol)
      .single();

    if (createdError || !created) {
      throw new Error(
        createdError?.message || "Asset was created but could not be retrieved."
      );
    }

    return created.id;
  }

  async function findOrCreateNetwork() {
    const networkName = form.network.trim();

    if (!networkName) {
      throw new Error("Network is required.");
    }

    const shortName = networkName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10);

    const { data: existing, error: existingError } = await supabase
      .from("networks")
      .select("id, name, short_name, logo_url, is_active")
      .ilike("name", networkName)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("networks")
        .update({
          name: networkName,
          short_name: existing.short_name || shortName,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return existing.id;
    }

    const { error: insertError } = await supabase
      .from("networks")
      .insert({
        name: networkName,
        short_name: shortName,
        is_active: true,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { data: created, error: createdError } = await supabase
      .from("networks")
      .select("id")
      .ilike("name", networkName)
      .single();

    if (createdError || !created) {
      throw new Error(
        createdError?.message ||
          "Network was created but could not be retrieved."
      );
    }

    return created.id;
  }

  async function saveWallet() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await verifyAdmin();

      const assetName = form.assetName.trim();
      const symbol = form.symbol.trim().toUpperCase();
      const network = form.network.trim();
      const walletAddress = form.walletAddress.trim();

      if (!assetName) {
        throw new Error("Enter the asset name.");
      }

      if (!symbol) {
        throw new Error("Enter the asset symbol.");
      }

      if (!network) {
        throw new Error("Enter the network.");
      }

      if (!walletAddress) {
        throw new Error("Enter the wallet address.");
      }

      const assetId = await findOrCreateAsset();
      const networkId = await findOrCreateNetwork();

      if (editingWallet) {
        const { error: updateError } = await supabase
          .from("deposit_wallets")
          .update({
            currency: symbol,
            network,
            wallet_address: walletAddress,
            wallet_label: `${assetName} ${symbol}`,
            asset_id: assetId,
            network_id: networkId,
            is_active: form.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingWallet.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage("Wallet configuration updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("deposit_wallets")
          .insert({
            currency: symbol,
            network,
            wallet_address: walletAddress,
            wallet_label: `${assetName} ${symbol}`,
            asset_id: assetId,
            network_id: networkId,
            is_active: form.active,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage("New asset wallet added successfully.");
      }

      await loadWallets();

      setTimeout(() => {
        closeModal();
        setMessage("");
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Unable to save wallet configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWallet(wallet: DepositWallet) {
    setError("");
    setMessage("");

    try {
      await verifyAdmin();

      const { error: updateError } = await supabase
        .from("deposit_wallets")
        .update({
          is_active: !wallet.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setWallets((current) =>
        current.map((item) =>
          item.id === wallet.id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );

      setMessage(
        wallet.is_active
          ? `${wallet.currency} wallet has been disabled.`
          : `${wallet.currency} wallet is now active.`
      );

      setTimeout(() => setMessage(""), 2500);
    } catch (err: any) {
      setError(err?.message || "Unable to update wallet status.");
    }
  }

  async function deleteWallet(wallet: DepositWallet) {
    const confirmed = window.confirm(
      `Delete the ${wallet.currency} ${wallet.network} wallet configuration?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(wallet.id);
    setError("");
    setMessage("");

    try {
      await verifyAdmin();

      const { error: deleteError } = await supabase
        .from("deposit_wallets")
        .delete()
        .eq("id", wallet.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setWallets((current) =>
        current.filter((item) => item.id !== wallet.id)
      );

      setMessage("Wallet configuration deleted.");
      setTimeout(() => setMessage(""), 2500);
    } catch (err: any) {
      setError(err?.message || "Unable to delete wallet.");
    } finally {
      setDeleting(null);
    }
  }

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setMessage("Wallet address copied.");
      setTimeout(() => setMessage(""), 1800);
    } catch {
      setError("Unable to copy the wallet address.");
    }
  }

  const filteredWallets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return wallets.filter((wallet) => {
      const matchesSearch =
        !term ||
        wallet.currency?.toLowerCase().includes(term) ||
        wallet.assets?.name?.toLowerCase().includes(term) ||
        wallet.network?.toLowerCase().includes(term) ||
        wallet.wallet_address?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && wallet.is_active) ||
        (statusFilter === "inactive" && !wallet.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [wallets, search, statusFilter]);

  const stats = useMemo(() => {
    const active = wallets.filter((wallet) => wallet.is_active).length;
    const inactive = wallets.filter((wallet) => !wallet.is_active).length;

    const uniqueAssets = new Set(
      wallets.map((wallet) => wallet.currency?.toUpperCase())
    ).size;

    return {
      total: wallets.length,
      active,
      inactive,
      uniqueAssets,
    };
  }, [wallets]);

  return (
    <main className="asset-console">
      <div className="asset-orb asset-orb-one" />
      <div className="asset-orb asset-orb-two" />

      <section className="asset-shell">
        <header className="asset-header">
          <div>
            <div className="asset-eyebrow">
              <span className="eyebrow-dot" />
              PAYMENT INFRASTRUCTURE
            </div>

            <h1>Asset & Wallets</h1>

            <p>
              Configure the digital assets and receiving wallets available to
              your investors.
            </p>
          </div>

          <button className="add-asset-button" onClick={openCreate}>
            <span className="plus-icon">+</span>
            Add Custom Asset
          </button>
        </header>

        {message && (
          <div className="console-alert success-alert">
            <span>✓</span>
            {message}
          </div>
        )}

        {error && (
          <div className="console-alert error-alert">
            <span>!</span>
            {error}
          </div>
        )}

        <section className="asset-stats">
          <div className="stat-card">
            <div className="stat-icon blue">◈</div>
            <div>
              <span>Total Wallets</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <span>Active Wallets</span>
              <strong>{stats.active}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">◌</div>
            <div>
              <span>Inactive</span>
              <strong>{stats.inactive}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">◇</div>
            <div>
              <span>Custom Assets</span>
              <strong>{stats.uniqueAssets}</strong>
            </div>
          </div>
        </section>

        <section className="asset-toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assets, networks or wallet addresses..."
            />
          </div>

          <div className="filter-tabs">
            <button
              className={statusFilter === "all" ? "active" : ""}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>

            <button
              className={statusFilter === "active" ? "active" : ""}
              onClick={() => setStatusFilter("active")}
            >
              Active
            </button>

            <button
              className={statusFilter === "inactive" ? "active" : ""}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive
            </button>
          </div>
        </section>

        {loading ? (
          <section className="asset-grid">
            {[1, 2, 3].map((item) => (
              <div className="wallet-skeleton" key={item}>
                <div className="skeleton-logo" />
                <div className="skeleton-line large" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))}
          </section>
        ) : filteredWallets.length === 0 ? (
          <section className="empty-wallet-state">
            <div className="empty-orb">◇</div>
            <h2>No wallet configurations found</h2>
            <p>
              Add your first custom asset and receiving wallet to make it
              available on the investor deposit page.
            </p>

            <button className="add-asset-button" onClick={openCreate}>
              <span className="plus-icon">+</span>
              Add Custom Asset
            </button>
          </section>
        ) : (
          <section className="asset-grid">
            {filteredWallets.map((wallet) => {
              const assetName =
                wallet.assets?.name || wallet.currency || "Unknown Asset";

              const symbol =
                wallet.assets?.symbol || wallet.currency || "—";

              const logo = wallet.assets?.logo_url;

              return (
                <article
                  className={`wallet-card ${
                    wallet.is_active ? "is-active" : "is-inactive"
                  }`}
                  key={wallet.id}
                >
                  <div className="wallet-card-glow" />

                  <div className="wallet-card-top">
                    <div className="asset-identity">
                      <div className="asset-logo">
                        {logo ? (
                          <img
                            src={logo}
                            alt={assetName}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span>{getInitials(assetName)}</span>
                        )}
                      </div>

                      <div>
                        <h3>{assetName}</h3>
                        <span>{symbol}</span>
                      </div>
                    </div>

                    <span
                      className={`status-pill ${
                        wallet.is_active ? "active" : "inactive"
                      }`}
                    >
                      <i />
                      {wallet.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="network-row">
                    <div>
                      <small>NETWORK</small>
                      <strong>
                        {wallet.networks?.name || wallet.network}
                      </strong>
                    </div>

                    <div className="network-code">
                      {wallet.networks?.short_name ||
                        wallet.network?.slice(0, 8)}
                    </div>
                  </div>

                  <div className="wallet-address-block">
                    <div className="address-heading">
                      <small>RECEIVING ADDRESS</small>

                      <button
                        onClick={() => copyAddress(wallet.wallet_address)}
                      >
                        Copy
                      </button>
                    </div>

                    <div className="address-value">
                      {shortenAddress(wallet.wallet_address)}
                    </div>
                  </div>

                  <div className="wallet-card-footer">
                    <span>Added {formatDate(wallet.created_at)}</span>

                    <div className="card-actions">
                      <button
                        className="icon-action"
                        title="Edit wallet"
                        onClick={() => openEdit(wallet)}
                      >
                        ✎
                      </button>

                      <button
                        className={`toggle-action ${
                          wallet.is_active ? "enabled" : ""
                        }`}
                        title={
                          wallet.is_active
                            ? "Deactivate wallet"
                            : "Activate wallet"
                        }
                        onClick={() => toggleWallet(wallet)}
                      >
                        {wallet.is_active ? "Disable" : "Enable"}
                      </button>

                      <button
                        className="delete-action"
                        title="Delete wallet"
                        disabled={deleting === wallet.id}
                        onClick={() => deleteWallet(wallet)}
                      >
                        {deleting === wallet.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      {showModal && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <div
            className="wallet-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">
                  {editingWallet ? "WALLET CONFIGURATION" : "NEW ASSET"}
                </span>

                <h2>
                  {editingWallet
                    ? "Edit Wallet"
                    : "Add Custom Asset"}
                </h2>

                <p>
                  Configure the asset identity and receiving address.
                </p>
              </div>

              <button className="close-modal" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="modal-preview">
              <div className="preview-logo">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Preview"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span>
                    {getInitials(form.assetName || "AS")}
                  </span>
                )}
              </div>

              <div>
                <strong>{form.assetName || "Asset Name"}</strong>
                <span>
                  {form.symbol.toUpperCase() || "SYMBOL"} ·{" "}
                  {form.network || "Network"}
                </span>
              </div>

              <div className="preview-live">
                <i />
                LIVE PREVIEW
              </div>
            </div>

            <div className="form-grid">
              <label className="form-field">
                <span>Asset Name</span>
                <input
                  value={form.assetName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      assetName: event.target.value,
                    })
                  }
                  placeholder="e.g. Tether USD"
                />
              </label>

              <label className="form-field">
                <span>Asset Symbol</span>
                <input
                  value={form.symbol}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      symbol: event.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. USDT"
                  maxLength={12}
                />
              </label>

              <label className="form-field full">
                <span>Wallet Logo URL</span>
                <input
                  value={form.logoUrl}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      logoUrl: event.target.value,
                    })
                  }
                  placeholder="https://example.com/logo.png"
                />
                <small>
                  Use a public HTTPS image URL for the asset logo.
                </small>
              </label>

              <label className="form-field">
                <span>Network</span>
                <input
                  value={form.network}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      network: event.target.value,
                    })
                  }
                  placeholder="e.g. TRON / TRC20"
                />
              </label>

              <label className="form-field">
                <span>Wallet Address</span>
                <input
                  value={form.walletAddress}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      walletAddress: event.target.value,
                    })
                  }
                  placeholder="Enter receiving wallet address"
                />
              </label>

              <div className="active-config full">
                <div>
                  <strong>Wallet availability</strong>
                  <span>
                    {form.active
                      ? "Visible to investors on Deposit"
                      : "Hidden from investor Deposit"}
                  </span>
                </div>

                <button
                  type="button"
                  className={`switch ${form.active ? "on" : ""}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      active: !form.active,
                    })
                  }
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="modal-security-note">
              <span>◉</span>
              <div>
                <strong>Configuration control</strong>
                <p>
                  Only active wallet configurations are exposed to the
                  investor deposit interface.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="save-button"
                onClick={saveWallet}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="button-spinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    {editingWallet ? "Save Changes" : "Create Asset"}
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}