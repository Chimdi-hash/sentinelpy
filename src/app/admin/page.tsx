"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { custom } from 'viem';

const AUTHORIZED_ADMIN = "0x740ad14abb7991d45ba4dec88b59ef12af33dbbb";

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
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0');
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
          const parsed = JSON.parse(statsStr);
          setProtocolStats(parsed);
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
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Restricted Access</h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            This developer portal is cryptographically secured. You must connect the authorized protocol owner or treasury wallet to continue.
          </p>

          <div className="p-3 mb-6 rounded-xl bg-zinc-950 border border-zinc-800 text-left">
            <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Authorized Treasury Address</span>
            <span className="text-xs font-mono text-cyan-400 break-all">{AUTHORIZED_ADMIN}</span>
          </div>

          {account ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                Connected address <span className="font-mono">{account.slice(0, 6)}...{account.slice(-4)}</span> is not authorized.
              </div>
              <a
                href="/"
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Marketplace</span>
              </a>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-500/20"
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      
      {/* Top Admin Banner */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <a
              href="/"
              className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              title="Return to Public App"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white">TrustlessWork Command Center</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                  Owner Authenticated
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Treasury: {AUTHORIZED_ADMIN.slice(0, 10)}...{AUTHORIZED_ADMIN.slice(-8)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 pt-2 border-t border-zinc-800/40">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'revenue'
                ? 'border-amber-500 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Revenue Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'analytics'
                ? 'border-cyan-500 text-cyan-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Traffic & Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('gigs')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'gigs'
                ? 'border-blue-500 text-blue-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Gig Inventory ({jobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory ({dbMetrics.totalUsers})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ================= SECTION 1: REVENUE ENGINE ================= */}
        {activeTab === 'revenue' && (
          <div className="space-y-8">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-amber-500/30 shadow-lg shadow-amber-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Total Slashed Stakes</span>
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{totalSlashedGen.toFixed(3)} <span className="text-sm font-normal text-zinc-400">GEN</span></p>
                <p className="text-xs text-zinc-400 mt-2">100% captured from rejected deliverables directly to your treasury.</p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-cyan-500/30 shadow-lg shadow-cyan-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Platform Fees (2.5%)</span>
                  <Coins className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{totalFeesGen.toFixed(3)} <span className="text-sm font-normal text-zinc-400">GEN</span></p>
                <p className="text-xs text-zinc-400 mt-2">250 bps take-rate automatically routed on successful deliverable completions.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-tr from-emerald-950/40 to-cyan-950/40 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Gross Protocol Profit</span>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-3xl font-extrabold text-emerald-300">{totalGrossRevenueGen.toFixed(3)} <span className="text-sm font-normal text-zinc-400">GEN</span></p>
                <p className="text-xs text-zinc-400 mt-2">Total revenue delivered directly to your wallet address.</p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Completed Deliverables</span>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{protocolStats.total_jobs_completed || 0}</p>
                <p className="text-xs text-zinc-400 mt-2">Gigs successfully approved by GenVM AI consensus.</p>
              </div>
            </div>

            {/* Treasury Control Card */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Treasury Management</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                All 2.5% protocol take-rate fees and 100% slashed freelancer collateral are streamed directly to this address.
              </p>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Current On-Chain Treasury</span>
                  <span className="text-sm font-mono text-cyan-400">{protocolStats.treasury || AUTHORIZED_ADMIN}</span>
                </div>
                <a
                  href={`https://explorer.genlayer.network/address/${protocolStats.treasury || AUTHORIZED_ADMIN}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 hover:text-white transition"
                >
                  <span>View in Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleUpdateTreasury} className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Update Treasury Recipient Address
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newTreasuryInput}
                    onChange={(e) => setNewTreasuryInput(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingTreasury || !newTreasuryInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition disabled:opacity-50"
                  >
                    {isUpdatingTreasury ? 'Updating...' : 'Set New Treasury'}
                  </button>
                </div>
                {treasuryUpdateMsg && (
                  <p className="text-xs font-mono text-zinc-300 mt-2">{treasuryUpdateMsg}</p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: AUDIENCE & TELEMETRY ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Pageviews</span>
                  <Eye className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{dbMetrics.totalPageviews}</p>
                <p className="text-xs text-zinc-500 mt-2">Logged in SQLite database</p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Unique Visitors</span>
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{dbMetrics.uniqueVisitors}</p>
                <p className="text-xs text-zinc-500 mt-2">Unique salted IP hashes</p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Registered Profiles</span>
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{dbMetrics.totalUsers}</p>
                <p className="text-xs text-zinc-500 mt-2">Completed user dossiers</p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Flagged Accounts</span>
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-3xl font-extrabold text-amber-400">{dbMetrics.flaggedUsers}</p>
                <p className="text-xs text-zinc-500 mt-2">Accounts marked for review</p>
              </div>
            </div>

            {/* Real-time Visitor Stream Table */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-base font-bold text-white mb-4">Recent Visitor Activity Stream</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Visitor Hash</th>
                      <th className="p-3">Page Visited</th>
                      <th className="p-3">User Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {visitorLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/40">
                        <td className="p-3 text-zinc-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-cyan-400">{log.visitorHash}</td>
                        <td className="p-3 font-semibold text-zinc-200">{log.page}</td>
                        <td className="p-3 text-zinc-500 truncate max-w-xs">{log.userAgent}</td>
                      </tr>
                    ))}
                    {visitorLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-zinc-500">
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
            
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {['ALL', 'OPEN', 'IN_REVIEW', 'AWAITING_CLIENT_ACTION', 'COMPLETED', 'CANCELLED_REFUNDED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setGigStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    gigStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Gigs List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        #{job.id}
                      </span>
                      <h4 className="text-base font-bold text-white">{job.title}</h4>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : job.status === 'OPEN'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : job.status === 'AWAITING_CLIENT_ACTION'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300">{job.description || 'No description provided'}</p>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Client Acceptance Rubric</span>
                    <p className="text-zinc-400">{job.rubric}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800 gap-2">
                    <div>
                      <span>Escrow Pool: </span>
                      <span className="font-bold text-cyan-400">
                        {(Number(job.escrow_balance || '0') / 10**18).toFixed(2)} GEN
                      </span>
                    </div>
                    <div>
                      <span>Client: </span>
                      <span className="font-mono text-zinc-300">{job.client}</span>
                    </div>
                    <div>
                      <span>Pending Reviews: </span>
                      <span className="font-bold text-zinc-200">{job.pending_submissions || 0}</span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="p-12 text-center text-zinc-500 bg-zinc-900 rounded-2xl border border-zinc-800">
                  No gigs match the selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= SECTION 4: USER DIRECTORY ================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-zinc-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user profiles by wallet address, display name, or headline..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Users Table */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Headline / Roles</th>
                      <th className="p-3">Skills</th>
                      <th className="p-3">Socials & Contact</th>
                      <th className="p-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.address} className="hover:bg-zinc-800/40">
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <img
                              src={u.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.address}`}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                            />
                            <div>
                              <p className="font-bold text-zinc-200">{u.displayName || 'Anonymous Hunter'}</p>
                              <p className="text-[10px] font-mono text-zinc-500">{u.address.slice(0, 6)}...{u.address.slice(-4)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-zinc-300 font-medium">{u.headline || 'Web3 Builder'}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(u.roles || []).map((r: string) => (
                              <span key={r} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(u.skills || []).slice(0, 4).map((s: string) => (
                              <span key={s} className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                            {(u.skills || []).length > 4 && (
                              <span className="text-[9px] text-zinc-500">+{u.skills.length - 4}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2 text-zinc-400">
                            {u.email && (
                              <a href={`mailto:${u.email}`} title={u.email} className="hover:text-cyan-400">
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {u.linkedin && (
                              <a href={u.linkedin} target="_blank" rel="noreferrer" title="LinkedIn" className="hover:text-cyan-400">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {u.twitter && (
                              <a href={u.twitter} target="_blank" rel="noreferrer" title="X (Twitter)" className="hover:text-cyan-400">
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-zinc-500 font-mono">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-zinc-500">
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
