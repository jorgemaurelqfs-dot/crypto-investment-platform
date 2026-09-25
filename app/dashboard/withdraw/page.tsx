"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./withdraw.css";

type Balance = {
  id: string;
  currency: string;
  balance: number | string;
};

type ProfitBalance = {
  id: string;
  currency: string;
  balance: number | string;
};

type Asset = {
  id: string;
  name: string;
  symbol: string;
  logo_url: string | null;
  is_active: boolean;
};

type SupportedAsset = {
  id: string;
  name: string;
  symbol: string;
  logo_url: string | null;
  is_active: boolean;
};

type Network = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  is_active: boolean;
};

type AssetNetwork = {
  id: string;
  asset_id: string;
  network_id: string;
  network_name: string;
  network_code: string;
  is_active: boolean;
};

type DepositWallet = {
  id: string;
  currency: string;
  network: string;
  wallet_address: string;
  is_active: boolean;
  asset_id: string | null;
  network_id: string | null;
  asset_network_id: string | null;
};

type Withdrawal = {
  id: string;
  amount: number | string;
  currency: string;
  network: string;
  destination_address: string;
  fee: number | string;
  net_amount: number | string;
  status: string;
  requested_at: string;
  balance_source: string | null;
};

type WithdrawalSource =
  | "wallet"
  | "investment_profit";

function formatAmount(value: number | string) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(number);
}

function formatDate(value: string) {
  if (!value) return "—";

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
    case "completed":
      return "status-completed";

    case "approved":
      return "status-approved";

    case "processing":
      return "status-processing";

    case "rejected":
      return "status-rejected";

    case "cancelled":
      return "status-cancelled";

    case "pending":
    default:
      return "status-pending";
  }
}

