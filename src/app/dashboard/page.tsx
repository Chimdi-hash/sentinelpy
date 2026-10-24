"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Briefcase, 
  PlusCircle, 
  Send, 
  CheckCircle2, 
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
  CheckCircle,
  Clock,
  FileText,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  TrendingUp,
  Settings,
  LogOut,
  Upload,
  Camera,
  Layers,
  Layout,
  Cpu,
  Server,
  Palette,
  CheckSquare,
  Image as ImageIcon
} from 'lucide-react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { custom, parseEther, formatEther } from 'viem';

interface Job {
  id: string;
  title: string;
  description: string;
  rubric: string;
  client: string;
  status: 'OPEN' | 'IN_REVIEW' | 'AWAITING_CLIENT_ACTION' | 'COMPLETED' | 'CANCELLED_REFUNDED';
  min_stake_wei: string;
  escrow_balance: string;
  pending_submissions: number;
  category?: string;
  imageUrl?: string;
}

interface JobCategory {
  id: string;
  name: string;
  shortName: string;
  desc: string;
}

const PRIMARY_CAT_IDS = ['ALL', 'SMART_CONTRACTS', 'FRONTEND_WEB3', 'AI_AGENTS', 'BACKEND_INFRA'];

const JOB_CATEGORIES: JobCategory[] = [
  { id: 'ALL', name: 'All Jobs', shortName: 'All Gigs', desc: 'Browse all active engineering & tech gigs' },
  { id: 'SMART_CONTRACTS', name: 'Smart Contracts & Security', shortName: 'Smart Contracts', desc: 'Solidity, GenVM, Rust, EVM Protocols' },
  { id: 'FRONTEND_WEB3', name: 'Frontend & Web3 UI', shortName: 'Frontend / Web3', desc: 'React, Next.js, Tailwind, viem, Web3 dApps' },
  { id: 'AI_AGENTS', name: 'AI & Autonomous Agents', shortName: 'AI & Agents', desc: 'LLM consensus, Agentic workflows, PyTorch, LangChain' },
  { id: 'BACKEND_INFRA', name: 'Backend & Protocol Infra', shortName: 'Backend & Infra', desc: 'Go, Node.js, Rust, microservices & APIs' },
  { id: 'MOBILE_DEV', name: 'Mobile App Development', shortName: 'Mobile Dev', desc: 'React Native, Flutter, iOS Swift, Android Kotlin' },
  { id: 'DEVOPS_CLOUD', name: 'DevOps, Cloud & SRE', shortName: 'DevOps & Cloud', desc: 'AWS, GCP, Docker, Kubernetes, CI/CD, Terraform' },
  { id: 'DATA_SCIENCE', name: 'Data Science & Analytics', shortName: 'Data & Analytics', desc: 'Python, SQL, ETL pipelines, Pandas, Big Data' },
  { id: 'SECURITY_PENTEST', name: 'Cybersecurity & Pen Testing', shortName: 'Cybersecurity', desc: 'AppSec, Penetration testing, Bug bounties, Audits' },
  { id: 'QA_AUTOMATION', name: 'QA & Test Automation', shortName: 'QA & Testing', desc: 'Playwright, Cypress, automated end-to-end testing' },
  { id: 'GAME_3D_WEBGL', name: 'Game Dev, 3D & WebGL', shortName: 'Game & 3D WebGL', desc: 'Three.js, Unity, Unreal Engine, WebGL, Metaverse' },
  { id: 'DESIGN_CREATIVE', name: 'UI/UX & Product Design', shortName: 'UI/UX Design', desc: 'Figma, Design systems, Glassmorphism, Wireframing' },
  { id: 'DEFI_TOKENOMICS', name: 'DeFi & Tokenomics Modeling', shortName: 'DeFi & Tokenomics', desc: 'Economic design, staking mechanisms, bonding curves' },
  { id: 'TECH_WRITING', name: 'Technical Writing & Docs', shortName: 'Tech Writing', desc: 'Developer docs, API specs, Whitepapers, GitBook' },
  { id: 'PRODUCT_MANAGEMENT', name: 'Product & Tech Management', shortName: 'Product & Scrum', desc: 'Sprint planning, Technical roadmaps, Agile/Scrum' },
  { id: 'GENERAL_TECH', name: 'Other / General Tech Gigs', shortName: 'Other Tech', desc: 'Custom scripting, migrations & specialized tasks' },
];

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  SMART_CONTRACTS: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
  FRONTEND_WEB3: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
  AI_AGENTS: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  BACKEND_INFRA: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
  MOBILE_DEV: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
  DEVOPS_CLOUD: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  DATA_SCIENCE: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
  SECURITY_PENTEST: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
  QA_AUTOMATION: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=600&q=80',
  GAME_3D_WEBGL: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
  DESIGN_CREATIVE: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80',
  DEFI_TOKENOMICS: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
  TECH_WRITING: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
  PRODUCT_MANAGEMENT: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
  GENERAL_TECH: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
  QA_AUDIT: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
  ALL: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=600&q=80',
  General: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=600&q=80',
};

