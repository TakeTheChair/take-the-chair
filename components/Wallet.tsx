"use client";
// Wallet connection with the browser wallet (MetaMask, Rabby, Robinhood Wallet, etc.).
// No third-party connector service: it talks to window.ethereum directly and adds Robinhood Chain if needed.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, type Address, type WalletClient } from "viem";
import { robinhoodChain } from "@/lib/chain";

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (e: string, f: (x: unknown) => void) => void; removeListener?: (e: string, f: (x: unknown) => void) => void };
declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

type Ctx = {
  address?: Address;
  chainId?: number;
  connecting: boolean;
  hasWallet: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  ensureChain: () => Promise<boolean>;
  walletClient?: WalletClient;
  error?: string;
};

const WalletCtx = createContext<Ctx | null>(null);

export const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [connecting, setConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    setHasWallet(true);
    const onAccounts = (a: unknown) => setAddress((a as string[])[0] as Address | undefined);
    const onChain = (c: unknown) => setChainId(parseInt(c as string, 16));
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    eth.request({ method: "eth_accounts" }).then(onAccounts).catch(() => {});
    eth.request({ method: "eth_chainId" }).then(onChain).catch(() => {});
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const ensureChain = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return false;
    const hex = "0x" + robinhoodChain.id.toString(16);
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      return true;
    } catch (e: unknown) {
      const code = (e as { code?: number }).code;
      if (code === 4902 || code === -32603) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hex,
                chainName: robinhoodChain.name,
                nativeCurrency: robinhoodChain.nativeCurrency,
                rpcUrls: robinhoodChain.rpcUrls.default.http,
                blockExplorerUrls: [robinhoodChain.blockExplorers.default.url],
              },
            ],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    setError(undefined);
    if (!eth) {
      setError("No wallet found. Install MetaMask, Rabby or Robinhood Wallet, then reload.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accounts[0] as Address);
      await ensureChain();
      const c = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(c, 16));
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? "Connection cancelled.");
    } finally {
      setConnecting(false);
    }
  }, [ensureChain]);

  const disconnect = useCallback(() => setAddress(undefined), []);

  const walletClient = useMemo(() => {
    if (!address || !window.ethereum) return undefined;
    return createWalletClient({ account: address, chain: robinhoodChain, transport: custom(window.ethereum) });
  }, [address]);

  const value = useMemo(
    () => ({ address, chainId, connecting, hasWallet, connect, disconnect, ensureChain, walletClient, error }),
    [address, chainId, connecting, hasWallet, connect, disconnect, ensureChain, walletClient, error],
  );
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet outside WalletProvider");
  return ctx;
}

export function short(a?: string) {
  return a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
}

export function ConnectButton({ className = "btn" }: { className?: string }) {
  const w = useWallet();
  if (w.address) {
    const wrong = w.chainId !== undefined && w.chainId !== robinhoodChain.id;
    return (
      <span className="wallet-pill">
        {wrong ? (
          <button className="btn btn-quiet" onClick={() => w.ensureChain()} type="button">
            Switch to Robinhood Chain
          </button>
        ) : (
          <span className="num">{short(w.address)}</span>
        )}
        <button className="wallet-x" onClick={w.disconnect} type="button" aria-label="Disconnect">
          ×
        </button>
      </span>
    );
  }
  return (
    <button className={className} onClick={w.connect} disabled={w.connecting} type="button">
      {w.connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
