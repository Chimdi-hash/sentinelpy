"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Coins, 
  Users, 
  Eye, 
  TrendingUp, 
  Briefcase, 
  Search, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Lock, 
  Mail, 
  Globe, 
  ArrowLeft,
  Sparkles,
  Settings
} from 'lucide-react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const AUTHORIZED_ADMIN = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").toLowerCase();

export default function AdminPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Contract State
  const [protocolStats, setProtocolStats] = useState<{
    owner?: string;
    treasury?: string;
    total_fees_collected_wei?: string;
    total_slashed_captured_wei?: string;
    total_jobs_completed?: number;
    total_jobs_created?: number;
    total_submissions?: number;
  }>({});
  const [jobs, setJobs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Database Metrics
  const [dbMetrics, setDbMetrics] = useState<{
    totalUsers: number;
    flaggedUsers: number;
    totalPageviews: number;
    uniqueVisitors: number;
  }>({ totalUsers: 0, flaggedUsers: 0, totalPageviews: 0, uniqueVisitors: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<any[]>([]);

  // UI Filters
  const [activeTab, setActiveTab] = useState<'revenue' | 'analytics' | 'gigs' | 'users'>('revenue');
  const [userSearch, setUserSearch] = useState('');
  const [gigStatusFilter, setGigStatusFilter] = useState('ALL');

  // Treasury Update Form State
  const [newTreasuryInput, setNewTreasuryInput] = useState('');
  const [isUpdatingTreasury, setIsUpdatingTreasury] = useState(false);
  const [treasuryUpdateMsg, setTreasuryUpdateMsg] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x75B4aBC58426FB6D817Ed02b3b243a9A8Bb2c0E0";

  // Connect Wallet
  const connectWallet = async () => {
    try {
      setConnecting(true);
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setAccount(accounts[0]);
        }
      } else {
        alert('Please install MetaMask or another Web3 wallet to access the Admin Command Center.');
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  // Check initial connected wallet
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts[0]) {
          setAccount(accounts[0]);
        }
      });

      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
    }
  }, []);

  const isAuthorized = account && account.toLowerCase() === AUTHORIZED_ADMIN.toLowerCase();

  // Fetch Admin Data
  const loadAdminData = useCallback(async () => {
    if (!account || !isAuthorized) return;
    setLoading(true);

    try {
      // 1. Fetch DB Analytics
      const res = await fetch(`/api/admin/metrics?admin=${account}`);
      if (res.ok) {
        const data = await res.json();
        setDbMetrics(data.metrics || {});
        setUsersList(data.recentUsers || []);
        setVisitorLogs(data.recentLogs || []);
      }

      // 2. Fetch On-Chain Protocol Metrics via GenLayer Read Client
      const readClient = createClient({
        chain: studionet,
      });

      try {
        const statsStr = await (readClient as any).readContract({
          address: contractAddress,
          functionName: 'get_protocol_stats',
          args: [],
        });
        if (statsStr) {
          setProtocolStats(JSON.parse(statsStr));
        }
      } catch (e) {
        console.warn('Contract get_protocol_stats read fallback:', e);
      }

      try {
        const allJobsStr = await (readClient as any).readContract({
          address: contractAddress,
          functionName: 'get_all_jobs',
          args: [],
        });
        if (allJobsStr) {
          setJobs(JSON.parse(allJobsStr));
        }
      } catch (e) {
        console.warn('Contract get_all_jobs read fallback:', e);
      }

      try {
        const allSubsStr = await (readClient as any).readContract({
          address: contractAddress,
          functionName: 'get_all_submissions',
          args: [],
        });
        if (allSubsStr) {
          setSubmissions(JSON.parse(allSubsStr));
        }
      } catch (e) {
        console.warn('Contract get_all_submissions read fallback:', e);
      }

    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [account, isAuthorized, contractAddress]);

  useEffect(() => {
    if (isAuthorized) {
      loadAdminData();
    }
  }, [isAuthorized, loadAdminData]);

  // Update Treasury Action
  const handleUpdateTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreasuryInput.trim()) return;

    try {
      setIsUpdatingTreasury(true);
      setTreasuryUpdateMsg(null);

      const writeClient = (createClient as any)({
        chain: studionet,
        provider: (window as any).ethereum,
      });

      const tx = await (writeClient as any).writeContract({
        address: contractAddress,
        functionName: 'set_treasury',
        args: [newTreasuryInput.trim()],
        account: account as any,
      });

      setTreasuryUpdateMsg(`Treasury update transaction submitted: ${tx}`);
      setNewTreasuryInput('');
      await loadAdminData();
    } catch (err: any) {
      setTreasuryUpdateMsg(`Error updating treasury: ${err.message || err}`);
    } finally {
      setIsUpdatingTreasury(false);
    }
  };

  // 403 Forbidden Screen if not authorized
  if (!account || !isAuthorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 selection:bg-slate-200">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl glass-panel shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Restricted Command Center</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            This developer portal is cryptographically secured. You must connect the authorized protocol owner or treasury wallet to continue.
          </p>

          <div className="p-3.5 rounded-2xl glass-slide text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Authorized Protocol Wallet</span>
            <span className="text-xs font-mono text-slate-800 break-all font-semibold">
              {AUTHORIZED_ADMIN ? `${AUTHORIZED_ADMIN.slice(0, 6)}••••••••${AUTHORIZED_ADMIN.slice(-4)}` : 'Restricted (Admin Only)'}
            </span>
          </div>

          {account ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                Connected address <span className="font-mono font-bold">{account.slice(0, 6)}...{account.slice(-4)}</span> is not authorized.
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl glass-card hover:bg-white text-slate-800 text-xs font-bold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Link>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md"
            >
              {connecting ? 'Connecting...' : 'Connect Developer Wallet'}
            </button>
          )}
        </div>
      </main>
    );
  }

  // Calculate parsed revenues
  const totalFeesWei = BigInt(protocolStats.total_fees_collected_wei || '0');
  const totalSlashedWei = BigInt(protocolStats.total_slashed_captured_wei || '0');
  const totalGrossRevenueWei = totalFeesWei + totalSlashedWei;

  const totalFeesGen = Number(totalFeesWei) / 10**18;
  const totalSlashedGen = Number(totalSlashedWei) / 10**18;
  const totalGrossRevenueGen = Number(totalGrossRevenueWei) / 10**18;

  // Filtered Gigs
  const filteredJobs = jobs.filter((j) => {
    if (gigStatusFilter === 'ALL') return true;
    return j.status === gigStatusFilter;
  });

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (
      u.address.toLowerCase().includes(term) ||
      (u.displayName && u.displayName.toLowerCase().includes(term)) ||
      (u.headline && u.headline.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-slate-200 selection:text-slate-900 pb-16">
      
      {/* Top Admin Banner */}
      <div className="border-b border-white/70 bg-white/75 backdrop-blur-xl sticky top-0 z-30 shadow-sm shadow-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl glass-card hover:bg-white text-slate-700 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-slate-900">TrustlessWork Command Center</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Owner Authenticated
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Treasury: {AUTHORIZED_ADMIN.slice(0, 10)}...{AUTHORIZED_ADMIN.slice(-8)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white text-xs font-semibold text-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 pt-2 border-t border-slate-200/60">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center space-x-2 ${
              activeTab === 'revenue'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Revenue Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center space-x-2 ${
              activeTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Traffic & Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('gigs')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center space-x-2 ${
              activeTab === 'gigs'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Gig Inventory ({jobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center space-x-2 ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Directory ({dbMetrics.totalUsers})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">

        {/* ================= SECTION 1: REVENUE ENGINE ================= */}
        {activeTab === 'revenue' && (
          <div className="space-y-8">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="p-6 rounded-3xl glass-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Slashed Stakes</span>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-3xl font-black text-slate-900">{totalSlashedGen.toFixed(3)} <span className="text-xs font-normal text-slate-400">GEN</span></p>
                <p className="text-[11px] text-slate-500 mt-2">100% captured from rejected deliverables directly to your treasury.</p>
              </div>

              <div className="p-6 rounded-3xl glass-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Fees (2.5%)</span>
                  <Coins className="w-4 h-4 text-slate-700" />
                </div>
                <p className="text-3xl font-black text-slate-900">{totalFeesGen.toFixed(3)} <span className="text-xs font-normal text-slate-400">GEN</span></p>
                <p className="text-[11px] text-slate-500 mt-2">250 bps take-rate automatically routed on successful deliverable completions.</p>
              </div>

              <div className="p-6 rounded-3xl glass-panel">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Gross Protocol Profit</span>
                  <TrendingUp className="w-4 h-4 text-slate-800" />
                </div>
                <p className="text-3xl font-black text-slate-900">{totalGrossRevenueGen.toFixed(3)} <span className="text-xs font-normal text-slate-500">GEN</span></p>
                <p className="text-[11px] text-slate-500 mt-2">Total revenue delivered directly to your wallet address.</p>
              </div>

              <div className="p-6 rounded-3xl glass-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Deliverables</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-3xl font-black text-slate-900">{protocolStats.total_jobs_completed || 0}</p>
                <p className="text-[11px] text-slate-500 mt-2">Gigs successfully approved by GenVM AI consensus.</p>
              </div>
            </div>

            {/* Treasury Control Card */}
            <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-4">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-bold text-slate-900">Treasury Management</h3>
              </div>
              <p className="text-xs text-slate-500">
                All 2.5% protocol take-rate fees and 100% slashed freelancer collateral are streamed directly to this address.
              </p>

              <div className="p-4 rounded-2xl glass-slide flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current On-Chain Treasury</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{protocolStats.treasury || AUTHORIZED_ADMIN}</span>
                </div>
                <a
                  href={`https://explorer.genlayer.network/address/${protocolStats.treasury || AUTHORIZED_ADMIN}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-950 transition shadow-sm"
                >
                  <span>View in Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleUpdateTreasury} className="space-y-4 pt-2">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Update Treasury Recipient Address
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newTreasuryInput}
                    onChange={(e) => setNewTreasuryInput(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingTreasury || !newTreasuryInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50"
                  >
                    {isUpdatingTreasury ? 'Updating...' : 'Set New Treasury'}
                  </button>
                </div>
                {treasuryUpdateMsg && (
                  <p className="text-xs font-mono text-slate-700 mt-2">{treasuryUpdateMsg}</p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: AUDIENCE & TELEMETRY ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl glass-card">
                <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Total Pageviews</span>
                <p className="text-3xl font-black text-slate-900">{dbMetrics.totalPageviews}</p>
                <p className="text-[11px] text-slate-500 mt-2">Logged in SQLite database</p>
              </div>

              <div className="p-6 rounded-3xl glass-card">
                <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Unique Visitors</span>
                <p className="text-3xl font-black text-slate-900">{dbMetrics.uniqueVisitors}</p>
                <p className="text-[11px] text-slate-500 mt-2">Unique daily salted IP hashes</p>
              </div>

              <div className="p-6 rounded-3xl glass-card">
                <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Registered Profiles</span>
                <p className="text-3xl font-black text-slate-900">{dbMetrics.totalUsers}</p>
                <p className="text-[11px] text-slate-500 mt-2">Completed user dossiers</p>
              </div>

              <div className="p-6 rounded-3xl glass-card">
                <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Flagged Accounts</span>
                <p className="text-3xl font-black text-amber-600">{dbMetrics.flaggedUsers}</p>
                <p className="text-[11px] text-slate-500 mt-2">Accounts marked for review</p>
              </div>
            </div>

            {/* Visitor Table */}
            <div className="p-6 rounded-3xl glass-panel">
              <h3 className="text-base font-bold text-slate-900 mb-4">Recent Visitor Activity Stream</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Visitor Hash</th>
                      <th className="p-3">Page Visited</th>
                      <th className="p-3">User Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitorLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="p-3 text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">{log.visitorHash}</td>
                        <td className="p-3 font-semibold text-slate-900">{log.page}</td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">{log.userAgent}</td>
                      </tr>
                    ))}
                    {visitorLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">
                          No visitor logs recorded yet. Telemetry will record automatically as users browse.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 3: GIG INVENTORY ================= */}
        {activeTab === 'gigs' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {['ALL', 'OPEN', 'IN_REVIEW', 'AWAITING_CLIENT_ACTION', 'COMPLETED', 'CANCELLED_REFUNDED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setGigStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    gigStatusFilter === st
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'glass-card text-slate-600 hover:bg-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-6 rounded-3xl glass-card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        #{job.id}
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{job.title}</h4>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase bg-slate-100 text-slate-700">
                      {job.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{job.description || 'No description provided'}</p>

                  <div className="p-3 rounded-2xl glass-slide text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Client Acceptance Rubric</span>
                    <p className="text-slate-800 font-mono">{job.rubric}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                    <div>
                      <span>Escrow Pool: </span>
                      <span className="font-bold text-slate-900">
                        {(Number(job.escrow_balance || '0') / 10**18).toFixed(2)} GEN
                      </span>
                    </div>
                    <div>
                      <span>Client: </span>
                      <span className="font-mono text-slate-700">{job.client}</span>
                    </div>
                    <div>
                      <span>Pending Reviews: </span>
                      <span className="font-bold text-slate-900">{job.pending_submissions || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION 4: USER DIRECTORY ================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user profiles by wallet address, display name, or headline..."
                className="w-full glass-input rounded-2xl pl-11 pr-4 py-3 text-xs"
              />
            </div>

            <div className="p-6 rounded-3xl glass-panel">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Headline / Roles</th>
                      <th className="p-3.5">Skills</th>
                      <th className="p-3.5">Socials & Contact</th>
                      <th className="p-3.5">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.address} className="hover:bg-slate-50/60">
                        <td className="p-3.5">
                          <div className="flex items-center space-x-3">
                            <img
                              src={u.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.address}`}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{u.displayName || 'Anonymous Hunter'}</p>
                              <p className="text-[10px] font-mono text-slate-400">{u.address.slice(0, 6)}...{u.address.slice(-4)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <p className="text-slate-800 font-semibold">{u.headline || 'Web3 Builder'}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(u.roles || []).map((r: string) => (
                              <span key={r} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(u.skills || []).slice(0, 4).map((s: string) => (
                              <span key={s} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                            {(u.skills || []).length > 4 && (
                              <span className="text-[9px] text-slate-400">+{u.skills.length - 4}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center space-x-2 text-slate-500">
                            {u.email && (
                              <a href={`mailto:${u.email}`} title={u.email} className="hover:text-slate-900">
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {u.linkedin && (
                              <a href={u.linkedin} target="_blank" rel="noreferrer" title="LinkedIn" className="hover:text-slate-900">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {u.twitter && (
                              <a href={u.twitter} target="_blank" rel="noreferrer" title="X (Twitter)" className="hover:text-slate-900">
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No users registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
