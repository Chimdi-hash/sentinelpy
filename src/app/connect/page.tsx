"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight,
  Wallet
} from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  iconSvg: React.ReactNode;
}

export default function ConnectWalletPage() {
  const router = useRouter();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  // Check if wallet is already connected
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts[0]) {
          setActiveAccount(accounts[0]);
        }
      }).catch(() => {});
    }
  }, []);

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      tagline: 'Connect using MetaMask browser extension or mobile app',
      badge: 'Popular',
      iconSvg: (
        <img
          src="/metamask-fox.svg"
          alt="MetaMask Logo"
          className="w-7 h-7 object-contain drop-shadow-sm select-none"
        />
      )
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      tagline: 'Game-changing Web3 wallet designed for DeFi and smart contract safety',
      badge: 'Recommended',
      iconSvg: (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
          R
        </div>
      )
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      tagline: 'Connect via Coinbase Smart Wallet or mobile app',
      iconSvg: (
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          C
        </div>
      )
    },
    {
      id: 'injected',
      name: 'Browser Injected Wallet',
      tagline: 'Connect using Brave Wallet, Zerion, Frame, or any installed EIP-1193 provider',
      iconSvg: (
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white">
          <Wallet className="w-4 h-4" />
        </div>
      )
    }
  ];

  const handleConnectWallet = async (walletId: string) => {
    setConnectingId(walletId);
    setErrorMessage(null);

    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error("No EVM wallet detected. Please install MetaMask, Rabby, or a browser wallet extension.");
      }

      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts authorized. Please grant permission in your wallet.");
      }

      const connectedAddr = accounts[0];
      setActiveAccount(connectedAddr);

      // Auto-initialize profile in background
      try {
        await fetch(`/api/users/${connectedAddr}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: `Hunter_${connectedAddr.slice(2, 6)}`,
            headline: 'Web3 Freelancer & Builder',
          }),
        });
      } catch (err) {
        // Non-blocking
      }

      // Smooth transition to dashboard with welcome animation flag
      router.push('/dashboard?welcome=1');

    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setErrorMessage(err.message || "Failed to connect wallet. Please try again.");
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-slate-200 selection:text-slate-900">
      
      {/* Top Glass Bar - Concise Height */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </Link>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl glass-slide flex items-center justify-center text-slate-800 shadow-sm border border-white">
              <ShieldCheck className="w-4 h-4 text-slate-800" />
            </div>
            <span className="text-sm font-extrabold text-slate-900">TrustlessWork</span>
          </div>

          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            EVM Network: GenLayer Studionet
          </div>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-lg glass-panel p-8 sm:p-10 rounded-3xl space-y-6 relative overflow-hidden">
          
          {/* Subtle Ambient Background Highlight */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-800 shadow-sm mb-3">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Choose your EVM Wallet
            </h1>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Select your preferred provider to authenticate and access the TrustlessWork workspace.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Active Connected Alert if already connected */}
          {activeAccount && (
            <div className="p-4 rounded-2xl glass-slide border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Wallet Connected</span>
                  <p className="font-mono text-[11px] text-slate-500">{activeAccount.slice(0, 8)}...{activeAccount.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard?welcome=1')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition"
              >
                Enter App
              </button>
            </div>
          )}

          {/* Wallet Selection Palette */}
          <div className="space-y-3">
            {walletOptions.map((wallet) => {
              const isConnecting = connectingId === wallet.id;

              return (
                <button
                  key={wallet.id}
                  onClick={() => handleConnectWallet(wallet.id)}
                  disabled={Boolean(connectingId)}
                  className="w-full p-4 rounded-2xl glass-card glass-card-hover flex items-center justify-between text-left transition group disabled:opacity-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-1 shrink-0">
                      {wallet.iconSvg}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-slate-700 transition">
                          {wallet.name}
                        </span>
                        {wallet.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {wallet.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{wallet.tagline}</p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isConnecting ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-slate-800 transition" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Privacy Note */}
          <div className="pt-2 text-center text-[11px] text-slate-500 space-y-1">
            <p>TrustlessWork uses cryptographic EVM wallet signatures.</p>
            <p>Your private keys never leave your browser extension.</p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/40 py-6 text-center text-xs text-slate-500">
        TrustlessWork Protocol • Impartial Milestone Escrows
      </footer>

    </div>
  );
}