function shortenAddress(address: string) {
  if (!address) return "—";

  if (address.length <= 16) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export default function WithdrawPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState<string | null>(
    null
  );

  const [balances, setBalances] = useState<Balance[]>(
    []
  );

  const [profitBalances, setProfitBalances] =
    useState<ProfitBalance[]>([]);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [supportedAssets, setSupportedAssets] =
    useState<SupportedAsset[]>([]);

  const [networks, setNetworks] = useState<Network[]>(
    []
  );

  const [assetNetworks, setAssetNetworks] =
    useState<AssetNetwork[]>([]);

  const [depositWallets, setDepositWallets] =
    useState<DepositWallet[]>([]);

  const [withdrawals, setWithdrawals] = useState<
    Withdrawal[]
  >([]);

  const [currency, setCurrency] = useState("");

  const [source, setSource] =
    useState<WithdrawalSource>("wallet");

  const [network, setNetwork] = useState("");

  const [amount, setAmount] = useState("");

  const [destinationAddress, setDestinationAddress] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ------------------------------------------------------
   * AVAILABLE BALANCE
   * ------------------------------------------------------
   */

  const selectedAvailableBalance = useMemo(() => {
    const item = balances.find(
      (balance) =>
        balance.currency.toUpperCase() ===
        currency.toUpperCase()
    );

    return Number(item?.balance || 0);
  }, [balances, currency]);

  /*
   * ------------------------------------------------------
   * INVESTMENT PROFIT
   * ------------------------------------------------------
   */

  const selectedProfitBalance = useMemo(() => {
    const item = profitBalances.find(
      (balance) =>
        balance.currency.toUpperCase() ===
        currency.toUpperCase()
    );

    return Number(item?.balance || 0);
  }, [profitBalances, currency]);

  /*
   * ------------------------------------------------------
   * ACTIVE WITHDRAWAL BALANCE
   * ------------------------------------------------------
   */

  const selectedBalance =
    source === "investment_profit"
      ? selectedProfitBalance
      : selectedAvailableBalance;

  /*
   * ------------------------------------------------------
   * TOTAL ACCOUNT FUNDS
   * ------------------------------------------------------
   *
   * This is the combined wallet + profit balance for
   * the selected currency.
   */

  const totalSelectedFunds =
    selectedAvailableBalance +
    selectedProfitBalance;

  /*
   * ------------------------------------------------------
   * ASSET
   * ------------------------------------------------------
   */

  const selectedAsset = useMemo(() => {
    if (!currency) return null;

    return (
      assets.find(
        (asset) =>
          asset.symbol.toUpperCase() ===
            currency.toUpperCase() &&
          asset.is_active
      ) || null
    );
  }, [assets, currency]);

  /*
   * ------------------------------------------------------
   * SUPPORTED ASSET
   * ------------------------------------------------------
   */

  const selectedSupportedAsset = useMemo(() => {
    if (!currency) return null;

    return (
      supportedAssets.find(
        (asset) =>
          asset.symbol.toUpperCase() ===
            currency.toUpperCase() &&
          asset.is_active
      ) || null
    );
  }, [supportedAssets, currency]);

  /*
   * ------------------------------------------------------
   * ASSET / NETWORK RELATIONSHIPS
   * ------------------------------------------------------
   */

  const selectedAssetNetworks = useMemo(() => {
    if (!selectedSupportedAsset) {
      return [];
    }

    return assetNetworks.filter(
      (relation) =>
        relation.asset_id ===
          selectedSupportedAsset.id &&
        relation.is_active &&
        networks.some(
          (item) =>
            item.id === relation.network_id &&
            item.is_active
        )
    );
  }, [
    selectedSupportedAsset,
    assetNetworks,
    networks,
  ]);

  /*
   * ------------------------------------------------------
   * AVAILABLE NETWORKS
   * ------------------------------------------------------
   */

  const availableNetworkRecords = useMemo(() => {
    if (!currency) {
      return [];
    }

    return selectedAssetNetworks
      .map((relation) => {
        const networkRecord = networks.find(
          (item) =>
            item.id === relation.network_id &&
            item.is_active
        );

        if (!networkRecord) {
          return null;
        }

        const matchingWallet =
          depositWallets.find((wallet) => {
            const walletCurrency =
              wallet.currency?.toUpperCase() || "";

            const walletNetwork =
              wallet.network?.toUpperCase() || "";

            const selectedCurrency =
              currency.toUpperCase();

            const networkCode =
              relation.network_code?.toUpperCase() ||
              "";

            const networkShortName =
              networkRecord.short_name?.toUpperCase() ||
              "";

            const networkName =
              networkRecord.name?.toUpperCase() || "";

            const networkMatches =
              walletNetwork === networkCode ||
              walletNetwork === networkShortName ||
              walletNetwork === networkName;

            const assetMatches =
              walletCurrency === selectedCurrency;

            const relationMatches =
              !wallet.asset_network_id ||
              wallet.asset_network_id === relation.id;

            const networkIdMatches =
              !wallet.network_id ||
              wallet.network_id ===
                relation.network_id;

            return (
              wallet.is_active &&
              assetMatches &&
              networkMatches &&
              relationMatches &&
              networkIdMatches
            );
          });

        if (!matchingWallet) {
          return null;
        }

        return {
          relation,
          network: networkRecord,
          wallet: matchingWallet,
        };
      })
      .filter(Boolean) as {
      relation: AssetNetwork;
      network: Network;
      wallet: DepositWallet;
    }[];
  }, [
    currency,
    selectedAssetNetworks,
    networks,
    depositWallets,
  ]);

  const availableNetworks = useMemo(() => {
    return availableNetworkRecords.map(
      (item) =>
        item.network.short_name ||
        item.relation.network_code ||
        item.network.name
    );
  }, [availableNetworkRecords]);

  /*
   * ------------------------------------------------------
   * SELECTED NETWORK
   * ------------------------------------------------------
   */

  const selectedNetworkRecord = useMemo(() => {
    if (!network) {
      return null;
    }

    return (
      availableNetworkRecords.find((item) => {
        const code =
          item.relation.network_code?.toUpperCase() ||
          "";

        const shortName =
          item.network.short_name?.toUpperCase() ||
          "";

        const name =
          item.network.name?.toUpperCase() || "";

        const selected = network.toUpperCase();

        return (
          selected === code ||
          selected === shortName ||
          selected === name
        );
      }) || null
    );
  }, [availableNetworkRecords, network]);

  /*
   * ------------------------------------------------------
   * FEE
   * ------------------------------------------------------
   *
   * Currently zero until you implement a configurable
   * fee system.
   */

  const withdrawalFee = 0;

  const numericAmount = Number(amount || 0);

  const netAmount = Math.max(
    numericAmount - withdrawalFee,
    0
  );

  const remainingBalance = Math.max(
    selectedBalance - numericAmount,
    0
  );

  /*
   * ------------------------------------------------------
   * LOAD DATA
   * ------------------------------------------------------
   */

  async function loadData() {
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

      setUserId(user.id);

      const [
        balanceResponse,
        profitResponse,
        assetResponse,
        supportedAssetResponse,
        networkResponse,
        assetNetworkResponse,
        walletResponse,
        withdrawalResponse,
      ] = await Promise.all([
        supabase
          .from("wallet_balances")
          .select(
            "id, currency, balance"
          )
          .eq("user_id", user.id)
          .order("currency", {
            ascending: true,
          }),

        supabase
          .from("investment_profit_balances")
          .select(
            "id, currency, balance"
          )
          .eq("user_id", user.id)
          .order("currency", {
            ascending: true,
          }),

        supabase
          .from("assets")
          .select(
            "id, name, symbol, logo_url, is_active"
          )
          .eq("is_active", true)
          .order("symbol", {
            ascending: true,
          }),

        supabase
          .from("supported_assets")
          .select(
            "id, name, symbol, logo_url, is_active"
          )
          .eq("is_active", true)
          .order("symbol", {
            ascending: true,
          }),

        supabase
          .from("networks")
          .select(
            "id, name, short_name, logo_url, is_active"
          )
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("asset_networks")
          .select(
            "id, asset_id, network_id, network_name, network_code, is_active"
          )
          .eq("is_active", true),

        supabase
          .from("deposit_wallets")
          .select(
            "id, currency, network, wallet_address, is_active, asset_id, network_id, asset_network_id"
          )
          .eq("is_active", true)
          .order("currency", {
            ascending: true,
          })
          .order("network", {
            ascending: true,
          }),

        supabase
          .from("withdrawals")
          .select(
            "id, amount, currency, network, destination_address, fee, net_amount, status, requested_at, balance_source"
          )
          .eq("user_id", user.id)
          .order("requested_at", {
            ascending: false,
          })
          .limit(10),
      ]);

      if (balanceResponse.error) {
        throw balanceResponse.error;
      }

      if (profitResponse.error) {
        throw profitResponse.error;
      }

      if (assetResponse.error) {
        throw assetResponse.error;
      }

      if (supportedAssetResponse.error) {
        throw supportedAssetResponse.error;
      }

      if (networkResponse.error) {
        throw networkResponse.error;
      }

      if (assetNetworkResponse.error) {
        throw assetNetworkResponse.error;
      }

      if (walletResponse.error) {
        throw walletResponse.error;
      }

      if (withdrawalResponse.error) {
        throw withdrawalResponse.error;
      }

      const loadedBalances =
        balanceResponse.data || [];

      const loadedProfitBalances =
        profitResponse.data || [];

      const loadedAssets =
        assetResponse.data || [];

      const loadedSupportedAssets =
        supportedAssetResponse.data || [];

      const loadedNetworks =
        networkResponse.data || [];

      const loadedAssetNetworks =
        assetNetworkResponse.data || [];

      const loadedWallets =
        walletResponse.data || [];

      const loadedWithdrawals =
        withdrawalResponse.data || [];

      setBalances(loadedBalances);
      setProfitBalances(
        loadedProfitBalances
      );
      setAssets(loadedAssets);
      setSupportedAssets(
        loadedSupportedAssets
      );
      setNetworks(loadedNetworks);
      setAssetNetworks(
        loadedAssetNetworks
      );
      setDepositWallets(
        loadedWallets
      );
      setWithdrawals(
        loadedWithdrawals
      );

      /*
       * Automatically select the first currency that has
       * either available funds or investment profit.
       */
      if (!currency) {
        const currencies = Array.from(
          new Set([
            ...loadedBalances.map((item) =>
              item.currency.toUpperCase()
            ),
            ...loadedProfitBalances.map((item) =>
              item.currency.toUpperCase()
            ),
          ])
        );

        const firstCurrency = currencies.find(
          (symbol) => {
            const available =
              Number(
                loadedBalances.find(
                  (item) =>
                    item.currency.toUpperCase() ===
                    symbol
                )?.balance || 0
              );

            const profit =
              Number(
                loadedProfitBalances.find(
                  (item) =>
                    item.currency.toUpperCase() ===
                    symbol
                )?.balance || 0
              );

            return available > 0 || profit > 0;
          }
        );

        if (firstCurrency) {
          setCurrency(firstCurrency);
        } else if (currencies.length > 0) {
          setCurrency(currencies[0]);
        }
      }
    } catch (err: any) {
      console.error(
        "Withdrawal load error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load your withdrawal information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
   * Keep network valid when asset changes.
   */
  useEffect(() => {
    if (!currency) {
      setNetwork("");
      return;
    }

    if (availableNetworks.length === 0) {
      setNetwork("");
      return;
    }

    const stillAvailable =
      availableNetworks.some(
        (item) =>
          item.toUpperCase() ===
          network.toUpperCase()
      );

    if (!stillAvailable) {
      setNetwork(availableNetworks[0]);
    }
  }, [
    currency,
    availableNetworks,
    network,
  ]);

  /*
   * ------------------------------------------------------
   * HANDLERS
   * ------------------------------------------------------
   */

  function handleCurrencyChange(
    value: string
  ) {
    setCurrency(value);
    setNetwork("");
    setAmount("");
    setError("");
    setSuccess("");
  }

  function handleSourceChange(
    value: WithdrawalSource
  ) {
    setSource(value);
    setAmount("");
    setError("");
    setSuccess("");
  }

  function handleAmountChange(
    value: string
  ) {
    if (value === "") {
      setAmount("");
      setError("");
      setSuccess("");
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    setAmount(value);
    setError("");
    setSuccess("");
  }

  function handleMaxAmount() {
    if (selectedBalance > 0) {
      setAmount(
        String(selectedBalance)
      );

      setError("");
      setSuccess("");
    }
  }

  /*
   * ------------------------------------------------------
   * SUBMIT
   * ------------------------------------------------------
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (submitting) {
      return;
    }

    if (!userId) {
      setError(
        "Your session has expired. Please sign in again."
      );
      return;
    }

    if (!currency) {
      setError(
        "Please select an asset."
      );
      return;
    }

    if (!selectedAsset) {
      setError(
        "The selected asset is not currently available."
      );
      return;
    }

    if (!selectedSupportedAsset) {
      setError(
        "This asset is not currently enabled for platform transactions."
      );
      return;
    }

    if (!network) {
      setError(
        "Please select a withdrawal network."
      );
      return;
    }

    if (!selectedNetworkRecord) {
      setError(
        "The selected network is not currently available for this asset."
      );
      return;
    }

    if (
      !amount ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Please enter a valid withdrawal amount."
      );
      return;
    }

    if (numericAmount > selectedBalance) {
      setError(
        `Insufficient ${currency} balance. You have ${formatAmount(
          selectedBalance
        )} ${currency} available in the selected balance.`
      );
      return;
    }

    const address =
      destinationAddress.trim();

    if (!address) {
      setError(
        "Please enter the destination wallet address."
      );
      return;
    }

    if (address.length < 10) {
      setError(
        "The destination wallet address appears to be invalid."
      );
      return;
    }

    if (
      !selectedNetworkRecord.wallet ||
      !selectedNetworkRecord.wallet.is_active
    ) {
      setError(
        "Withdrawals are not currently configured for this asset and network."
      );
      return;
    }

    /*
     * Final confirmation.
     */
    const sourceName =
      source === "investment_profit"
        ? "Investment Profit"
        : "Available Balance";

    const confirmed =
      window.confirm(
        `Confirm withdrawal of ${formatAmount(
          numericAmount
        )} ${currency} from ${sourceName} using ${network}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      /*
       * IMPORTANT:
       *
       * We do NOT insert directly into withdrawals.
       *
       * The RPC performs the entire financial operation
       * atomically.
       */
      const { data, error: rpcError } =
        await supabase.rpc(
          "request_withdrawal",
          {
            p_currency:
              currency.toUpperCase(),

            p_network:
              network,

            p_amount:
              numericAmount,

            p_destination_address:
              address,

            p_balance_source:
              source,
          }
        );

      if (rpcError) {
        console.error(
          "Withdrawal RPC error:",
          rpcError
        );

        throw new Error(
          rpcError.message ||
            "The withdrawal request was rejected."
        );
      }

      if (!data?.success) {
        throw new Error(
          "The withdrawal request was not completed."
        );
      }

      setSuccess(
        `Withdrawal request submitted successfully. ${formatAmount(
          numericAmount
        )} ${currency} has been reserved from your ${
          source === "investment_profit"
            ? "investment profit"
            : "available"
        } balance.`
      );

      setAmount("");
      setDestinationAddress("");

      /*
       * Refresh both balances and withdrawal history.
       */
      await loadData();
    } catch (err: any) {
      console.error(
        "Withdrawal submission error:",
        err
      );

      setError(
        err?.message ||
          "Unable to submit the withdrawal request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ------------------------------------------------------
   * LOADING
   * ------------------------------------------------------
   */

  if (loading) {
    return (
      <main className="withdraw-page">
        <div className="withdraw-loading">

          <div className="withdraw-spinner" />

          <p>
            Loading secure withdrawal center...
          </p>

        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------
   * PAGE
   * ------------------------------------------------------
   */

  return (
    <main className="withdraw-page">

      <div className="withdraw-container">

        <Link
          href="/dashboard"
          className="withdraw-back"
        >
          <span aria-hidden="true">
            ‹
          </span>

          Back to Dashboard
        </Link>

        <header className="withdraw-heading">

          <div>

            <p className="withdraw-eyebrow">
              SECURE FINANCIAL CENTER
            </p>

            <h1>
              Withdraw Funds
            </h1>

            <p className="withdraw-subtitle">
              Transfer funds securely from your
              available balance or investment profit.
            </p>

          </div>

          <div className="withdraw-security">

            <span className="security-dot" />

            Secure Withdrawal

          </div>

        </header>

        {error && (
          <div className="withdraw-alert withdraw-alert-error">

            <div className="alert-icon">
              !
            </div>

            <div>

              <strong>
                Request Not Submitted
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>
        )}

        {success && (
          <div className="withdraw-alert withdraw-alert-success">

            <div className="alert-icon">
              ✓
            </div>

            <div>

              <strong>
                Withdrawal Submitted
              </strong>

              <p>
                {success}
              </p>

            </div>

          </div>
        )}

        {/* =================================================
            BALANCE OVERVIEW
            ================================================= */}

        <section className="withdraw-balance-grid">

          <div className="withdraw-balance-card">

            <div className="withdraw-balance-top">

              <span>
                AVAILABLE BALANCE
              </span>

              <div className="balance-card-icon">
                $
              </div>

            </div>

            <strong>
              {formatAmount(
                selectedAvailableBalance
              )}
            </strong>

            <small>
              {currency || "USDT"} spendable funds
            </small>

          </div>

          <div className="withdraw-balance-card profit-card">

            <div className="withdraw-balance-top">

              <span>
                INVESTMENT PROFIT
              </span>

              <div className="balance-card-icon">
                ↗
              </div>

            </div>

            <strong>
              {formatAmount(
                selectedProfitBalance
              )}
            </strong>

            <small>
              {currency || "USDT"} investment earnings
            </small>

          </div>

          <div className="withdraw-balance-card total-card">

            <div className="withdraw-balance-top">

              <span>
                TOTAL FUNDS
              </span>

              <div className="balance-card-icon">
                ◈
              </div>

            </div>

            <strong>
              {formatAmount(
                totalSelectedFunds
              )}
            </strong>

            <small>
              Combined {currency || "USDT"} balance
            </small>

          </div>

        </section>

        {/* =================================================
            MAIN WORKSPACE
            ================================================= */}

        <section className="withdraw-layout">

          <div className="withdraw-main-card">

            <div className="card-header">

              <div>

                <span className="card-label">
                  WITHDRAWAL REQUEST
                </span>

                <h2>
                  Transfer Funds
                </h2>

              </div>

              <div className="card-icon">
                <span>
                  ↗
                </span>
              </div>

            </div>

            <form
              className="withdraw-form"
              onSubmit={handleSubmit}
            >

              {/* SOURCE */}

              <div className="form-group">

                <label>
                  Withdrawal Source
                </label>

                <div className="source-selector">

                  <button
                    type="button"
                    className={
                      source === "wallet"
                        ? "source-option active"
                        : "source-option"
                    }
                    onClick={() =>
                      handleSourceChange(
                        "wallet"
                      )
                    }
                  >

                    <div className="source-icon">
                      $
                    </div>

                    <div className="source-content">

                      <strong>
                        Available Balance
                      </strong>

                      <span>
                        Spendable account funds
                      </span>

                    </div>

                    <div className="source-amount">

                      {formatAmount(
                        selectedAvailableBalance
                      )}

                      <small>
                        {currency || "USDT"}
                      </small>

                    </div>

                  </button>

                  <button
                    type="button"
                    className={
                      source ===
                      "investment_profit"
                        ? "source-option active profit-source"
                        : "source-option profit-source"
                    }
                    onClick={() =>
                      handleSourceChange(
                        "investment_profit"
                      )
                    }
                  >

                    <div className="source-icon profit">
                      ↗
                    </div>

                    <div className="source-content">

                      <strong>
                        Investment Profit
                      </strong>

                      <span>
                        Withdraw your investment earnings
                      </span>

                    </div>

                    <div className="source-amount">

                      {formatAmount(
                        selectedProfitBalance
                      )}

                      <small>
                        {currency || "USDT"}
                      </small>

                    </div>

                  </button>

                </div>

              </div>

              {/* ASSET */}

              <div className="form-group">

                <label htmlFor="currency">
                  Asset
                </label>

                <div className="select-wrapper">

                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) =>
                      handleCurrencyChange(
                        event.target.value
                      )
                    }
                  >

                    <option value="">
                      Select asset
                    </option>

                    {Array.from(
                      new Set([
                        ...balances.map(
                          (item) =>
                            item.currency.toUpperCase()
                        ),
                        ...profitBalances.map(
                          (item) =>
                            item.currency.toUpperCase()
                        ),
                      ])
                    ).map((symbol) => (
                      <option
                        key={symbol}
                        value={symbol}
                      >
                        {symbol}
                      </option>
                    ))}

                  </select>

                </div>

              </div>

              {/* NETWORK + AMOUNT */}

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="network">
                    Network
                  </label>

                  <div className="select-wrapper">

                    <select
                      id="network"
                      value={network}
                      onChange={(event) =>
                        setNetwork(
                          event.target.value
                        )
                      }
                      disabled={
                        !currency ||
                        availableNetworks.length ===
                          0
                      }
                    >

                      <option value="">
                        {!currency
                          ? "Select asset first"
                          : availableNetworks.length ===
                            0
                          ? "No network available"
                          : "Select network"}
                      </option>

                      {availableNetworks.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                </div>

                <div className="form-group">

                  <label htmlFor="amount">
                    Withdrawal Amount
                  </label>

                  <div className="amount-input-wrapper">

                    <input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) =>
                        handleAmountChange(
                          event.target.value
                        )
                      }
                    />

                    <span className="amount-currency">
                      {currency || "ASSET"}
                    </span>

                    <button
                      type="button"
                      className="max-button"
                      onClick={
                        handleMaxAmount
                      }
                      disabled={
                        selectedBalance <= 0
                      }
                    >
                      MAX
                    </button>

                  </div>

                </div>

              </div>

              {/* DESTINATION */}

              <div className="form-group">

                <label htmlFor="destination">
                  Destination Wallet Address
                </label>

                <input
                  id="destination"
                  type="text"
                  placeholder="Enter the receiving wallet address"
                  value={destinationAddress}
                  onChange={(event) =>
                    setDestinationAddress(
                      event.target.value
                    )
                  }
                  autoComplete="off"
                  spellCheck={false}
                />

                <small className="field-help">
                  Make sure this address supports the
                  selected asset and network.
                </small>

              </div>

              {/* LIVE SUMMARY */}

              <div className="withdraw-summary">

                <div className="summary-heading">
                  Transaction Summary
                </div>

                <div className="summary-row">

                  <span>
                    Withdrawal source
                  </span>

                  <strong>
                    {source ===
                    "investment_profit"
                      ? "Investment Profit"
                      : "Available Balance"}
                  </strong>

                </div>

                <div className="summary-row">

                  <span>
                    Requested amount
                  </span>

                  <strong>
                    {numericAmount > 0
                      ? `${formatAmount(
                          numericAmount
                        )} ${currency}`
                      : "0"}
                  </strong>

                </div>

                <div className="summary-row">

                  <span>
                    Network
                  </span>

                  <strong>
                    {network ||
                      "Not selected"}
                  </strong>

                </div>

                <div className="summary-row">

                  <span>
                    Network / withdrawal fee
                  </span>

                  <strong>
                    {formatAmount(
                      withdrawalFee
                    )}{" "}
                    {currency}
                  </strong>

                </div>

                <div className="summary-divider" />

                <div className="summary-row">

                  <span>
                    Remaining balance
                  </span>

                  <strong>
                    {formatAmount(
                      remainingBalance
                    )}{" "}
                    {currency}
                  </strong>

                </div>

                <div className="summary-row summary-total">

                  <span>
                    You will receive
                  </span>

                  <strong>
                    {netAmount > 0
                      ? `${formatAmount(
                          netAmount
                        )} ${currency}`
                      : "0"}
                  </strong>

                </div>

              </div>

              {/* SECURITY NOTICE */}

              <div className="withdraw-notice">

                <div className="notice-icon">
                  ✓
                </div>

                <div>

                  <strong>
                    Secure balance protection
                  </strong>

                  <p>
                    Your selected balance is validated
                    and deducted securely on the server
                    when this request is submitted.
                    Never share your private keys or
                    wallet recovery phrase.
                  </p>

                </div>

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                className="submit-withdrawal"
                disabled={
                  submitting ||
                  !currency ||
                  !selectedAsset ||
                  !selectedSupportedAsset ||
                  !network ||
                  !selectedNetworkRecord ||
                  !amount ||
                  numericAmount <= 0 ||
                  numericAmount >
                    selectedBalance ||
                  !destinationAddress.trim()
                }
              >

                {submitting ? (
                  <>
                    <span className="button-spinner" />

                    Processing Secure Withdrawal...
                  </>
                ) : (
                  <>
                    Review & Submit Withdrawal

                    <span aria-hidden="true">
                      →
                    </span>
                  </>
                )}

              </button>

            </form>

          </div>

          {/* =================================================
              SIDEBAR
              ================================================= */}

          <aside className="withdraw-sidebar">

            <div className="balance-card">

              <span className="sidebar-label">
                ACCOUNT BALANCES
              </span>

              <h3>
                Your Funds
              </h3>

              <div className="balance-list">

                {Array.from(
                  new Set([
                    ...balances.map(
                      (item) =>
                        item.currency.toUpperCase()
                    ),
                    ...profitBalances.map(
                      (item) =>
                        item.currency.toUpperCase()
                    ),
                  ])
                ).map((symbol) => {

                  const available =
                    Number(
                      balances.find(
                        (item) =>
                          item.currency.toUpperCase() ===
                          symbol
                      )?.balance || 0
                    );

                  const profit =
                    Number(
                      profitBalances.find(
                        (item) =>
                          item.currency.toUpperCase() ===
                          symbol
                      )?.balance || 0
                    );

                  return (
                    <button
                      type="button"
                      key={symbol}
                      className={`balance-item ${
                        currency === symbol
                          ? "balance-item-active"
                          : ""
                      }`}
                      onClick={() =>
                        handleCurrencyChange(
                          symbol
                        )
                      }
                    >

                      <div className="balance-symbol">
                        {symbol
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>

                      <div className="balance-details">

                        <strong>
                          {symbol}
                        </strong>

                        <span>
                          Available
                        </span>

                      </div>

                      <div className="balance-value">

                        {formatAmount(
                          available
                        )}

                      </div>

                    </button>
                  );
                })}

              </div>

            </div>

            <div className="information-card">

              <div className="information-icon">
                ✓
              </div>

              <h3>
                Withdrawal Security
              </h3>

              <ul>

                <li>
                  Verify the destination address.
                </li>

                <li>
                  Select the correct network.
                </li>

                <li>
                  Check the withdrawal source.
                </li>

                <li>
                  Transactions may require review.
                </li>

                <li>
                  Never share private keys.
                </li>

              </ul>

            </div>

            <div className="support-card">

              <span className="sidebar-label">
                TRANSACTION CENTER
              </span>

              <h3>
                Track Your Funds
              </h3>

              <p>
                Review your deposits, withdrawals,
                investments, returns and account
                adjustments from your transaction center.
              </p>

              <Link
                href="/dashboard/transactions"
                className="support-link"
              >
                View Transactions

                <span aria-hidden="true">
                  →
                </span>

              </Link>

            </div>

          </aside>

        </section>

        {/* =================================================
            WITHDRAWAL HISTORY
            ================================================= */}

        <section className="history-card">

          <div className="history-header">

            <div>

              <span className="card-label">
                ACCOUNT ACTIVITY
              </span>

              <h2>
                Recent Withdrawals
              </h2>

            </div>

            <Link
              href="/dashboard/transactions"
              className="view-all-link"
            >
              View all

              <span aria-hidden="true">
                →
              </span>

            </Link>

          </div>

          {withdrawals.length === 0 ? (
            <div className="history-empty">

              <div className="history-empty-icon">
                ◷
              </div>

              <h3>
                No withdrawal requests yet
              </h3>

              <p>
                Your submitted withdrawal requests
                will appear here.
              </p>

            </div>
          ) : (
            <div className="withdrawal-table-wrapper">

              <table className="withdrawal-table">

                <thead>

                  <tr>

                    <th>
                      Asset
                    </th>

                    <th>
                      Source
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Network
                    </th>

                    <th>
                      Destination
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Requested
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {withdrawals.map(
                    (item) => (
                      <tr key={item.id}>

                        <td>

                          <span className="table-asset">
                            {item.currency.toUpperCase()}
                          </span>

                        </td>

                        <td>

                          <span className="withdrawal-source">

                            {item.balance_source ===
                            "investment_profit"
                              ? "Investment Profit"
                              : "Available Balance"}

                          </span>

                        </td>

                        <td>

                          <strong>
                            {formatAmount(
                              item.amount
                            )}{" "}
                            {item.currency.toUpperCase()}
                          </strong>

                        </td>

                        <td>
                          {item.network ||
                            "—"}
                        </td>

                        <td>

                          <span
                            className="destination-address"
                            title={
                              item.destination_address
                            }
                          >
                            {shortenAddress(
                              item.destination_address
                            )}
                          </span>

                        </td>

                        <td>

                          <span
                            className={`withdrawal-status ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>

                        </td>

                        <td>
                          {formatDate(
                            item.requested_at
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        <footer className="withdraw-footer">

          <span>
            Secure Investor Portal
          </span>

          <span className="footer-separator">
            •
          </span>

          <span>
            Financial operations are securely
            processed server-side
          </span>

        </footer>

      </div>

    </main>
  );
}
