"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./deposit.css";

type Asset = {
  id: string;
  name: string;
  symbol: string;
  logo_url: string | null;
  decimals: number;
  is_active: boolean;
};

type DepositWallet = {
  id: string;
  currency: string;
  network: string;
  wallet_address: string;
  is_active: boolean;
  wallet_label: string | null;
};

type DepositRecord = {
  id: string;
  amount: number;
  currency: string;
  network: string;
  transaction_hash: string | null;
  wallet_address: string | null;
  status: string;
  created_at: string;
};

const NETWORK_LABELS: Record<string, string> = {
  TRC20: "TRON / TRC20",
  TRON: "TRON / TRC20",
  ERC20: "Ethereum / ERC20",
  ETH: "Ethereum / ERC20",
  BEP20: "BNB Smart Chain / BEP20",
  BSC: "BNB Smart Chain / BEP20",
  BTC: "Bitcoin",
  Bitcoin: "Bitcoin",
  SOL: "Solana",
  SOLANA: "Solana",
  POLYGON: "Polygon",
  MATIC: "Polygon",
};

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function formatAmount(value: number, decimals = 8) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(Math.max(decimals, 2), 8),
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortenAddress(value: string) {
  if (!value) return "";

  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-10)}`;
}

function getNetworkLabel(network: string) {
  const normalized = normalize(network);
  return NETWORK_LABELS[normalized] || network;
}

function getAssetInitials(asset: Asset) {
  const symbol = asset.symbol?.trim();

  if (symbol) {
    return symbol.slice(0, 3).toUpperCase();
  }

  return asset.name?.slice(0, 2).toUpperCase() || "AS";
}

export default function DepositPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [wallets, setWallets] = useState<DepositWallet[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedWallet, setSelectedWallet] =
    useState<DepositWallet | null>(null);

  const [amount, setAmount] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copying, setCopying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        throw new Error("Please sign in to continue.");
      }

      const [assetsResponse, walletsResponse, depositsResponse] =
        await Promise.all([
          supabase
            .from("assets")
            .select(
              "id, name, symbol, logo_url, decimals, is_active"
            )
            .eq("is_active", true)
            .order("name", { ascending: true }),

          supabase
            .from("deposit_wallets")
            .select(
              "id, currency, network, wallet_address, is_active, wallet_label"
            )
            .eq("is_active", true)
            .order("currency", { ascending: true }),

          supabase
            .from("deposits")
            .select(
              "id, amount, currency, network, transaction_hash, wallet_address, status, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

      if (assetsResponse.error) {
        throw new Error(assetsResponse.error.message);
      }

      if (walletsResponse.error) {
        throw new Error(walletsResponse.error.message);
      }

      if (depositsResponse.error) {
        throw new Error(depositsResponse.error.message);
      }

      const loadedAssets = (assetsResponse.data || []) as Asset[];
      const loadedWallets = (walletsResponse.data || []) as DepositWallet[];

      setAssets(loadedAssets);
      setWallets(loadedWallets);
      setDeposits((depositsResponse.data || []) as DepositRecord[]);

      if (loadedAssets.length > 0 && !selectedAsset) {
        const firstAssetWithWallet =
          loadedAssets.find((asset) =>
            loadedWallets.some(
              (wallet) =>
                normalize(wallet.currency) === normalize(asset.symbol)
            )
          ) || loadedAssets[0];

        setSelectedAsset(firstAssetWithWallet);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load deposit information."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedAsset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assetWallets = useMemo(() => {
    if (!selectedAsset) return [];

    return wallets.filter(
      (wallet) =>
        normalize(wallet.currency) ===
        normalize(selectedAsset.symbol)
    );
  }, [wallets, selectedAsset]);

  const availableNetworks = useMemo(() => {
    const seen = new Set<string>();

    return assetWallets.filter((wallet) => {
      const key = normalize(wallet.network);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [assetWallets]);

  useEffect(() => {
    if (!selectedAsset) return;

    const firstNetwork = availableNetworks[0]?.network || "";

    if (
      selectedNetwork &&
      availableNetworks.some(
        (wallet) =>
          normalize(wallet.network) === normalize(selectedNetwork)
      )
    ) {
      return;
    }

    setSelectedNetwork(firstNetwork);
  }, [selectedAsset, availableNetworks, selectedNetwork]);

  useEffect(() => {
    const wallet =
      assetWallets.find(
        (item) =>
          normalize(item.network) === normalize(selectedNetwork)
      ) || null;

    setSelectedWallet(wallet);
  }, [assetWallets, selectedNetwork]);

  function selectAsset(asset: Asset) {
    setSelectedAsset(asset);
    setSelectedNetwork("");
    setSelectedWallet(null);
    setAmount("");
    setTransactionHash("");
    setError("");
    setSuccess("");
  }

  function openDepositModal() {
    setError("");
    setSuccess("");

    if (!selectedAsset) {
      setError("Please select an asset first.");
      return;
    }

    if (!selectedWallet) {
      setError(
        "No active deposit wallet is configured for this asset and network."
      );
      return;
    }

    setShowDepositModal(true);
  }

  function closeDepositModal() {
    if (submitting) return;

    setShowDepositModal(false);
    setShowConfirmModal(false);
  }

  function continueToConfirmation() {
    setError("");

    if (!selectedAsset) {
      setError("Please select an asset.");
      return;
    }

    if (!selectedWallet) {
      setError("Please select an available network.");
      return;
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    if (!transactionHash.trim()) {
      setError("Enter the transaction hash after sending your deposit.");
      return;
    }

    setShowConfirmModal(true);
  }

  async function submitDeposit() {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        throw new Error("Authentication required.");
      }

      if (!selectedAsset || !selectedWallet) {
        throw new Error("Deposit configuration is incomplete.");
      }

      const numericAmount = Number(amount);

      if (!numericAmount || numericAmount <= 0) {
        throw new Error("Enter a valid deposit amount.");
      }

      const cleanHash = transactionHash.trim();

      const { error: insertError } = await supabase
        .from("deposits")
        .insert({
          user_id: user.id,
          amount: numericAmount,
          currency: selectedAsset.symbol.toUpperCase(),
          network: selectedWallet.network,
          transaction_hash: cleanHash,
          wallet_address: selectedWallet.wallet_address,
          status: "pending",
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess(
        "Deposit submitted successfully. Your transaction is now pending verification."
      );

      setAmount("");
      setTransactionHash("");

      setShowConfirmModal(false);
      setShowDepositModal(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit the deposit."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyWalletAddress() {
    if (!selectedWallet?.wallet_address) return;

    setCopying(true);

    try {
      await navigator.clipboard.writeText(
        selectedWallet.wallet_address
      );

      setSuccess("Deposit address copied to clipboard.");

      window.setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch {
      setError(
        "Unable to copy automatically. Please copy the address manually."
      );
    } finally {
      window.setTimeout(() => {
        setCopying(false);
      }, 500);
    }
  }

  function getStatusClass(status: string) {
    const normalized = normalize(status);

    if (normalized === "CONFIRMED") return "status-confirmed";
    if (normalized === "REJECTED") return "status-rejected";
    if (normalized === "CANCELLED") return "status-cancelled";

    return "status-pending";
  }

  if (loading) {
    return (
      <main className="deposit-page">
        <div className="deposit-loading">
          <div className="loading-orb">
            <span />
            <span />
            <span />
          </div>

          <h2>Loading deposit center</h2>
          <p>Preparing your available assets and deposit routes...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="deposit-page">
      <div className="deposit-background-orb orb-one" />
      <div className="deposit-background-orb orb-two" />

      <div className="deposit-container">
        <header className="deposit-header">
          <div>
            <div className="deposit-eyebrow">
              <span className="eyebrow-dot" />
              FUND YOUR ACCOUNT
            </div>

            <h1>Deposit Funds</h1>

            <p>
              Add digital assets to your account securely. Select an
              asset, choose the correct network and send funds to your
              assigned receiving address.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="back-dashboard-button"
          >
            <span>←</span>
            Dashboard
          </Link>
        </header>

        {error && (
          <div className="deposit-alert deposit-alert-error">
            <div className="alert-icon">!</div>
            <div>
              <strong>Something needs your attention</strong>
              <p>{error}</p>
            </div>

            <button
              onClick={() => setError("")}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="deposit-alert deposit-alert-success">
            <div className="alert-icon">✓</div>
            <div>
              <strong>Deposit center update</strong>
              <p>{success}</p>
            </div>

            <button
              onClick={() => setSuccess("")}
              aria-label="Close success"
            >
              ×
            </button>
          </div>
        )}

        <section className="deposit-hero-card">
          <div className="hero-card-glow" />

          <div className="hero-card-content">
            <div>
              <span className="hero-label">
                SECURE ASSET FUNDING
              </span>

              <h2>
                Deposit digital assets
                <br />
                with confidence.
              </h2>

              <p>
                Choose your preferred asset and network. Your deposit
                is reviewed before funds are credited to your wallet.
              </p>

              <div className="hero-security-row">
                <div>
                  <span className="security-check">✓</span>
                  Verified receiving address
                </div>

                <div>
                  <span className="security-check">✓</span>
                  Manual transaction review
                </div>

                <div>
                  <span className="security-check">✓</span>
                  Secure account ledger
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-ring ring-one" />
              <div className="hero-ring ring-two" />

              <div className="hero-coin">
                <span>₿</span>
              </div>

              <div className="floating-chip chip-one">
                <span className="chip-dot" />
                Secure
              </div>

              <div className="floating-chip chip-two">
                <span>↗</span>
                On-chain
              </div>
            </div>
          </div>
        </section>

        <section className="section-heading">
          <div>
            <span>01</span>
            <div>
              <h2>Select an asset</h2>
              <p>Choose the digital asset you want to deposit.</p>
            </div>
          </div>

          <div className="asset-count">
            {assets.length}{" "}
            {assets.length === 1 ? "asset" : "assets"} available
          </div>
        </section>

        {assets.length === 0 ? (
          <div className="empty-assets-card">
            <div className="empty-assets-icon">◇</div>
            <h3>No deposit assets available</h3>
            <p>
              There are currently no active assets configured for
              deposits. Please contact support or check again later.
            </p>
          </div>
        ) : (
          <div className="asset-grid">
            {assets.map((asset, index) => {
              const hasWallet = wallets.some(
                (wallet) =>
                  normalize(wallet.currency) ===
                  normalize(asset.symbol)
              );

              const isSelected =
                selectedAsset?.id === asset.id;

              return (
                <button
                  key={asset.id}
                  className={`asset-card ${
                    isSelected ? "asset-card-selected" : ""
                  } ${!hasWallet ? "asset-card-unavailable" : ""}`}
                  onClick={() => selectAsset(asset)}
                  style={{
                    animationDelay: `${index * 70}ms`,
                  }}
                >
                  <div className="asset-card-top">
                    <div className="asset-logo">
                      {asset.logo_url ? (
                        <img
                          src={asset.logo_url}
                          alt={`${asset.name} logo`}
                        />
                      ) : (
                        <span>
                          {getAssetInitials(asset)}
                        </span>
                      )}
                    </div>

                    <div
                      className={`asset-selection-indicator ${
                        isSelected ? "selected" : ""
                      }`}
                    >
                      {isSelected && "✓"}
                    </div>
                  </div>

                  <div className="asset-card-info">
                    <strong>{asset.symbol}</strong>
                    <span>{asset.name}</span>
                  </div>

                  <div className="asset-card-footer">
                    {hasWallet ? (
                      <>
                        <span className="asset-online-dot" />
                        Deposit available
                      </>
                    ) : (
                      <>
                        <span className="asset-offline-dot" />
                        Wallet not configured
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedAsset && (
          <>
            <section className="deposit-workspace">
              <div className="workspace-main">
                <div className="workspace-heading">
                  <div className="step-number">02</div>

                  <div>
                    <h2>Choose your network</h2>
                    <p>
                      Select the network you will use to send{" "}
                      <strong>
                        {selectedAsset.symbol}
                      </strong>
                      .
                    </p>
                  </div>
                </div>

                {availableNetworks.length === 0 ? (
                  <div className="network-empty">
                    <div className="network-empty-icon">!</div>

                    <div>
                      <strong>
                        No deposit network configured
                      </strong>

                      <p>
                        {selectedAsset.symbol} is active in your asset
                        catalogue, but there is currently no active
                        receiving wallet configured for it.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="network-grid">
                    {availableNetworks.map((wallet) => {
                      const selected =
                        normalize(selectedNetwork) ===
                        normalize(wallet.network);

                      return (
                        <button
                          key={wallet.id}
                          className={`network-card ${
                            selected
                              ? "network-card-selected"
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedNetwork(wallet.network)
                          }
                        >
                          <div className="network-icon">
                            {normalize(wallet.network) ===
                              "TRC20" ||
                            normalize(wallet.network) ===
                              "TRON"
                              ? "T"
                              : normalize(wallet.network) ===
                                  "BTC"
                                ? "₿"
                                : "N"}
                          </div>

                          <div className="network-copy">
                            <strong>
                              {getNetworkLabel(wallet.network)}
                            </strong>

                            <span>
                              {wallet.wallet_label ||
                                "Available deposit route"}
                            </span>
                          </div>

                          <div
                            className={`network-radio ${
                              selected ? "checked" : ""
                            }`}
                          >
                            {selected && <span />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <aside className="workspace-side">
                <div className="selected-asset-panel">
                  <div className="selected-asset-header">
                    <span>Selected asset</span>
                    <span className="live-badge">
                      <i />
                      LIVE
                    </span>
                  </div>

                  <div className="selected-asset-main">
                    <div className="selected-asset-logo">
                      {selectedAsset.logo_url ? (
                        <img
                          src={selectedAsset.logo_url}
                          alt=""
                        />
                      ) : (
                        <span>
                          {getAssetInitials(selectedAsset)}
                        </span>
                      )}
                    </div>

                    <div>
                      <strong>{selectedAsset.symbol}</strong>
                      <span>{selectedAsset.name}</span>
                    </div>
                  </div>

                  <div className="selected-network-row">
                    <span>Network</span>

                    <strong>
                      {selectedNetwork
                        ? getNetworkLabel(selectedNetwork)
                        : "Select network"}
                    </strong>
                  </div>

                  <button
                    className="continue-deposit-button"
                    disabled={!selectedWallet}
                    onClick={openDepositModal}
                  >
                    Continue
                    <span>→</span>
                  </button>
                </div>
              </aside>
            </section>

            <section className="how-it-works">
              <div className="section-heading compact">
                <div>
                  <span>03</span>
                  <div>
                    <h2>How deposits work</h2>
                    <p>
                      Follow these steps to avoid sending funds to the
                      wrong address or network.
                    </p>
                  </div>
                </div>
              </div>

              <div className="steps-grid">
                <div className="process-step">
                  <div className="process-number">01</div>
                  <div>
                    <h3>Select asset & network</h3>
                    <p>
                      Choose the asset you want to deposit and the
                      exact blockchain network you will use.
                    </p>
                  </div>
                </div>

                <div className="process-step">
                  <div className="process-number">02</div>
                  <div>
                    <h3>Send the funds</h3>
                    <p>
                      Send the asset to the receiving address displayed
                      by the deposit center.
                    </p>
                  </div>
                </div>

                <div className="process-step">
                  <div className="process-number">03</div>
                  <div>
                    <h3>Submit transaction hash</h3>
                    <p>
                      Enter your transaction hash so the deposit can be
                      identified and reviewed.
                    </p>
                  </div>
                </div>

                <div className="process-step">
                  <div className="process-number">04</div>
                  <div>
                    <h3>Verification & credit</h3>
                    <p>
                      After verification, the deposit is confirmed and
                      your wallet balance is updated.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="recent-deposits">
          <div className="recent-header">
            <div>
              <span>ACTIVITY</span>
              <h2>Recent deposits</h2>
            </div>

            <button
              className="refresh-button"
              onClick={loadData}
              disabled={loading}
            >
              <span className={loading ? "spin" : ""}>↻</span>
              Refresh
            </button>
          </div>

          {deposits.length === 0 ? (
            <div className="recent-empty">
              <div className="recent-empty-icon">↓</div>
              <h3>No deposits yet</h3>
              <p>
                Your deposit activity will appear here once you submit
                a transaction.
              </p>
            </div>
          ) : (
            <div className="deposit-history">
              {deposits.map((deposit) => (
                <div
                  className="deposit-history-row"
                  key={deposit.id}
                >
                  <div className="history-asset-icon">
                    {deposit.currency.slice(0, 3)}
                  </div>

                  <div className="history-main">
                    <strong>
                      {deposit.currency} deposit
                    </strong>

                    <span>
                      {getNetworkLabel(deposit.network)}
                    </span>
                  </div>

                  <div className="history-hash">
                    <span>Transaction</span>

                    <strong>
                      {deposit.transaction_hash
                        ? shortenAddress(
                            deposit.transaction_hash
                          )
                        : "Pending transaction hash"}
                    </strong>
                  </div>

                  <div className="history-amount">
                    <strong>
                      {formatAmount(
                        deposit.amount,
                        selectedAsset?.decimals || 8
                      )}{" "}
                      {deposit.currency}
                    </strong>

                    <span>
                      {formatDate(deposit.created_at)}
                    </span>
                  </div>

                  <div
                    className={`history-status ${getStatusClass(
                      deposit.status
                    )}`}
                  >
                    <span />
                    {deposit.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="deposit-warning">
          <div className="warning-icon">!</div>

          <div>
            <strong>Important deposit notice</strong>

            <p>
              Always verify the asset and network before sending.
              Depositing an unsupported asset or using an incompatible
              network can result in permanent loss of funds. A submitted
              deposit remains pending until it has been independently
              verified.
            </p>
          </div>
        </section>
      </div>

      {showDepositModal && selectedAsset && selectedWallet && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDepositModal();
            }
          }}
        >
          <div className="deposit-modal">
            <div className="modal-header">
              <div>
                <span>DEPOSIT</span>
                <h2>Send {selectedAsset.symbol}</h2>
              </div>

              <button
                className="modal-close"
                onClick={closeDepositModal}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <div className="modal-progress">
              <div className="progress-step active">
                <span>1</span>
                Address
              </div>

              <div className="progress-line" />

              <div
                className={`progress-step ${
                  showConfirmModal ? "active" : ""
                }`}
              >
                <span>2</span>
                Confirm
              </div>
            </div>

            {!showConfirmModal ? (
              <>
                <div className="receiving-address-card">
                  <div className="receiving-card-top">
                    <div>
                      <span>RECEIVING ADDRESS</span>
                      <strong>
                        {selectedAsset.symbol} •{" "}
                        {selectedWallet.network}
                      </strong>
                    </div>

                    <div className="verified-address">
                      <span>✓</span>
                      Verified
                    </div>
                  </div>

                  <div className="wallet-address-box">
                    <span>
                      {selectedWallet.wallet_address}
                    </span>

                    <button onClick={copyWalletAddress}>
                      {copying ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="network-warning">
                    <span>!</span>
                    <p>
                      Send only{" "}
                      <strong>
                        {selectedAsset.symbol}
                      </strong>{" "}
                      using the{" "}
                      <strong>
                        {getNetworkLabel(
                          selectedWallet.network
                        )}
                      </strong>{" "}
                      network.
                    </p>
                  </div>
                </div>

                <div className="modal-form">
                  <label>
                    Amount sent
                    <span>Required</span>
                  </label>

                  <div className="amount-field">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                    />

                    <strong>
                      {selectedAsset.symbol}
                    </strong>
                  </div>

                  <label>
                    Transaction hash
                    <span>Required</span>
                  </label>

                  <textarea
                    value={transactionHash}
                    onChange={(event) =>
                      setTransactionHash(event.target.value)
                    }
                    placeholder="Paste your blockchain transaction hash here"
                    rows={4}
                  />

                  <div className="modal-info">
                    <span>i</span>
                    <p>
                      After sending the funds, enter the transaction
                      hash from your wallet or blockchain explorer.
                    </p>
                  </div>
                </div>

                <button
                  className="modal-primary-button"
                  onClick={continueToConfirmation}
                >
                  Review deposit
                  <span>→</span>
                </button>
              </>
            ) : (
              <div className="confirmation-view">
                <div className="confirmation-icon">
                  ✓
                </div>

                <span className="confirmation-label">
                  REVIEW DEPOSIT
                </span>

                <h3>Confirm your deposit details</h3>

                <p>
                  Make sure the information below matches the
                  transaction you sent.
                </p>

                <div className="confirmation-details">
                  <div>
                    <span>Asset</span>
                    <strong>
                      {selectedAsset.name} (
                      {selectedAsset.symbol})
                    </strong>
                  </div>

                  <div>
                    <span>Network</span>
                    <strong>
                      {getNetworkLabel(
                        selectedWallet.network
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Amount</span>
                    <strong>
                      {formatAmount(
                        Number(amount),
                        selectedAsset.decimals
                      )}{" "}
                      {selectedAsset.symbol}
                    </strong>
                  </div>

                  <div>
                    <span>Receiving address</span>
                    <strong className="confirmation-address">
                      {shortenAddress(
                        selectedWallet.wallet_address
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Transaction hash</span>
                    <strong className="confirmation-address">
                      {shortenAddress(transactionHash)}
                    </strong>
                  </div>
                </div>

                <div className="confirmation-notice">
                  <span>!</span>
                  <p>
                    Your submission will be marked as{" "}
                    <strong>pending</strong> and reviewed before
                    your wallet balance is credited.
                  </p>
                </div>

                <div className="confirmation-actions">
                  <button
                    className="modal-secondary-button"
                    onClick={() =>
                      setShowConfirmModal(false)
                    }
                    disabled={submitting}
                  >
                    Back
                  </button>

                  <button
                    className="modal-primary-button"
                    onClick={submitDeposit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="button-spinner" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit deposit
                        <span>✓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}