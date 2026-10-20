"use client";

import React from 'react';
import Link from 'next/navigation';
import { ShieldCheck, User, Sparkles, ExternalLink, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  account: string | null;
  onConnectWallet: () => void;
  onOpenProfile: () => void;
  userProfile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  activeTab: 'gigs' | 'my-gigs' | 'leaderboard';
  setActiveTab: (tab: 'gigs' | 'my-gigs' | 'leaderboard') => void;
}

const DEV_TREASURY_ADDRESS = "0x740ad14abb7991d45ba4dec88b59ef12af33dbbb";

export default function Navbar({
  account,
  onConnectWallet,
  onOpenProfile,
  userProfile,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  const isAdmin = account && account.toLowerCase() === DEV_TREASURY_ADDRESS.toLowerCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-6">
          <a href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-white">Trustless<span className="text-cyan-400">Work</span></span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 tracking-wide uppercase">
                  GenVM AI
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Decentralized Escrow & Deliverable Quality Protocol</p>
            </div>
          </a>

          {/* Navigation Pills */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-zinc-800">
            <button
              onClick={() => setActiveTab('gigs')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'gigs'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Explore Gigs
            </button>
            <button
              onClick={() => setActiveTab('my-gigs')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'my-gigs'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              My Escrows & Submissions
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'leaderboard'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Leaderboard
            </button>
          </nav>
        </div>

        {/* Right Section: Stealth Admin + Profile + Wallet */}
        <div className="flex items-center space-x-3">
          
          {/* Stealth Admin Portal Pill (Only visible for Owner/Dev) */}
          {isAdmin && (
            <a
              href="/admin"
              className="relative inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:border-amber-400 transition shadow-sm shadow-amber-500/20 group"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span>Admin Portal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </a>
          )}

          {/* User Profile Badge (if connected) */}
          {account ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenProfile}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 transition group"
                title="Edit Professional Profile"
              >
                <img
                  src={userProfile?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${account}`}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full object-cover border border-cyan-500/40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${account}`;
                  }}
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 transition">
                    {userProfile?.displayName || `${account.slice(0, 6)}...${account.slice(-4)}`}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
              </button>

              <button
                onClick={onOpenProfile}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
                title="Edit Profile"
              >
                <User className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              Connect Wallet
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
