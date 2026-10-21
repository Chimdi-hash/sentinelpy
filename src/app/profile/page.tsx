"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  ArrowLeft, 
  User, 
  Briefcase, 
  Globe, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink,
  Coins,
  CheckCircle,
  Eye,
  Save,
  Upload,
  Camera,
  Trash2,
  LogOut
} from 'lucide-react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const AVAILABLE_ROLES = [
  "Full-Stack Web3 Dev",
  "Smart Contract Engineer",
  "Security Auditor",
  "AI & ML Specialist",
  "Frontend / UI Specialist",
  "Backend Architect",
  "UI/UX Designer",
  "Technical Writer"
];

const POPULAR_SKILLS = [
  "Solidity", "GenLayer", "Python", "React", "Next.js", "TypeScript", 
  "Rust", "Node.js", "TailwindCSS", "EVM", "AI Agents", "Security Auditing"
];

export default function ProfileMarketPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // On-Chain Stats
  const [onChainStats, setOnChainStats] = useState<{
    total_earned_wei: number;
    jobs_completed: number;
    slashed_count: number;
  }>({ total_earned_wei: 0, jobs_completed: 0, slashed_count: 0 });

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x75B4aBC58426FB6D817Ed02b3b243a9A8Bb2c0E0";

  // Check connected account
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts[0]) {
          setAccount(accounts[0]);
        } else {
          router.push('/connect');
        }
      }).catch(() => {
        router.push('/connect');
      });
    } else {
      router.push('/connect');
    }
  }, [router]);

  // Load Profile and On-Chain Stats
  useEffect(() => {
    if (!account) return;
    setLoading(true);

    // 1. Fetch DB Profile
    fetch(`/api/users/${account}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.found && data.user) {
          const u = data.user;
          setDisplayName(u.displayName || '');
          setAvatarUrl(u.avatarUrl || '');
          setHeadline(u.headline || '');
          setBio(u.bio || '');
          setRoles(Array.isArray(u.roles) ? u.roles : []);
          setSkills(Array.isArray(u.skills) ? u.skills : []);
          setLinkedin(u.linkedin || '');
          setTwitter(u.twitter || '');
          setGithub(u.github || '');
          setEmail(u.email || '');
          setWebsite(u.website || '');
        } else {
          setDisplayName(`Hunter_${account.slice(2, 6)}`);
          setHeadline('Web3 Freelancer & Builder');
          setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${account}`);
        }
      })
      .catch((err) => console.error('Error loading profile:', err))
      .finally(() => setLoading(false));

    // 2. Fetch On-Chain Stats
    try {
      const readClient = createClient({ chain: studionet });
      (readClient as any).readContract({
        address: contractAddress,
        functionName: 'get_worker',
        args: [account],
      }).then((workerStr: string) => {
        if (workerStr) {
          setOnChainStats(JSON.parse(workerStr));
        }
      }).catch((e: any) => console.warn('get_worker fallback:', e));
    } catch {
      // Fallback
    }
  }, [account, contractAddress]);

  // Upload image from device memory with auto-compression
  const handleDeviceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;

      // In-browser HTML5 canvas resize to keep size ultra-lightweight for fast SQLite persistence
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
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
          setAvatarUrl(compressed);
        } else {
          setAvatarUrl(rawDataUrl);
        }
        setMessage({ type: 'success', text: 'Photo loaded from device! Click "Save Profile" to finalize.' });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleResetAvatar = () => {
    setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${account || 'user'}`);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Disconnect Wallet
  const handleDisconnect = () => {
    setAccount(null);
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    router.push('/connect');
  };

  const toggleRole = (role: string) => {
    if (roles.includes(role)) {
      setRoles(roles.filter((r) => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  const addSkill = (skill: string) => {
    const cleaned = skill.trim();
    if (cleaned && !skills.includes(cleaned)) {
      setSkills([...skills, cleaned]);
    }
    setSkillInput('');
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        roles,
        skills,
        linkedin: linkedin.trim(),
        twitter: twitter.trim(),
        github: github.trim(),
        email: email.trim(),
        website: website.trim(),
      };

      const res = await fetch(`/api/users/${account}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setMessage({ type: 'success', text: 'Market appearance updated successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving profile' });
    } finally {
      setSaving(false);
    }
  };

  const effectiveAvatar = avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${account || 'user'}`;
  const isCustomUploaded = avatarUrl && avatarUrl.startsWith('data:image');

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-slate-200 selection:text-slate-900">
      
      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/70 bg-white/75 backdrop-blur-xl shadow-sm shadow-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-slate-950 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl glass-slide flex items-center justify-center text-slate-800 shadow-sm border border-white">
              <User className="w-4 h-4 text-slate-800" />
            </div>
            <span className="text-sm font-extrabold text-slate-900">Job Market Appearance</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Disconnect Wallet Button */}
            <button
              onClick={handleDisconnect}
              className="p-2 sm:px-3 sm:py-2 rounded-xl glass-card hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-bold transition flex items-center space-x-1.5"
              title="Disconnect Wallet"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disconnect</span>
            </button>

            {/* Save Profile Button */}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md shadow-slate-300 flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Alerts */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center space-x-2 text-xs font-semibold shadow-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-slate-500">
            <div className="inline-block w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-semibold">Loading your job market profile...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: THE PROFILE EDITOR (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Personal Identity</h2>
                  <p className="text-xs text-slate-500">How clients see your brand in marketplace gig searches.</p>
                </div>

                {/* ================= AVATAR UPLOAD FROM DEVICE ================= */}
                <div className="p-5 rounded-2xl glass-slide border border-white space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    
                    {/* Image Circle Preview */}
                    <div className="relative group shrink-0">
                      <img
                        src={effectiveAvatar}
                        alt="Avatar Preview"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${account || 'user'}`;
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-slate-900/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold"
                        title="Upload from device"
                      >
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>Change</span>
                      </button>
                    </div>

                    {/* Upload Controls & Actions */}
                    <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        {/* Hidden Native File Input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDeviceImageUpload}
                          className="hidden"
                        />

                        {/* Trigger Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1.5 active:scale-95"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo from Device</span>
                        </button>

                        {/* Reset button */}
                        <button
                          type="button"
                          onClick={handleResetAvatar}
                          className="px-3 py-2 rounded-xl glass-card hover:bg-white text-slate-600 text-xs font-semibold transition"
                          title="Reset to default identicon"
                        >
                          Reset
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        {isCustomUploaded ? (
                          <span className="text-emerald-700 font-semibold flex items-center justify-center sm:justify-start space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Custom photo loaded from device memory</span>
                          </span>
                        ) : (
                          <span>Supports PNG, JPG, WebP, or GIF from your phone or computer.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Fallback Custom URL input toggle */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Or Paste Image URL directly
                    </label>
                    <input
                      type="url"
                      value={avatarUrl.startsWith('data:image') ? '' : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder={avatarUrl.startsWith('data:image') ? '(Custom photo uploaded from device memory)' : 'https://...'}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-slate-700"
                    />
                  </div>
                </div>

                {/* Display Name & Headline */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Rivers"
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Professional Headline
                    </label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Senior Smart Contract Auditor | GenVM AI Specialist"
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Domain Bio & Experience
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Detail your engineering background, past Web3 escrow deliverables, and specialty skills..."
                      className="w-full glass-input rounded-xl p-3 text-xs leading-relaxed"
                    />
                  </div>
                </div>

                {/* Market Roles */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-2">
                    Primary Market Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.map((role) => {
                      const active = roles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition font-medium ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Skills & Tech Stack */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-2">
                    Skills & Tech Stack
                  </label>
                  
                  {/* Current Skills Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center space-x-1.5 text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 font-medium"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => removeSkill(s)}
                          className="text-slate-400 hover:text-slate-900 font-bold ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Custom Skill Input */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill(skillInput);
                        }
                      }}
                      placeholder="Type a skill and press Enter or Add..."
                      className="flex-1 glass-input rounded-xl px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => addSkill(skillInput)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
                    >
                      Add
                    </button>
                  </div>

                  {/* Popular Suggestions */}
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_SKILLS.filter((s) => !skills.includes(s)).slice(0, 6).map((suggested) => (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => addSkill(suggested)}
                        className="text-[11px] text-slate-500 hover:text-slate-900 hover:underline px-1.5 py-0.5"
                      >
                        + {suggested}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Profiles & Direct Contact */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-3">
                    Verified Social Channels & Contact
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-700 block mb-1">LinkedIn Profile</span>
                      <input
                        type="url"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-700 block mb-1">X (Twitter) Profile</span>
                      <input
                        type="url"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="https://x.com/username"
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-700 block mb-1">GitHub Account</span>
                      <input
                        type="url"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-700 block mb-1">Contact Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@domain.com"
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1">Portfolio / Website</span>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourportfolio.dev"
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md shadow-slate-300 flex items-center space-x-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving Changes...' : 'Save Appearance'}</span>
                  </button>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: LIVE MARKET PREVIEW CARD (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-28 space-y-4">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Live Marketplace Preview
                  </span>
                </div>

                {/* The Preview Card */}
                <div className="glass-panel p-6 rounded-3xl space-y-5 border border-white shadow-xl">
                  
                  {/* Header */}
                  <div className="flex items-start space-x-4">
                    <img
                      src={effectiveAvatar}
                      alt="Avatar"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md shrink-0 bg-white"
                    />
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        {displayName || 'Anonymous Hunter'}
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                        {headline || 'Web3 Freelancer'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  {bio && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      {bio}
                    </p>
                  )}

                  {/* Roles */}
                  {roles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skills.map((s) => (
                        <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* On-Chain Track Record Badge */}
                  <div className="p-4 rounded-2xl glass-slide border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Earned</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {((onChainStats.total_earned_wei || 0) / 10**18).toFixed(2)} GEN
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Completed</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {onChainStats.jobs_completed || 0} Gigs
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Slashes</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {onChainStats.slashed_count || 0}
                      </span>
                    </div>
                  </div>

                  {/* Social Channels Preview */}
                  <div className="flex items-center space-x-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    {email && (
                      <a href={`mailto:${email}`} title="Email" className="hover:text-slate-900 transition">
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {linkedin && (
                      <a href={linkedin} target="_blank" rel="noreferrer" title="LinkedIn" className="hover:text-slate-900 transition">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {website && (
                      <a href={website} target="_blank" rel="noreferrer" title="Portfolio" className="hover:text-slate-900 transition">
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    <span className="text-[11px] text-slate-400 ml-auto">Public Market Card</span>
                  </div>

                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/40 py-6 text-center text-xs text-slate-500">
        TrustlessWork Protocol • Job Market Appearance & Reputation
      </footer>

    </div>
  );
}