interface Submission {
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

interface WorkerRecord {
  address: string;
  total_earned_wei: number;
  jobs_completed: number;
  slashed_count: number;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [account, setAccount] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'gigs' | 'my-gigs' | 'leaderboard'>('gigs');

  // Welcome Animation State
  const [showWelcome, setShowWelcome] = useState(false);

  // Gigs & Submissions state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<WorkerRecord[]>([]);
  const [protocolStats, setProtocolStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Category & Sectioning state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [jobsViewMode, setJobsViewMode] = useState<'filtered' | 'sectioned'>('filtered');
  const [showSpecificityDropdown, setShowSpecificityDropdown] = useState(false);
  const specificityDropdownRef = useRef<HTMLDivElement | null>(null);

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
  const [jobCategory, setJobCategory] = useState('SMART_CONTRACTS');
  const [jobImageUrl, setJobImageUrl] = useState('');
  const [showPostJobCategoryDropdown, setShowPostJobCategoryDropdown] = useState(false);
  const postJobCategoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const jobImageInputRef = useRef<HTMLInputElement | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        specificityDropdownRef.current &&
        !specificityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSpecificityDropdown(false);
      }
      if (
        postJobCategoryDropdownRef.current &&
        !postJobCategoryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPostJobCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Upload job picture from device memory with auto-compression
  const handleJobImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;

      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setJobImageUrl(compressed);
        } else {
          setJobImageUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

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

  // Check initial connection and welcome param
  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setShowWelcome(true);
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Connect or detect wallet
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts[0]) {
          setAccount(accounts[0]);
        } else {
          // If no wallet connected, redirect to /connect
          router.push('/connect');
        }
      });

      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts && accounts[0]) {
          setAccount(accounts[0]);
        } else {
          router.push('/connect');
        }
      });
    } else {
      router.push('/connect');
    }
  }, [router]);

  // Disconnect Wallet
  const handleDisconnect = () => {
    setAccount(null);
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    router.push('/connect');
  };

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
    }
  }, [account, loadUserProfile]);

  // Load Marketplace Blockchain Data
  const loadMarketplaceData = useCallback(async () => {
    setLoading(true);
    try {
      const readClient = createClient({
        chain: studionet,
      });

      // 1. Fetch Jobs & Enrich with Category & Picture
      try {
        const [jobsStr, metaRes] = await Promise.all([
          (readClient as any).readContract({
            address: contractAddress,
            functionName: 'get_all_jobs',
            args: [],
          }).catch((e: any) => {
            console.warn('get_all_jobs fallback:', e);
            return null;
          }),
          fetch('/api/jobs').then((r) => r.json()).catch(() => ({ jobs: {} })),
        ]);

        const metaMap = metaRes?.jobs || {};

        if (jobsStr) {
          const parsedJobs: Job[] = JSON.parse(jobsStr);
          const enriched = parsedJobs.map((j) => {
            const meta = metaMap[j.id];
            let category = meta?.category;
            let imageUrl = meta?.imageUrl;

            // Fallback parsing from description if tagged
            if (!category && j.description.includes('[Category:')) {
              const match = j.description.match(/\[Category:\s*([^\]]+)\]/i);
              if (match) category = match[1].trim();
            }

            // Keyword inference if no category
            if (!category) {
              const t = (j.title + ' ' + j.description).toLowerCase();
              if (t.includes('solidity') || t.includes('contract') || t.includes('security') || t.includes('audit')) {
                category = 'SMART_CONTRACTS';
              } else if (t.includes('frontend') || t.includes('react') || t.includes('ui') || t.includes('tailwind')) {
                category = 'FRONTEND_WEB3';
              } else if (t.includes('ai') || t.includes('agent') || t.includes('llm') || t.includes('genvm')) {
                category = 'AI_AGENTS';
              } else if (t.includes('backend') || t.includes('node') || t.includes('api') || t.includes('infra')) {
                category = 'BACKEND_INFRA';
              } else if (t.includes('design') || t.includes('figma')) {
                category = 'DESIGN_CREATIVE';
              } else {
                category = 'SMART_CONTRACTS';
              }
            }

            if (!imageUrl) {
              imageUrl = DEFAULT_CATEGORY_IMAGES[category] || DEFAULT_CATEGORY_IMAGES['ALL'];
            }

            return {
              ...j,
              category,
              imageUrl,
            };
          });
          setJobs(enriched);
        }
      } catch (e) {
        console.warn('get_all_jobs fallback:', e);
      }

      // 2. Fetch Submissions
      try {
        const subsStr = await (readClient as any).readContract({
          address: contractAddress,
          functionName: 'get_all_submissions',
          args: [],
        });
        if (subsStr) setSubmissions(JSON.parse(subsStr));
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
        if (lbStr) setLeaderboard(JSON.parse(lbStr));
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
        if (statsStr) setProtocolStats(JSON.parse(statsStr));
      } catch (e) {
        console.warn('get_protocol_stats fallback:', e);
      }

    } catch (err) {
      console.error('Error loading marketplace data:', err);
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

      // Save metadata (Category & Picture) to API
      const nextId = jobs.length.toString();
      try {
        await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: nextId,
            category: jobCategory,
            imageUrl: jobImageUrl || DEFAULT_CATEGORY_IMAGES[jobCategory] || null,
            client: account,
          }),
        });
      } catch (metaErr) {
        console.warn('Metadata save fallback:', metaErr);
      }

      alert(`Job posted successfully with escrow locked! TX: ${tx}`);
      setShowPostJobModal(false);
      setJobTitle('');
      setJobDescription('');
      setJobRubric('');
      setJobImageUrl('');
      setJobCategory('SMART_CONTRACTS');
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

      alert(`Gig re-listed successfully! New freelancers can now attempt it with zero extra deposit. TX: ${tx}`);
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

  // Secure Server-side Admin Verification
  useEffect(() => {
    if (!account) {
      setIsAdmin(false);
      return;
    }
    fetch(`/api/admin/check?address=${account}`)
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, [account]);

  const filteredJobs = jobs.filter((j) => {
    // 1. Category Filter
    if (selectedCategory !== 'ALL' && j.category !== selectedCategory) {
      return false;
    }
    // 2. Search Query Filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.rubric.toLowerCase().includes(q) ||
      (j.category && j.category.toLowerCase().includes(q))
    );
  });

  // Category Counts
  const categoryCounts: Record<string, number> = {
    ALL: jobs.length,
  };
  JOB_CATEGORIES.forEach((cat) => {
    if (cat.id !== 'ALL') {
      categoryCounts[cat.id] = jobs.filter((j) => j.category === cat.id).length;
    }
  });

  const myClientJobs = jobs.filter(
    (j) => account && j.client.toLowerCase() === account.toLowerCase()
  );
  const myWorkerSubmissions = submissions.filter(
    (s) => account && s.worker.toLowerCase() === account.toLowerCase()
  );

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-slate-200 selection:text-slate-900">
      
      {/* ================= WELCOME ANIMATION MODAL/BANNER ================= */}
      {showWelcome && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-welcome w-full max-w-lg px-4">
          <div className="glass-panel p-5 rounded-2xl shadow-2xl border border-white flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Welcome to TrustlessWork, {userProfile?.displayName || 'Builder'}!
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''} authenticated
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= TOP GLASS NAVIGATION ================= */}
      <header className="sticky top-0 z-40 w-full border-b border-white/70 bg-white/75 backdrop-blur-xl shadow-sm shadow-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-2xl glass-slide flex items-center justify-center text-slate-800 shadow-md shadow-slate-300/40 border border-white group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-slate-800" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Trustless<span className="text-slate-500">Work</span>
              </span>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
              <button
                onClick={() => setActiveTab('gigs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'gigs'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Available Gigs ({jobs.length})
              </button>
              <button
                onClick={() => setActiveTab('my-gigs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'my-gigs'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                My Escrows & Submissions
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
          </div>

          {/* Right Section: Stealth Admin + PROFILE BUTTON + Post Gig */}
          <div className="flex items-center space-x-3">
            
            {/* Stealth Admin Portal Pill (Only for authorized admin) */}
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin Portal</span>
              </Link>
            )}

            {/* PROFILE BUTTON: Directly links to /profile */}
            <Link
              href="/profile"
              className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl glass-card glass-card-hover group border border-white"
              title="Edit Your Appearance in the Job Market"
            >
              <img
                src={userProfile?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${account || 'user'}`}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${account || 'user'}`;
                }}
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 group-hover:text-slate-600 transition flex items-center space-x-1">
                  <span>{userProfile?.displayName || 'Edit Profile'}</span>
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
                </p>
              </div>
            </Link>

            {/* Disconnect Wallet Button */}
            <button
              onClick={handleDisconnect}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl glass-card hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-bold transition flex items-center space-x-1.5"
              title="Disconnect Wallet"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disconnect</span>
            </button>

            {/* Post a Gig Button */}
            <button
              onClick={() => setShowPostJobModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-md shadow-slate-300 flex items-center space-x-1.5 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Gig</span>
            </button>

          </div>
        </div>
      </header>

      {/* ================= MAIN DASHBOARD BODY ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Global Feedback Alert */}
        {evaluationFeedback && (
          <div className="p-4 rounded-2xl glass-panel border border-slate-300 text-slate-800 text-xs font-mono flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-slate-700 shrink-0" />
              <span>{evaluationFeedback}</span>
            </div>
            <button
              onClick={() => setEvaluationFeedback(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              &times;
            </button>
          </div>
        )}

        {/* ================= TAB 1: AVAILABLE MARKETPLACE GIGS ================= */}
        {activeTab === 'gigs' && (() => {
          const renderJobCard = (job: Job) => {
            const escrowGen = Number(job.escrow_balance || '0') / 10**18;
            const minStakeGen = Number(job.min_stake_wei || '0') / 10**18;
            const isOpen = job.status === 'OPEN';
            const catName = JOB_CATEGORIES.find((c) => c.id === job.category)?.name || job.category || 'General';
            const effectivePic = job.imageUrl || DEFAULT_CATEGORY_IMAGES[job.category || 'General'] || DEFAULT_CATEGORY_IMAGES['ALL'];

            return (
              <div
                key={job.id}
                className="p-5 sm:p-6 rounded-3xl glass-card glass-card-hover flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: ID, Category, Title, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          #{job.id}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white truncate">
                          {catName}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-slate-700 transition truncate">
                        {job.title}
                      </h3>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        job.status === 'OPEN'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : job.status === 'IN_REVIEW'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : job.status === 'AWAITING_CLIENT_ACTION'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* PICTURE ALONGSIDE DESCRIPTION */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Job Picture */}
                    <div className="w-full sm:w-40 h-32 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/90 relative shrink-0 shadow-sm group-hover:shadow-md transition">
                      <img
                        src={effectivePic}
                        alt={job.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_CATEGORY_IMAGES['ALL'];
                        }}
                      />
                    </div>

                    {/* Description & Client Info alongside Picture */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {job.description || 'No description provided.'}
                      </p>
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono pt-1">
                        <span>Client:</span>
                        <span className="font-semibold text-slate-700">
                          {job.client ? `${job.client.slice(0, 6)}...${job.client.slice(-4)}` : 'Anonymous'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Objective Rubric Snippet */}
                  <div className="p-3.5 rounded-2xl glass-slide">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Objective AI Rubric
                    </span>
                    <p className="text-xs text-slate-800 font-mono line-clamp-2">
                      {job.rubric}
                    </p>
                  </div>
                </div>

                <div>
                  {/* Financial Metrics Strip */}
                  <div className="flex items-center justify-between text-xs py-3 border-t border-slate-200/80 text-slate-600 mb-3">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400 font-bold">Escrow Bounty</span>
                      <span className="text-base font-black text-slate-900">{escrowGen.toFixed(2)} GEN</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-slate-400 font-bold">Required Stake</span>
                      <span className="text-xs font-bold text-slate-700">{minStakeGen.toFixed(2)} GEN</span>
                    </div>
                  </div>

                  {isOpen ? (
                    <button
                      onClick={() => {
                        setSelectedJobForSubmit(job);
                        setStakeAmountGen(minStakeGen.toString());
                        setShowSubmitModal(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md shadow-slate-300 active:scale-95"
                    >
                      Stake Collateral &amp; Submit Deliverable
                    </button>
                  ) : (
                    <div className="text-center text-xs text-slate-500 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                      {job.status === 'COMPLETED' ? 'Completed & Settled' : 'Under GenVM Review'}
                    </div>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-6">
              
              {/* Header Strip & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active &amp; Available Gigs</h2>
                  <p className="text-xs text-slate-500">
                    Browse jobs by category or view the full marketplace. Stake collateral and fulfill rubrics to earn.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                    <button
                      onClick={() => setJobsViewMode('filtered')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                        jobsViewMode === 'filtered' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Category Filter
                    </button>
                    <button
                      onClick={() => { setJobsViewMode('sectioned'); setSelectedCategory('ALL'); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                        jobsViewMode === 'sectioned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sectioned by Type
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter gigs by keyword..."
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Category Navigation: Primary Pills + Minimalist Specificity Dropdown */}
              <div className="flex flex-wrap items-center gap-2 pb-2">
                {/* Primary Fast Pills */}
                {JOB_CATEGORIES.filter((c) => PRIMARY_CAT_IDS.includes(c.id)).map((cat) => {
                  const count = categoryCounts[cat.id] || 0;
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        if (jobsViewMode === 'sectioned') setJobsViewMode('filtered');
                      }}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-300'
                          : 'glass-card text-slate-600 hover:text-slate-900 hover:bg-white'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* Minimalist Specificity Dropdown for All Other Tech Domains */}
                <div className="relative" ref={specificityDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowSpecificityDropdown(!showSpecificityDropdown)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 shrink-0 border ${
                      !PRIMARY_CAT_IDS.includes(selectedCategory)
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-300'
                        : 'glass-card border-white/80 text-slate-700 hover:text-slate-950 hover:bg-white'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>
                      {!PRIMARY_CAT_IDS.includes(selectedCategory)
                        ? `Domain: ${JOB_CATEGORIES.find((c) => c.id === selectedCategory)?.shortName || 'Custom'}`
                        : 'Tech Specificity'}
                    </span>
                    {!PRIMARY_CAT_IDS.includes(selectedCategory) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/20 text-white">
                        {categoryCounts[selectedCategory] || 0}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showSpecificityDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Specificity Glass Dropdown Menu */}
                  {showSpecificityDropdown && (
                    <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl glass-panel border border-white/95 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Specialized Tech Domains
                        </span>
                        {!PRIMARY_CAT_IDS.includes(selectedCategory) && (
                          <button
                            onClick={() => {
                              setSelectedCategory('ALL');
                              setShowSpecificityDropdown(false);
                            }}
                            className="text-[11px] text-slate-500 hover:text-slate-900 underline font-semibold"
                          >
                            Reset to All
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        {JOB_CATEGORIES.filter((c) => !PRIMARY_CAT_IDS.includes(c.id)).map((cat) => {
                          const count = categoryCounts[cat.id] || 0;
                          const isSelected = selectedCategory === cat.id;

                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                if (jobsViewMode === 'sectioned') setJobsViewMode('filtered');
                                setShowSpecificityDropdown(false);
                              }}
                              className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-slate-900 text-white font-bold'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold truncate">{cat.name}</div>
                                <div
                                  className={`text-[10px] truncate ${
                                    isSelected ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-500'
                                  }`}
                                >
                                  {cat.desc}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {count}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CONTENT: Sectioned by Type OR Filtered Feed */}
              {jobsViewMode === 'sectioned' ? (
                <div className="space-y-12">
                  {/* Master Feed Section: All Jobs */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-5 h-5 text-slate-800" />
                        <h3 className="text-lg font-black text-slate-900">All Available Jobs</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-bold">
                          {jobs.length} Total Gigs
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {jobs.map((job) => renderJobCard(job))}
                    </div>
                  </div>

                  {/* Section for Each Job Type */}
                  {JOB_CATEGORIES.filter((c) => c.id !== 'ALL').map((cat) => {
                    const catJobs = jobs.filter((j) => j.category === cat.id);
                    if (catJobs.length === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-4 pt-6 border-t border-slate-200/80">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-extrabold text-slate-900">{cat.name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              {catJobs.length} {catJobs.length === 1 ? 'gig' : 'gigs'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setJobsViewMode('filtered');
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                          >
                            Filter only {cat.name} &rarr;
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {catJobs.map((job) => renderJobCard(job))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Filtered Feed */
                <div className="space-y-4">
                  {selectedCategory !== 'ALL' && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl glass-slide border border-white">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          Showing category: {JOB_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold">
                          {filteredJobs.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCategory('ALL')}
                        className="text-xs text-slate-500 hover:text-slate-900 underline font-semibold"
                      >
                        Reset to All Jobs
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredJobs.map((job) => renderJobCard(job))}

                    {filteredJobs.length === 0 && (
                      <div className="md:col-span-2 p-16 text-center text-slate-500 glass-card rounded-3xl">
                        <Briefcase className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                        <p className="text-sm font-bold text-slate-800">No gigs found in this category</p>
                        <p className="text-xs text-slate-500 mt-1">Be the first to post a gig and lock an escrow!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* ================= TAB 2: MY ESCROWS & SUBMISSIONS ================= */}
        {activeTab === 'my-gigs' && (
          <div className="space-y-10">
            
            {/* Section A: My Funded Client Escrows */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">My Funded Client Escrows</h3>
                  <p className="text-xs text-slate-500">Gigs you have created and funded with escrow.</p>
                </div>
                <button
                  onClick={() => setShowPostJobModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                >
                  + Post New Gig
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {myClientJobs.map((job) => {
                  const escrowGen = Number(job.escrow_balance || '0') / 10**18;
                  const isAwaitingAction = job.status === 'AWAITING_CLIENT_ACTION';

                  return (
                    <div key={job.id} className="p-6 rounded-3xl glass-card space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                            #{job.id}
                          </span>
                          <h4 className="text-base font-bold text-slate-900">{job.title}</h4>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase bg-slate-100 text-slate-700">
                          {job.status}
                        </span>
                      </div>

                      {/* Picture alongside description */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-full sm:w-28 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm">
                          <img
                            src={job.imageUrl || DEFAULT_CATEGORY_IMAGES[job.category || 'General'] || DEFAULT_CATEGORY_IMAGES['ALL']}
                            alt={job.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_CATEGORY_IMAGES['ALL'];
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {job.description || 'No description provided.'}
                          </p>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {JOB_CATEGORIES.find((c) => c.id === job.category)?.name || job.category || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-4">
                        <div>
                          <span>Current Escrow Balance: </span>
                          <span className="font-bold text-slate-900">{escrowGen.toFixed(2)} GEN</span>
                        </div>
                        <div>
                          <span>Pending Submissions: </span>
                          <span className="font-bold text-slate-900">{job.pending_submissions || 0}</span>
                        </div>
                      </div>

                      {/* OPTION B ACTION CARDS */}
                      {isAwaitingAction && (
                        <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                          <div className="flex items-center space-x-2 text-amber-800 text-xs font-bold">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Freelancer was rejected. Your 100% escrow is preserved in the smart contract!</span>
                          </div>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            Choose to re-list the gig for another freelancer to attempt with zero extra deposit, or withdraw 100% of your escrow back to your wallet.
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              onClick={() => {
                                setSelectedJobForRelist(job);
                                setUpdatedRubric(job.rubric);
                                setShowRelistModal(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Re-list Gig (Zero extra deposit)</span>
                            </button>

                            <button
                              onClick={() => handleWithdrawEscrow(job.id)}
                              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center space-x-1.5 shadow-sm"
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
                  <div className="p-8 text-center text-slate-500 glass-card rounded-2xl text-xs">
                    You haven't posted any client gigs yet.
                  </div>
                )}
              </div>
            </div>

            {/* Section B: My Freelancer Submissions */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">My Deliverable Submissions</h3>
                <p className="text-xs text-slate-500">Track your submitted deliverables and GenVM AI consensus quality verdicts.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {myWorkerSubmissions.map((sub) => {
                  const stakeGen = Number(sub.stake_wei || '0') / 10**18;
                  const isPending = sub.status === 'Pending';
                  const isEvaluating = evaluatingSubId === sub.id;

                  return (
                    <div key={sub.id} className="p-6 rounded-3xl glass-card space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-500">Submission #{sub.id} (Job #{sub.job_id})</span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                            sub.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sub.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="text-slate-500">Deliverable URL: </span>
                        <a
                          href={sub.deliverable_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-900 font-semibold hover:underline inline-flex items-center space-x-1"
                        >
                          <span>{sub.deliverable_url}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="text-xs text-slate-600">
                        <span>Collateral Staked: </span>
                        <span className="font-bold text-slate-900">{stakeGen.toFixed(2)} GEN</span>
                      </div>

                      {/* Evaluation Trace */}
                      {sub.evaluation_trace && (
                        <div className="p-3.5 rounded-2xl glass-slide font-mono text-[11px] text-slate-700 whitespace-pre-line">
                          {sub.evaluation_trace}
                        </div>
                      )}

                      {/* Trigger Evaluation Button if Pending */}
                      {isPending && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleEvaluate(sub.id)}
                            disabled={isEvaluating}
                            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md disabled:opacity-50 flex items-center space-x-2"
                          >
                            {isEvaluating ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>GenVM Consensus Running...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Trigger GenVM AI Consensus</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {myWorkerSubmissions.length === 0 && (
                  <div className="p-8 text-center text-slate-500 glass-card rounded-2xl text-xs">
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
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Freelancer Hall of Fame</h2>
              <p className="text-xs text-slate-500">Ranked by on-chain earnings, successful deliverables, and slashing record.</p>
            </div>

            <div className="p-6 rounded-3xl glass-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Rank</th>
                      <th className="p-3.5">Freelancer Address</th>
                      <th className="p-3.5">Total Earned</th>
                      <th className="p-3.5">Jobs Completed</th>
                      <th className="p-3.5">Slashed Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((w, index) => {
                      const earnedGen = (w.total_earned_wei || 0) / 10**18;
                      return (
                        <tr key={w.address} className="hover:bg-slate-50/60">
                          <td className="p-3.5 font-bold text-slate-500">#{index + 1}</td>
                          <td className="p-3.5 font-mono text-slate-900 font-semibold">{w.address}</td>
                          <td className="p-3.5 font-bold text-slate-900">{earnedGen.toFixed(2)} GEN</td>
                          <td className="p-3.5 font-semibold text-slate-700">{w.jobs_completed}</td>
                          <td className="p-3.5 font-semibold text-slate-500">{w.slashed_count}</td>
                        </tr>
                      );
                    })}

                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl text-slate-900 my-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Post a New Gig</h3>
            <p className="text-xs text-slate-500 mb-6">
              Lock funds into milestone escrow with an objective rubric. GenVM AI validators evaluate deliverables directly against this criteria.
            </p>

            <form onSubmit={handlePostJob} className="space-y-4">
              {/* Job Category Selection Dropdown (Minimalist Design) */}
              <div className="relative" ref={postJobCategoryDropdownRef}>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Job Domain / Tech Specificity
                </label>
                <button
                  type="button"
                  onClick={() => setShowPostJobCategoryDropdown(!showPostJobCategoryDropdown)}
                  className="w-full glass-input rounded-xl p-3 text-xs flex items-center justify-between text-left font-medium bg-white/80 hover:bg-white border border-slate-200 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0"></span>
                    <span className="font-bold text-slate-900 truncate">
                      {JOB_CATEGORIES.find((c) => c.id === jobCategory)?.name || 'Select Tech Domain'}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                      ({JOB_CATEGORIES.find((c) => c.id === jobCategory)?.desc})
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      showPostJobCategoryDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showPostJobCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-2xl glass-panel border border-white/95 shadow-2xl p-2 z-50 space-y-1 divide-y divide-slate-100/60">
                    {JOB_CATEGORIES.filter((c) => c.id !== 'ALL').map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setJobCategory(cat.id);
                          if (!jobImageUrl || Object.values(DEFAULT_CATEGORY_IMAGES).includes(jobImageUrl)) {
                            setJobImageUrl(DEFAULT_CATEGORY_IMAGES[cat.id] || '');
                          }
                          setShowPostJobCategoryDropdown(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center justify-between group ${
                          jobCategory === cat.id
                            ? 'bg-slate-900 text-white font-bold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold truncate">{cat.name}</div>
                          <div
                            className={`text-[10px] truncate ${
                              jobCategory === cat.id ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {cat.desc}
                          </div>
                        </div>
                        {jobCategory === cat.id && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Job Picture Upload / Selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Job Banner / Picture
                </label>
                <div className="flex items-start gap-4 p-3.5 rounded-2xl glass-slide border border-white">
                  <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm">
                    <img
                      src={jobImageUrl || DEFAULT_CATEGORY_IMAGES[jobCategory] || DEFAULT_CATEGORY_IMAGES['ALL']}
                      alt="Job Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_CATEGORY_IMAGES['ALL'];
                      }}
                    />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <input
                      ref={jobImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleJobImageUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => jobImageInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 active:scale-95 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo from Device</span>
                      </button>
                      {jobImageUrl && (
                        <button
                          type="button"
                          onClick={() => setJobImageUrl('')}
                          className="px-2.5 py-1.5 rounded-xl glass-card text-rose-600 text-xs font-medium hover:bg-rose-50 transition"
                        >
                          Reset Cover
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={jobImageUrl.startsWith('data:image') ? '' : jobImageUrl}
                      onChange={(e) => setJobImageUrl(e.target.value)}
                      placeholder={jobImageUrl.startsWith('data:image') ? '(Custom photo uploaded from device memory)' : 'Or paste image URL...'}
                      className="w-full glass-input rounded-xl px-2.5 py-1 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Gig Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Build Responsive Web3 Landing Page"
                  required
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={2}
                  placeholder="Overview of the task, deliverables, and repo links..."
                  className="w-full glass-input rounded-xl p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Objective AI Acceptance Rubric (Required)
                </label>
                <textarea
                  value={jobRubric}
                  onChange={(e) => setJobRubric(e.target.value)}
                  rows={3}
                  required
                  placeholder="1. Must be mobile responsive. 2. Web3 wallet connect works without errors. 3. Code must include unit tests."
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Escrow Deposit (GEN)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={jobEscrowGen}
                    onChange={(e) => setJobEscrowGen(e.target.value)}
                    required
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Min Freelancer Stake (GEN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={jobMinStakeGen}
                    onChange={(e) => setJobMinStakeGen(e.target.value)}
                    required
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPostJobModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {actionLoading ? 'Locking Escrow...' : 'Deposit Escrow & Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SUBMIT DELIVERABLE --- */}
      {showSubmitModal && selectedJobForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl text-slate-900 my-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Stake & Submit Deliverable</h3>
            <p className="text-xs text-slate-500 mb-4">
              Submitting for: <span className="font-bold text-slate-900">{selectedJobForSubmit.title}</span>
            </p>

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Deliverable URL (GitHub PR, Live Link, Doc)
                </label>
                <input
                  type="url"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://github.com/your-org/pull/1"
                  required
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Submission Notes
                </label>
                <textarea
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  rows={3}
                  placeholder="Summarize what was completed and where reviewers can verify..."
                  className="w-full glass-input rounded-xl p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Collateral Stake (GEN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={formatEther(BigInt(selectedJobForSubmit.min_stake_wei))}
                  value={stakeAmountGen}
                  onChange={(e) => setStakeAmountGen(e.target.value)}
                  required
                  className="w-full glass-input rounded-xl px-4 py-2 text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Stake is returned in full upon approval. If rejected for underdelivering, stake is slashed to the protocol.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl text-slate-900 my-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Re-list Gig (Zero Deposit)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your deposited escrow is intact in the smart contract. You can clarify the acceptance rubric before re-opening to new freelancers.
            </p>

            <form onSubmit={handleRelistJob} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Updated Acceptance Rubric
                </label>
                <textarea
                  value={updatedRubric}
                  onChange={(e) => setUpdatedRubric(e.target.value)}
                  rows={4}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRelistModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {actionLoading ? 'Re-listing...' : 'Confirm Re-list'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/40 py-6 text-center text-xs text-slate-500">
        TrustlessWork Protocol • Impartial Milestone Escrows
      </footer>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
