"use client";

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, User, ShieldAlert, PlusCircle } from 'lucide-react';

interface NavbarProps {
  account: string | null;
  onConnectWallet: () => void;
  userProfile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  activeTab?: 'gigs' | 'my-gigs' | 'leaderboard';
  setActiveTab?: (tab: 'gigs' | 'my-gigs' | 'leaderboard') => void;
}

const DEV_TREASURY_ADDRESS = "0x740ad14abb7991d45ba4dec88b59ef12af33dbbb";

export default function Navbar({
  account,
  onConnectWallet,
  userProfile,
  activeTab = 'gigs',
  setActiveTab,
}: NavbarProps) {
  const isAdmin = account && account.toLowerCase() === DEV_TREASURY_ADDRESS.toLowerCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/70 bg-white/75 backdrop-blur-xl shadow-sm shadow-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl glass-slide flex items-center justify-center text-slate-800 shadow-md shadow-slate-300/40 border border-white group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-slate-800" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  Trustless<span className="text-slate-500">Work</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tracking-wider uppercase">
                  GenVM
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Decentralized Escrow Protocol</p>
            </div>
          </Link>

          {/* Navigation Pills */}
          {setActiveTab && (
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
              <button
                onClick={() => setActiveTab('gigs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'gigs'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Available Gigs
              </button>
              <button
                onClick={() => setActiveTab('my-gigs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'my-gigs'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                My Escrows
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'leaderboard'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Leaderboard
              </button>
            </nav>
          )}
        </div>

        {/* Right Section: Stealth Admin + Profile Link + Wallet */}
        <div className="flex items-center space-x-3">
          
          {/* Stealth Admin Portal Pill (Only for Owner/Dev) */}
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Portal</span>
            </Link>
          )}

          {/* User Profile Button */}
          {account ? (
            <Link
              href="/profile"
              className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl glass-card glass-card-hover group border border-white"
              title="Edit Your Appearance in the Job Market"
            >
              <img
                src={userProfile?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${account}`}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${account}`;
                }}
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 group-hover:text-slate-600 transition">
                  {userProfile?.displayName || `${account.slice(0, 6)}...${account.slice(-4)}`}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
              </div>
            </Link>
          ) : (
            <button
              onClick={onConnectWallet}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-md active:scale-95"
            >
              Connect EVM Wallet
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
