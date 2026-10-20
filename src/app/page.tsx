"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import { 
  Briefcase, 
  PlusCircle, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  RotateCcw, 
  ArrowDownToLine, 
  ExternalLink, 
  Sparkles, 
  Coins, 
  User, 
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { custom, parseEther, formatEther } from 'viem';

export interface Job {
  id: string;
  title: string;
  description: string;
  rubric: string;
  client: string;
  status: 'OPEN' | 'IN_REVIEW' | 'AWAITING_CLIENT_ACTION' | 'COMPLETED' | 'CANCELLED_REFUNDED';
  min_stake_wei: string;
  escrow_balance: string;
  pending_submissions: number;
}

export interface Submission {
  id: string;
  job_id: string;
  worker: string;
  stake_wei: string;
  deliverable_url: string;
  notes: string;
  status: 'Pending' | 'APPROVED' | 'REJECTED' | 'Error';
  evaluation_trace: string;
  payout_status: string;
}

export interface WorkerRecord {
  address: string;
  total_earned_wei: number;
  jobs_completed: number;
  slashed_count: number;
}

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'gigs' | 'my-gigs' | 'leaderboard'>('gigs');

  // Gigs & Submissions state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<WorkerRecord[]>([]);
  const [protocolStats, setProtocolStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showRelistModal, setShowRelistModal] = useState(false);

  // Post Job form
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobRubric, setJobRubric] = useState('');
  const [jobEscrowGen, setJobEscrowGen] = useState('1.0');
  const [jobMinStakeGen, setJobMinStakeGen] = useState('0.1');

  // Submit Deliverable form
  const [selectedJobForSubmit, setSelectedJobForSubmit] = useState<Job | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [stakeAmountGen, setStakeAmountGen] = useState('0.1');

  // Relist form
  const [selectedJobForRelist, setSelectedJobForRelist] = useState<Job | null>(null);
  const [updatedRubric, setUpdatedRubric] = useState('');

  // Evaluating submission ID tracker
  const [evaluatingSubId, setEvaluatingSubId] = useState<string | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x75B4aBC58426FB6D817Ed02b3b243a9A8Bb2c0E0";

  // Wallet Connection
  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setAccount(accounts[0]);
        }
      } else {
        alert('MetaMask or a Web3 compatible wallet is required.');
      }
    } catch (err) {
      console.error('Connection error:', err);
    }
  };

  // Check initial connection
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

  // Fetch User DB Profile
  const loadUserProfile = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`/api/users/${addr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.user) {
          setUserProfile(data.user);
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  }, []);

  useEffect(() => {
    if (account) {
      loadUserProfile(account);
    } else {
      setUserProfile(null);
    }
  }, [account, loadUserProfile]);

  // Read Contract Data
  const loadMarketplaceData = useCallback(async () => {
    setLoading(true);
    try {
      const readClient = createClient({
        chain: studionet,
      });

      // 1. Fetch All Jobs
      try {
        const jobsStr = await (readClient as any).readContract({
          address: contractAddress,
          functionName: 'get_all_jobs',
          args: [],
        });
        if (jobsStr) {
          setJobs(JSON.parse(jobsStr));
        }
      } catch (e) {
        console.warn('get_all_jobs fallback:', e);
      }

      // 2. Fetch All Submissions
      try {
        const subsStr = await (readClient as any).readContract({
          address: contractAddress,
          functionName: 'get_all_submissions',
          args: [],
        });
        if (subsStr) {
          setSubmissions(JSON.parse(subsStr));
        }
      } catch (e) {
        console.warn('get_all_submissions fallback:', e);
      }

      // 3. Fetch Leaderboard
      try {
        const lbStr = await (readClient as any).readContract({
          address: contractAddress,
          functionName: 'get_worker_leaderboard',
          args: [],
        });
        if (lbStr) {
          setLeaderboard(JSON.parse(lbStr));
        }
      } catch (e) {
        console.warn('get_worker_leaderboard fallback:', e);
      }

      // 4. Protocol Stats
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
        console.warn('get_protocol_stats fallback:', e);
      }

    } catch (err) {
      console.error('Error fetching marketplace data:', err);
    } finally {
      setLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  const getWriteClient = () => {
    return (createClient as any)({
      chain: studionet,
      provider: typeof window !== 'undefined' ? (window as any).ethereum : undefined,
    });
  };

  // Client: Post a Job
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return alert('Connect wallet first');
    if (!jobTitle.trim() || !jobRubric.trim()) return alert('Title and rubric are required');

    try {
      setActionLoading(true);
      const writeClient = getWriteClient();

      const escrowWei = parseEther(jobEscrowGen);
      const minStakeWei = parseEther(jobMinStakeGen);

      const tx = await (writeClient as any).writeContract({
        address: contractAddress,
        functionName: 'post_job',
        args: [jobTitle.trim(), jobDescription.trim(), jobRubric.trim(), minStakeWei],
        value: escrowWei,
        account: account as any,
      });

      alert(`Job posted successfully! TX: ${tx}`);
      setShowPostJobModal(false);
      setJobTitle('');
      setJobDescription('');
      setJobRubric('');
      await loadMarketplaceData();
    } catch (err: any) {
      console.error('Post job error:', err);
      alert(`Error posting job: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Freelancer: Submit Deliverable & Stake Collateral
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return alert('Connect wallet first');
    if (!selectedJobForSubmit) return;
    if (!deliverableUrl.trim()) return alert('Deliverable URL is required');

    try {
      setActionLoading(true);
      const writeClient = getWriteClient();

      const stakeWei = parseEther(stakeAmountGen);

      const tx = await (writeClient as any).writeContract({
        address: contractAddress,
        functionName: 'submit_deliverable',
        args: [BigInt(selectedJobForSubmit.id), deliverableUrl.trim(), deliverableNotes.trim()],
        value: stakeWei,
        account: account as any,
      });

      alert(`Deliverable submitted and collateral staked! TX: ${tx}`);
      setShowSubmitModal(false);
      setDeliverableUrl('');
      setDeliverableNotes('');
      await loadMarketplaceData();
    } catch (err: any) {
      console.error('Submit deliverable error:', err);
      alert(`Error submitting deliverable: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Evaluate Submission (GenVM AI Consensus)
  const handleEvaluate = async (submissionId: string) => {
    if (!account) return alert('Connect wallet first');

    try {
      setEvaluatingSubId(submissionId);
      setEvaluationFeedback("GenVM AI validators are fetching your deliverable and evaluating acceptance rubric criteria...");

      const writeClient = getWriteClient();

      const tx = await (writeClient as any).writeContract({
        address: contractAddress,
        functionName: 'evaluate_submission',
        args: [BigInt(submissionId)],
        account: account as any,
      });

      setEvaluationFeedback(`Evaluation complete on GenVM! Transaction: ${tx}`);
      await loadMarketplaceData();
    } catch (err: any) {
      console.error('Evaluation error:', err);
      setEvaluationFeedback(`Evaluation error: ${err.message || err}`);
    } finally {
      setEvaluatingSubId(null);
    }
  };

  // Option B: Client Relist Gig
  const handleRelistJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !selectedJobForRelist) return;

    try {
      setActionLoading(true);
      const writeClient = getWriteClient();

      const tx = await (writeClient as any).writeContract({
        address: contractAddress,
        functionName: 'relist_job',
        args: [BigInt(selectedJobForRelist.id), updatedRubric.trim()],
        account: account as any,
      });

      alert(`Gig re-listed successfully! New freelancers can now attempt it. TX: ${tx}`);
      setShowRelistModal(false);
      await loadMarketplaceData();
    } catch (err: any) {
      console.error('Relist error:', err);
      alert(`Error re-listing gig: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Option B: Client Escrow Refund Withdrawal
  const handleWithdrawEscrow = async (jobId: string) => {
    if (!account) return alert('Connect wallet first');
    if (!confirm('Are you sure you want to withdraw remaining escrow? This permanently closes the gig.')) return;

    try {
      setActionLoading(true);
      const writeClient = getWriteClient();

      const tx = await (writeClient as any).writeContract({
        address: contractAddress,
        functionName: 'withdraw_escrow',
        args: [BigInt(jobId)],
        account: account as any,
      });

      alert(`Full remaining escrow refunded to your wallet! TX: ${tx}`);
      await loadMarketplaceData();
    } catch (err: any) {
      console.error('Withdraw escrow error:', err);
      alert(`Error withdrawing escrow: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter jobs by search
  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.rubric.toLowerCase().includes(q)
    );
  });

  // User-specific jobs and submissions
  const myClientJobs = jobs.filter(
    (j) => account && j.client.toLowerCase() === account.toLowerCase()
  );
  const myWorkerSubmissions = submissions.filter(
    (s) => account && s.worker.toLowerCase() === account.toLowerCase()
  );

  // Current worker's profile stats
  const currentWorkerStats = leaderboard.find(
    (w) => account && w.address.toLowerCase() === account.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar
        account={account}
        onConnectWallet={connectWallet}
        onOpenProfile={() => setShowProfileModal(true)}
        userProfile={userProfile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="mb-10 text-center md:text-left relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/80 p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 -mb-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Decentralized Escrow Guaranteed by GenVM AI</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              Work with confidence. <br className="hidden md:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                Guaranteed by Consensus.
              </span>
            </h1>
            
            <p className="text-sm md:text-base text-zinc-400 mb-8 leading-relaxed max-w-2xl">
              Clients lock milestone escrows with objective acceptance rubrics. Freelancers stake collateral to guarantee high-quality execution. GenLayer AI validators evaluate the deliverable objectively—with zero human moderator bias.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (!account) connectWallet();
                  else setShowPostJobModal(true);
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm transition shadow-lg shadow-cyan-500/25 flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post a Gig (Client Escrow)</span>
              </button>

              <button
                onClick={() => setActiveTab('gigs')}
                className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-semibold transition"
              >
                Browse Available Gigs
              </button>
            </div>
          </div>

          {/* Protocol Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 pt-8 border-t border-zinc-800/80">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Live Escrow Gigs</span>
              <p className="text-xl font-extrabold text-white">{jobs.length}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Completed Jobs</span>
              <p className="text-xl font-extrabold text-emerald-400">{protocolStats.total_jobs_completed || 0}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Protocol Take-Rate</span>
              <p className="text-xl font-extrabold text-cyan-400">2.5%</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">AI Dispute Resolution</span>
              <p className="text-xl font-extrabold text-purple-400">GenVM</p>
            </div>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {evaluationFeedback && (
          <div className="mb-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{evaluationFeedback}</span>
            </div>
            <button
              onClick={() => setEvaluationFeedback(null)}
              className="text-zinc-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {/* ================= TAB 1: EXPLORE GIGS ================= */}
        {activeTab === 'gigs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Marketplace Gigs</h2>
                <p className="text-xs text-zinc-400">Stake collateral and deliver quality work to claim the escrow.</p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by keyword, rubric..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Gigs Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredJobs.map((job) => {
                const escrowGen = Number(job.escrow_balance || '0') / 10**18;
                const minStakeGen = Number(job.min_stake_wei || '0') / 10**18;
                const isOpen = job.status === 'OPEN';

                return (
                  <div
                    key={job.id}
                    className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between space-y-4 shadow-lg group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">
                          {job.title}
                        </h3>
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                            job.status === 'OPEN'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : job.status === 'IN_REVIEW'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : job.status === 'AWAITING_CLIENT_ACTION'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 mb-4">
                        {job.description || 'No description provided.'}
                      </p>

                      {/* Rubric Snippet */}
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 mb-4">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                          Objective AI Rubric
                        </span>
                        <p className="text-xs text-zinc-300 font-mono line-clamp-3">
                          {job.rubric}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs py-2 border-t border-zinc-800 text-zinc-400 mb-4">
                        <div>
                          <span className="block text-[10px] uppercase text-zinc-500 font-semibold">Bounty Pool</span>
                          <span className="text-base font-extrabold text-cyan-400">{escrowGen.toFixed(2)} GEN</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] uppercase text-zinc-500 font-semibold">Required Stake</span>
                          <span className="text-xs font-bold text-amber-400">{minStakeGen.toFixed(2)} GEN</span>
                        </div>
                      </div>

                      {isOpen ? (
                        <button
                          onClick={() => {
                            if (!account) connectWallet();
                            else {
                              setSelectedJobForSubmit(job);
                              setStakeAmountGen(minStakeGen.toString());
                              setShowSubmitModal(true);
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs transition shadow-md shadow-cyan-500/20"
                        >
                          Stake & Submit Deliverable
                        </button>
                      ) : (
                        <div className="text-center text-xs text-zinc-500 py-2 bg-zinc-950 rounded-xl border border-zinc-800/50">
                          {job.status === 'COMPLETED' ? 'Completed & Paid' : 'Currently in review'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredJobs.length === 0 && (
                <div className="md:col-span-2 p-16 text-center text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <Briefcase className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                  <p className="text-sm font-semibold text-zinc-300">No active gigs found</p>
                  <p className="text-xs text-zinc-500 mt-1">Be the first to post a gig and fund an escrow!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MY ESCROWS & SUBMISSIONS ================= */}
        {activeTab === 'my-gigs' && (
          <div className="space-y-10">
            
            {/* Section A: My Client Escrows */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">My Funded Client Escrows</h3>
                  <p className="text-xs text-zinc-400">Gigs you have created and funded with escrow.</p>
                </div>
                <button
                  onClick={() => setShowPostJobModal(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
                >
                  + New Gig
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {myClientJobs.map((job) => {
                  const escrowGen = Number(job.escrow_balance || '0') / 10**18;
                  const isAwaitingAction = job.status === 'AWAITING_CLIENT_ACTION';

                  return (
                    <div key={job.id} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-zinc-500">#{job.id}</span>
                          <h4 className="text-base font-bold text-white">{job.title}</h4>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase bg-zinc-800 text-zinc-300">
                          {job.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-4">
                        <div>
                          <span>Current Escrow Balance: </span>
                          <span className="font-bold text-cyan-400">{escrowGen.toFixed(2)} GEN</span>
                        </div>
                        <div>
                          <span>Pending Reviews: </span>
                          <span className="font-bold text-white">{job.pending_submissions || 0}</span>
                        </div>
                      </div>

                      {/* OPTION B ACTION CARDS */}
                      {isAwaitingAction && (
                        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-3">
                          <div className="flex items-center space-x-2 text-amber-300 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span>Freelancer was rejected. Your 100% escrow is preserved in the contract!</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Choose to re-list the gig for another freelancer to attempt with zero extra deposit, or withdraw 100% of your escrow back to your wallet.
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              onClick={() => {
                                setSelectedJobForRelist(job);
                                setUpdatedRubric(job.rubric);
                                setShowRelistModal(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center space-x-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Re-list Gig (No extra deposit)</span>
                            </button>

                            <button
                              onClick={() => handleWithdrawEscrow(job.id)}
                              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 font-bold text-xs transition flex items-center space-x-1.5"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                              <span>Withdraw 100% Escrow</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {myClientJobs.length === 0 && (
                  <div className="p-8 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800 text-xs">
                    You haven't posted any gigs yet.
                  </div>
                )}
              </div>
            </div>

            {/* Section B: My Freelancer Submissions */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">My Deliverable Submissions</h3>
                <p className="text-xs text-zinc-400">Track your staked deliverables and GenVM AI evaluation verdicts.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {myWorkerSubmissions.map((sub) => {
                  const stakeGen = Number(sub.stake_wei || '0') / 10**18;
                  const isPending = sub.status === 'Pending';
                  const isEvaluating = evaluatingSubId === sub.id;

                  return (
                    <div key={sub.id} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-zinc-500">Submission #{sub.id} (Job #{sub.job_id})</span>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                            sub.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : sub.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="text-zinc-500">Deliverable URL: </span>
                        <a
                          href={sub.deliverable_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center space-x-1"
                        >
                          <span>{sub.deliverable_url}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="text-xs text-zinc-400">
                        <span>Collateral Staked: </span>
                        <span className="font-bold text-amber-400">{stakeGen.toFixed(2)} GEN</span>
                      </div>

                      {/* Trace */}
                      {sub.evaluation_trace && (
                        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 whitespace-pre-line">
                          {sub.evaluation_trace}
                        </div>
                      )}

                      {/* Trigger Evaluation Button if Pending */}
                      {isPending && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleEvaluate(sub.id)}
                            disabled={isEvaluating}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center space-x-2"
                          >
                            {isEvaluating ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>GenVM Evaluating...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Trigger GenVM AI Evaluation</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {myWorkerSubmissions.length === 0 && (
                  <div className="p-8 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800 text-xs">
                    You haven't submitted any deliverables yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: LEADERBOARD ================= */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Freelancer Hall of Fame</h2>
              <p className="text-xs text-zinc-400">Ranked by on-chain earnings, successful deliverables, and slashing record.</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Freelancer Address</th>
                      <th className="p-3">Total Earned</th>
                      <th className="p-3">Jobs Completed</th>
                      <th className="p-3">Slashed Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {leaderboard.map((w, index) => {
                      const earnedGen = (w.total_earned_wei || 0) / 10**18;
                      return (
                        <tr key={w.address} className="hover:bg-zinc-800/40">
                          <td className="p-3 font-bold text-zinc-400">#{index + 1}</td>
                          <td className="p-3 font-mono text-cyan-400 font-semibold">{w.address}</td>
                          <td className="p-3 font-bold text-emerald-400">{earnedGen.toFixed(2)} GEN</td>
                          <td className="p-3 font-semibold text-zinc-200">{w.jobs_completed}</td>
                          <td className="p-3 font-semibold text-zinc-400">{w.slashed_count}</td>
                        </tr>
                      );
                    })}

                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-zinc-500">
                          No freelancer records on-chain yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- MODAL 1: POST A GIG --- */}
      {showPostJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 text-zinc-100 my-8">
            <h3 className="text-xl font-bold text-white mb-2">Post a New Gig</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Deposit funds into escrow with an objective rubric. GenVM AI validators evaluate deliverables directly against this criteria.
            </p>

            <form onSubmit={handlePostJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Gig Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Build Responsive Web3 Landing Page"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={2}
                  placeholder="Overview of the task, deliverables, and repo links..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-cyan-400 mb-1">
                  Objective AI Acceptance Rubric (Required)
                </label>
                <textarea
                  value={jobRubric}
                  onChange={(e) => setJobRubric(e.target.value)}
                  rows={3}
                  required
                  placeholder="1. Must be mobile responsive. 2. Web3 wallet connect works without errors. 3. Code must include unit tests."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Escrow Deposit (GEN)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={jobEscrowGen}
                    onChange={(e) => setJobEscrowGen(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Min Freelancer Stake (GEN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={jobMinStakeGen}
                    onChange={(e) => setJobMinStakeGen(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPostJobModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Depositing...' : 'Deposit Escrow & Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SUBMIT DELIVERABLE --- */}
      {showSubmitModal && selectedJobForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 text-zinc-100 my-8">
            <h3 className="text-xl font-bold text-white mb-2">Stake & Submit Deliverable</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Submitting for: <span className="font-bold text-white">{selectedJobForSubmit.title}</span>
            </p>

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Deliverable URL (GitHub PR, Live Link, Doc)
                </label>
                <input
                  type="url"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://github.com/your-org/pull/1"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Submission Notes
                </label>
                <textarea
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  rows={3}
                  placeholder="Summarize what was completed and where reviewers can verify..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-amber-400 mb-1">
                  Collateral Stake (GEN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={formatEther(BigInt(selectedJobForSubmit.min_stake_wei))}
                  value={stakeAmountGen}
                  onChange={(e) => setStakeAmountGen(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Stake is returned in full upon approval. If rejected for underdelivering, stake is slashed to the protocol.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Staking...' : 'Stake Collateral & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: RELIST GIG --- */}
      {showRelistModal && selectedJobForRelist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 text-zinc-100 my-8">
            <h3 className="text-xl font-bold text-white mb-2">Re-list Gig (Zero Deposit)</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Your deposited escrow is intact in the smart contract. You can clarify the acceptance rubric before re-opening to new freelancers.
            </p>

            <form onSubmit={handleRelistJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Updated Acceptance Rubric
                </label>
                <textarea
                  value={updatedRubric}
                  onChange={(e) => setUpdatedRubric(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRelistModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Re-listing...' : 'Confirm Re-list'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PROFILE MODAL --- */}
      {account && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          account={account}
          onProfileUpdated={(updated) => setUserProfile(updated)}
          workerStats={currentWorkerStats}
        />
      )}
    </div>
  );
}
