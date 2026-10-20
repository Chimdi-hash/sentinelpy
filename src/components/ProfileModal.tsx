"use client";

import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Globe, Mail, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';

interface UserProfile {
  address: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  roles?: string[];
  skills?: string[];
  linkedin?: string | null;
  twitter?: string | null;
  github?: string | null;
  email?: string | null;
  website?: string | null;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
  onProfileUpdated?: (updated: UserProfile) => void;
  workerStats?: {
    total_earned_wei?: number;
    jobs_completed?: number;
    slashed_count?: number;
  };
}

const AVAILABLE_ROLES = [
  "Full-Stack Web3 Dev",
  "Smart Contract Engineer",
  "Security Auditor",
  "AI & ML Engineer",
  "Frontend / UI Specialist",
  "Backend Architect",
  "UI/UX Designer",
  "Technical Writer"
];

const POPULAR_SKILLS = [
  "Solidity", "GenLayer", "Python", "React", "Next.js", "TypeScript", 
  "Rust", "Node.js", "TailwindCSS", "EVM", "AI Agents", "Security Auditing"
];

export default function ProfileModal({
  isOpen,
  onClose,
  account,
  onProfileUpdated,
  workerStats,
}: ProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Fetch profile when modal opens
  useEffect(() => {
    if (!isOpen || !account) return;

    let isMounted = true;
    setLoading(true);
    setMessage(null);

    fetch(`/api/users/${account}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
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
          // Defaults for new profile
          setDisplayName(`Hunter_${account.slice(2, 6)}`);
          setHeadline('Web3 Freelancer & Builder');
          setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${account}`);
        }
      })
      .catch((err) => console.error('Error fetching profile:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, account]);

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

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      if (onProfileUpdated && data.user) {
        onProfileUpdated(data.user);
      }
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving profile' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 text-zinc-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Professional Profile</h2>
              <p className="text-xs text-zinc-400 font-mono">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* On-Chain Track Record Badge */}
        {workerStats && (
          <div className="my-5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Earned On-Chain</span>
              <p className="text-lg font-bold text-cyan-400">
                {((workerStats.total_earned_wei || 0) / 10**18).toFixed(2)} GEN
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Gigs Completed</span>
              <p className="text-lg font-bold text-emerald-400">
                {workerStats.jobs_completed || 0}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Slashed Record</span>
              <p className={`text-lg font-bold ${workerStats.slashed_count ? 'text-amber-400' : 'text-zinc-400'}`}>
                {workerStats.slashed_count || 0}
              </p>
            </div>
          </div>
        )}

        {/* Alerts */}
        {message && (
          <div
            className={`my-4 p-3 rounded-xl flex items-center space-x-2 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-zinc-400">
            <div className="inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Loading your Web3 profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 mt-4">
            
            {/* Avatar & Display Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/40 rounded-xl border border-zinc-800">
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${account}`}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full border-2 border-cyan-500/50 object-cover shadow-md mb-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${account}`;
                  }}
                />
                <span className="text-xs text-zinc-500 font-medium">Avatar Preview</span>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Satoshi_Dev"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://... (or leave default Dicebear)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Professional Headline */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Professional Headline / Title
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Smart Contract Auditor | GenVM AI Specialist"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Bio & Background
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Describe your domain expertise, successful deliverables, and past projects..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Roles Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Primary Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => {
                  const active = roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                        active
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Skills & Tech Stack
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center space-x-1.5 text-xs bg-zinc-800 text-zinc-200 px-2.5 py-1 rounded-md border border-zinc-700"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="text-zinc-400 hover:text-rose-400 transition"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              {/* Add custom skill input */}
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
                  placeholder="Type skill & press Enter or Add..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillInput)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-xl font-medium transition"
                >
                  Add
                </button>
              </div>

              {/* Quick skill suggestions */}
              <div className="flex flex-wrap gap-1">
                {POPULAR_SKILLS.filter((s) => !skills.includes(s)).slice(0, 6).map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => addSkill(suggested)}
                    className="text-[11px] text-zinc-500 hover:text-cyan-400 hover:underline px-1.5 py-0.5"
                  >
                    + {suggested}
                  </button>
                ))}
              </div>
            </div>

            {/* Socials & Verified Links */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Social Profiles & Contact Channels
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300">LinkedIn</span>
                  </div>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300">X (Twitter)</span>
                  </div>
                  <input
                    type="url"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://x.com/username"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300">GitHub</span>
                  </div>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-1">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-semibold text-zinc-300">Contact Email</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@domain.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-1">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-semibold text-zinc-300">Portfolio / Website</span>
                </div>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourportfolio.dev"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm transition shadow-lg shadow-cyan-500/25 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
