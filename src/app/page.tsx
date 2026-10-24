"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Coins, 
  Sparkles, 
  Scale, 
  RotateCcw, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Layers, 
  Cpu, 
  Users,
  ChevronRight,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts[0]) {
          setConnectedAccount(accounts[0]);
        }
      }).catch(() => {});
    }
  }, []);

  const glassSlides = [
    {
      id: "escrow",
      badge: "Pillar 1: Client Capital Security",
      title: "Objective Milestone Escrow",
      desc: "Clients post gigs with a strictly defined acceptance rubric and deposit their budget into an immutable GenLayer smart contract. Funds are physically locked and cannot be drained or stolen.",
      metric: "100% Escrow Protection",
      icon: <Lock className="w-6 h-6 text-slate-700" />
    },
    {
      id: "staking",
      badge: "Pillar 2: Skin in the Game",
      title: "Freelancer Collateral Staking",
      desc: "To eliminate AI spam, abandoned jobs, and substandard work, freelancers stake collateral alongside their deliverable submission. High-quality execution returns 100% of their stake plus the client payout.",
      metric: "Zero Low-Effort Spam",
      icon: <Coins className="w-6 h-6 text-slate-700" />
    },
    {
      id: "genvm",
      badge: "Pillar 3: Impartial Adjudication",
      title: "GenVM AI Consensus Quality Engine",
      desc: "No biased human support ticket staff or subjective moderators. Decentralized GenLayer validators fetch the submitted PR or live link, evaluate it against the client's rubric, and execute immediate consensus.",
      metric: "Zero Human Arbitrator Bias",
      icon: <Cpu className="w-6 h-6 text-slate-700" />
    },
    {
      id: "option-b",
      badge: "Pillar 4: Option B Preservation",
      title: "Capital Retention & Revenue Yield",
      desc: "If a freelancer underdelivers, 100% of their staked collateral routes directly to protocol revenue, while the client's escrow is 100% preserved in the contract for an instant 1-click re-list or native wallet refund.",
      metric: "2.5% Fee + 100% Slashes",
      icon: <Scale className="w-6 h-6 text-slate-700" />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-slate-200 selection:text-slate-900 relative overflow-x-clip">
      
      {/* Full Page Fixed Background Layer (hero.bg) - Visible Across Entire Landing Page */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <img
          src="/hero-bg.jpeg"
          alt="Remote Freelance Workspace"
          className="w-full h-full object-cover object-center sm:object-[center_35%] scale-100 opacity-95"
        />
        {/* Crisp Translucent Glass Tint - Maximizes Image Visibility while Preserving Typography Contrast */}
        <div className="absolute inset-0 bg-white/35 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/40" />
      </div>

      {/* Top Glassmorphic Navigation - Concise Height */}
      <header className="sticky top-0 z-40 w-full border-b border-white/60 bg-white/70 backdrop-blur-xl shadow-sm shadow-slate-200/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-xl glass-slide flex items-center justify-center text-slate-800 shadow-sm border border-white group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 text-slate-800" />
            </div>
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Trustless<span className="text-slate-500">Work</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 sm:space-x-8">
            <a href="#pillars" className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
              Core Pillars
            </a>
            <a href="#mechanics" className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
              Protocol Mechanics
            </a>
            <a href="#lifecycle" className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
              Lifecycle
            </a>
          </nav>

          {/* Launch Dashboard Action Button + Mobile Hamburger Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href={connectedAccount ? "/dashboard" : "/connect"}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-md shadow-slate-400/20 flex items-center space-x-1.5 active:scale-95"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl glass-card text-slate-800 hover:bg-white transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 text-slate-800" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer (< md) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/80 bg-white/95 backdrop-blur-2xl shadow-xl px-4 py-4 space-y-2 transition-all">
            <a
              href="#pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition"
            >
              Core Pillars
            </a>
            <a
              href="#mechanics"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition"
            >
              Protocol Mechanics
            </a>
            <a
              href="#lifecycle"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition"
            >
              Lifecycle Flow
            </a>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 space-y-24">
        
        {/* ================= HERO SECTION ================= */}
        <section className="text-center max-w-4xl mx-auto space-y-8 relative">
          
          {/* Prominent Hero Badge: Decentralized Escrow & Quality Protocol */}
          <div className="inline-flex items-center space-x-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full glass-panel border border-white text-slate-900 shadow-lg shadow-slate-400/20 hover:shadow-xl transition">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-slate-800">
              Decentralized Escrow &amp; Quality Protocol
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
              GenVM
            </span>
          </div>

          {/* Headline with gliding green glassmorphic circle */}
          <div className="relative inline-block w-full max-w-4xl mx-auto px-2">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 leading-[1.15] drop-shadow-sm">
              Work with confidence. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-800 to-slate-600">
                Guaranteed by AI Consensus.
              </span>
            </h1>

            {/* Gliding Green Glassmorphic Circle at the level of 'Consensus' on the right */}
            <div className="absolute -right-2 sm:-right-6 md:-right-10 lg:-right-20 xl:-right-24 -bottom-3 sm:bottom-1 md:bottom-2 z-20 animate-glide select-none pointer-events-none sm:pointer-events-auto">
              <div className="w-20 h-20 sm:w-26 sm:h-26 md:w-32 md:h-32 rounded-full glass-green-orb flex flex-col items-center justify-center p-1.5 sm:p-2.5 sm:p-3 text-center shadow-xl sm:shadow-2xl transition-transform hover:scale-105">
                {/* Pulsing Status Dot */}
                <div className="flex items-center space-x-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </div>
                {/* 100% */}
                <span className="text-xs sm:text-sm md:text-base font-black text-emerald-950 tracking-tight leading-none font-mono">
                  100%
                </span>
                {/* Trust & Execution */}
                <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider leading-tight mt-0.5">
                  trust &amp; execution
                </span>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-800 max-w-2xl mx-auto leading-relaxed font-semibold drop-shadow-sm">
            Clients lock escrows with clear acceptance rubrics. Freelancers stake collateral to guarantee performance. GenVM validators evaluate deliverables with mathematical objectivity—eliminating biased human arbitration.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={connectedAccount ? "/dashboard" : "/connect"}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition shadow-2xl shadow-slate-900/30 flex items-center justify-center space-x-2 group active:scale-95"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#slides"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-card glass-card-hover text-slate-900 font-bold text-sm transition flex items-center justify-center space-x-2 bg-white/85 hover:bg-white shadow-md shadow-slate-300/30"
            >
              <span>Explore How It Works</span>
            </a>
          </div>

          {/* Live Trust Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-10 max-w-3xl mx-auto">
            <div className="glass-card p-3 sm:p-4 rounded-2xl text-center bg-white/85 backdrop-blur-xl border border-white/90 shadow-lg shadow-slate-300/20">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Escrow Security</span>
              <p className="text-base sm:text-lg font-black text-slate-900">100% Locked</p>
            </div>
            <div className="glass-card p-3 sm:p-4 rounded-2xl text-center bg-white/85 backdrop-blur-xl border border-white/90 shadow-lg shadow-slate-300/20">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Arbitration Bias</span>
              <p className="text-base sm:text-lg font-black text-slate-900">0% Human Error</p>
            </div>
            <div className="glass-card p-3 sm:p-4 rounded-2xl text-center bg-white/85 backdrop-blur-xl border border-white/90 shadow-lg shadow-slate-300/20">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Protocol Fee</span>
              <p className="text-base sm:text-lg font-black text-slate-900">2.5% On Success</p>
            </div>
            <div className="glass-card p-3 sm:p-4 rounded-2xl text-center bg-white/85 backdrop-blur-xl border border-white/90 shadow-lg shadow-slate-300/20">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Option B</span>
              <p className="text-base sm:text-lg font-black text-slate-900">Preserved Escrow</p>
            </div>
          </div>
        </section>

        {/* ================= SECTION 2: CORE PILLARS ================= */}
        <section id="pillars" className="scroll-mt-28 space-y-8 pt-10">
          <div id="slides" className="scroll-mt-28"></div>
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Core Architecture</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed on Four Uncompromising Pillars
            </h2>
            <p className="text-xs text-slate-600">
              Click through the glass slides below to discover how TrustlessWork solves dispute fraud and low-quality freelancing.
            </p>
          </div>

          {/* Slide Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            {glassSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeSlide === idx
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-300'
                    : 'glass-card text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {slide.title}
              </button>
            ))}
          </div>

          {/* Active Glass Slide Card */}
          <div className="max-w-4xl mx-auto">
            <div className="glass-panel p-6 sm:p-10 md:p-12 rounded-3xl relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                    {glassSlides[activeSlide].icon}
                    <span>{glassSlides[activeSlide].badge}</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {glassSlides[activeSlide].title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {glassSlides[activeSlide].desc}
                  </p>

                  <div className="pt-2">
                    <span className="inline-block text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
                      Guarantee: {glassSlides[activeSlide].metric}
                    </span>
                  </div>
                </div>

                {/* Decorative Visual Card on the right */}
                <div className="w-full md:w-64 glass-slide p-6 rounded-2xl border border-white shadow-inner text-center space-y-3 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
                    {glassSlides[activeSlide].icon}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Protocol Invariant</h4>
                  <p className="text-[11px] text-slate-500">
                    Validated by GenLayer Studionet consensus validators on every transaction.
                  </p>
                </div>
              </div>

              {/* Progress indicators */}
              <div className="flex items-center justify-center space-x-2 pt-8 mt-8 border-t border-slate-200/60">
                {glassSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      activeSlide === idx ? 'w-8 bg-slate-900' : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 3: PROTOCOL MECHANICS ================= */}
        <section id="mechanics" className="scroll-mt-28 space-y-8 pt-10">
          <div id="features" className="scroll-mt-28"></div>
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">On-Chain Rules &amp; Game Theory</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Cryptographic Protocol Mechanics
            </h2>
            <p className="text-xs text-slate-600">
              Deterministic smart contract invariants governed by GenLayer GenVM—zero human intervention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Rule 1: Escrow Vault */}
            <div className="glass-card glass-card-hover p-6 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Lock className="w-5 h-5 text-slate-100" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Milestone Vault</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Client capital is physically locked in the smart contract bytecode. Nobody can drain, seize, or arbitrarily reverse deposited funds.
              </p>
              <div className="pt-2 text-[11px] font-mono font-semibold text-slate-700">
                Rule: 100% Locked Upon Posting
              </div>
            </div>

            {/* Rule 2: 2.5% Take-Rate */}
            <div className="glass-card glass-card-hover p-6 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs">
                2.5%
              </div>
              <h3 className="text-base font-bold text-slate-900">Success Take-Rate</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upon unanimous GenVM consensus approval, exactly 2.5% is routed to the protocol treasury, while 97.5% + 100% of collateral streams to the worker.
              </p>
              <div className="pt-2 text-[11px] font-mono font-semibold text-emerald-700">
                Rule: Payout = 97.5% + Stake Return
              </div>
            </div>

            {/* Rule 3: 100% Slash */}
            <div className="glass-card glass-card-hover p-6 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shadow-sm">
                <Scale className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Collateral Slashing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Substandard work or hallucinated deliverables forfeit 100% of the freelancer's staked collateral directly to the protocol treasury.
              </p>
              <div className="pt-2 text-[11px] font-mono font-semibold text-rose-700">
                Rule: 100% Slashed on Rejection
              </div>
            </div>

            {/* Rule 4: Option B Preservation */}
            <div className="glass-card glass-card-hover p-6 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center shadow-sm">
                <RotateCcw className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Capital Preservation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If a freelancer fails, the client's escrow is 100% preserved in the contract pool—empowering immediate 1-click free re-listing or native refund.
              </p>
              <div className="pt-2 text-[11px] font-mono font-semibold text-slate-700">
                Rule: 0% Client Loss on Failure
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 4: 3-STEP GLASS PALETTE LIFECYCLE ================= */}
        <section id="lifecycle" className="scroll-mt-28 space-y-8 pt-10">
          <div id="how-it-works" className="scroll-mt-28"></div>
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Simple 3-Step Flow</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How a Gig Progresses from Escrow to Payout
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 Palette */}
            <div className="glass-card glass-card-hover p-6 sm:p-8 rounded-3xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-extrabold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">Post Gig & Fund Escrow</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Client specifies the objective acceptance rubric and deposits budget into the smart contract. The escrow is secured.
              </p>
              <ul className="text-[11px] text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Objective rubric written upfront</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Zero client counterparty risk</span>
                </li>
              </ul>
            </div>

            {/* Step 2 Palette */}
            <div className="glass-card glass-card-hover p-6 sm:p-8 rounded-3xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-extrabold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">Stake & Submit Deliverable</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Freelancer stakes collateral (e.g. 0.1 GEN) and submits their work URL (GitHub PR, staging deployment, or live link).
              </p>
              <ul className="text-[11px] text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Collateral prevents AI spam</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Guaranteed freelancer commitment</span>
                </li>
              </ul>
            </div>

            {/* Step 3 Palette */}
            <div className="glass-card glass-card-hover p-6 sm:p-8 rounded-3xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-extrabold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">GenVM AI Consensus Settlement</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                GenVM validators fetch deliverable code and evaluate against rubric. If approved: 97.5% + stake paid to freelancer. If rejected: stake slashed, escrow preserved for re-list or refund.
              </p>
              <ul className="text-[11px] text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>2.5% protocol fee to treasury</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Option B client escrow refund</span>
                </li>
              </ul>
            </div>

          </div>
        </section>

        {/* ================= FINAL CTA SECTION ================= */}
        <section className="glass-panel p-6 sm:p-12 md:p-16 rounded-3xl text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready to post or hunt verified Web3 gigs?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Launch the dashboard to browse active escrows, set up your job market profile, and start working trustlessly.
            </p>
            <div className="pt-4">
              <Link
                href={connectedAccount ? "/dashboard" : "/connect"}
                className="inline-flex items-center space-x-2 px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xl shadow-slate-300 transition active:scale-95"
              >
                <span>Launch Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/60 bg-white/70 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span className="font-semibold text-slate-700">TrustlessWork Protocol</span>
            <span>• Powered by GenLayer Studionet</span>
          </div>
          <div>
            <span>Objective Freelance Milestone Escrows</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
