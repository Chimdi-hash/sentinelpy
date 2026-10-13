"use client";

import { useState, useEffect, useCallback } from 'react';
import ProposalCard from '../components/ProposalCard';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { custom } from 'viem';

export interface Audit {
  id: number;
  projectId: number;
  targetUrl: string;
  status: string;
  payoutStatus: string;
  analysis: string;
}

export interface Project {
  id: number;
  targetUrl: string;
  sponsor: string;
  poolBalance: string;
  status: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [fundAmount, setFundAmount] = useState('5.0');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuditingId, setIsAuditingId] = useState<number | null>(null);
  
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  
  const [audits, setAudits] = useState<Audit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Audit Submission Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditProjectId, setSelectedAuditProjectId] = useState<number | null>(null);
  const [auditReport, setAuditReport] = useState("");
  const [auditStartLine, setAuditStartLine] = useState("");
  const [auditEndLine, setAuditEndLine] = useState("");
  const [claimedSeverity, setClaimedSeverity] = useState("CRITICAL");

  // Top Up Modal State
  const [topUpProjectId, setTopUpProjectId] = useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('2.0');
  const [isToppingUp, setIsToppingUp] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [readClient, setReadClient] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [writeClient, setWriteClient] = useState<any>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x75B4aBC58426FB6D817Ed02b3b243a9A8Bb2c0E0";

  useEffect(() => {
    const rc = createClient({
      chain: studionet,
    });
    setReadClient(rc);
  }, []);

  const updateBalance = async (address: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = (window as any).ethereum;
        const balHex = await provider.request({ method: 'eth_getBalance', params: [address, 'latest'] });
        const bal = (parseInt(balHex, 16) / 1e18).toFixed(4);
        setBalance(bal);
      } catch (e) {
        console.error("Failed to fetch balance", e);
      }
    }
  };

  const fetchData = useCallback(async () => {
    if (!readClient || !contractAddress) return;
    try {
      // Fetch Projects
      try {
        const allProjsStr = await readClient.readContract({
           address: contractAddress,
           functionName: 'get_all_projects',
           args: []
        });
        const allProjs = JSON.parse(allProjsStr as string);
        const fetchedProjects = allProjs.map((proj: any) => ({
          id: parseInt(proj.id), 
          targetUrl: proj.target_url || proj.targetUrl, 
          sponsor: proj.sponsor,
          poolBalance: (parseInt(proj.pool_balance || "0") / 1e18).toFixed(2),
          status: proj.status || "ACTIVE"
        }));
        setProjects(fetchedProjects.reverse());
      } catch (e) {
        console.error("Failed to fetch all projects", e);
      }

      try {
        const allAudsStr = await readClient.readContract({
           address: contractAddress,
           functionName: 'get_all_audits',
           args: []
        });
        const allAudits = JSON.parse(allAudsStr as string);
        const fetchedAudits = allAudits.map((audit: any) => ({
          id: parseInt(audit.id), 
          projectId: parseInt(audit.project_id || audit.projectId || "0"),
          targetUrl: audit.target_url || audit.targetUrl, 
          status: audit.status, 
          payoutStatus: audit.payout_status || audit.payoutStatus || audit.payout_status, 
          analysis: audit.analysis,
          report: audit.report,
          startLine: audit.start_line,
          endLine: audit.end_line,
          severity: audit.severity || "NONE"
        }));
        setAudits(fetchedAudits.reverse());
      } catch (e) {
        console.error("Failed to fetch all audits", e);
      }

      try {
        const lbStr = await readClient.readContract({
           address: contractAddress,
           functionName: 'get_leaderboard',
           args: []
        });
        const lb = JSON.parse(lbStr as string);
        setLeaderboard(lb);
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
      }
      
      // Update balance automatically to reflect payouts
      if (account) {
        updateBalance(account);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  }, [readClient, contractAddress, account]);

  useEffect(() => {
    if (readClient && contractAddress) {
      fetchData();
      // Polling every 60 seconds instead of 15s to prevent GenLayer RPC rate limiting
      const interval = setInterval(() => fetchData(), 60000);
      return () => clearInterval(interval);
    }
  }, [readClient, contractAddress, fetchData]);

  const connectWallet = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = (window as any).ethereum;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        setAccount(address);
        updateBalance(address);
        
        const wc = createClient({
          chain: studionet,
          account: address,
          provider: provider,
        });
        setWriteClient(wc);
      } catch (err) {
        console.error("Failed to connect wallet", err);
      }
    } else {
      alert("Please install a Web3 wallet like MetaMask.");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance(null);
    setWriteClient(null);
  };

  const handleRegisterProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !writeClient) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setIsRegistering(true);
    try {
      const fundWei = BigInt(parseFloat(fundAmount) * 1e18);
      
      // Fetch and hash content to bind to immutable artifact
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch source code from URL");
      const source = await response.text();
      const encoder = new TextEncoder();
      const data = encoder.encode(source);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await writeClient.writeContract({
        address: contractAddress,
        functionName: 'register_project',
        args: [url, contentHash],
        value: fundWei,
      });
      setUrl('');
      setTimeout(() => {
        fetchData();
        updateBalance(account);
      }, 2000);
    } catch (error: any) {
      console.error(error);
      alert(`Error registering project:\n\n${error?.message || JSON.stringify(error) || String(error)}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const openAuditModal = (projectId: number) => {
    if (!account || !writeClient) {
      alert("Please connect your wallet first.");
      return;
    }
    setSelectedAuditProjectId(projectId);
    setAuditReport("");
    setAuditStartLine("");
    setAuditEndLine("");
    setShowAuditModal(true);
  };

  const submitAuditModal = async () => {
    if (selectedAuditProjectId === null || !writeClient) return;

    if (!auditReport || auditReport.trim() === "") {
        alert("A vulnerability report is required.");
        return;
    }

    const startLine = parseInt(auditStartLine);
    const endLine = parseInt(auditEndLine);

    if (isNaN(startLine) || isNaN(endLine) || startLine < 1 || endLine < startLine) {
        alert("Invalid line numbers. Start line must be >= 1 and End line must be >= Start line.");
        return;
    }

    if (endLine - startLine > 100) {
        alert("Maximum bounded slice is 100 lines. Please narrow your report window.");
        return;
    }

    setIsAuditingId(selectedAuditProjectId);
    setShowAuditModal(false);
    
    try {
      const fullReport = `[CLAIMED SEVERITY: ${claimedSeverity}]\n${auditReport.trim()}`;
      await writeClient.writeContract({
        address: contractAddress,
        functionName: 'submit_audit',
        args: [selectedAuditProjectId, fullReport, startLine, endLine],
        value: BigInt("100000000000000000"), // 0.1 GEN stake
      });
      alert("Audit request submitted successfully! Find it in the active audits list to execute.");
      setTimeout(() => {
        fetchData();
        if (account) updateBalance(account);
      }, 2000);
    } catch (error: any) {
      console.error(error);
      alert(`Error submitting audit:\n\n${error?.message || JSON.stringify(error) || String(error)}`);
    } finally {
      setIsAuditingId(null);
      setSelectedAuditProjectId(null);
    }
  };

  const handleTopUpPool = async () => {
    if (!account || !writeClient || topUpProjectId === null) {
      alert("Please connect your wallet first.");
      return;
    }
    const amountFloat = parseFloat(topUpAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      alert("Please enter a valid GEN amount.");
      return;
    }
    setIsToppingUp(true);
    try {
      const valWei = BigInt(Math.floor(amountFloat * 1e18));
      await writeClient.writeContract({
        address: contractAddress,
        functionName: 'top_up_pool',
        args: [topUpProjectId],
        value: valWei,
      });
      alert(`Successfully added ${topUpAmount} GEN to Project #${topUpProjectId} bounty pool!`);
      setTopUpProjectId(null);
      setTimeout(() => {
        fetchData();
        if (account) updateBalance(account);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      alert(`Error topping up pool:\n\n${err?.message || String(err)}`);
    } finally {
      setIsToppingUp(false);
    }
  };

  const handleExecute = async (id: number) => {
    if (!writeClient || !contractAddress) {
        alert("Please connect wallet first");
        return;
    }
    try {
      await writeClient.writeContract({
        address: contractAddress,
        functionName: 'execute_audit',
        args: [id],
        value: BigInt(0),
      });
      alert("AI Evaluation triggered! Waiting for consensus...");
    } catch (error: any) {
      console.error(error);
      alert(`Error triggering AI evaluation:\n\n${error?.message || JSON.stringify(error) || String(error)}`);
    }
  };

  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="dashboard-layout">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand" style={{ fontSize: '0.9rem' }}>
          <div className="brand-icon" style={{ width: '16px', height: '16px' }}></div>
          SENTINELPY <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '400' }}>// BUG BOUNTY MARKETPLACE</span>
        </div>
        
        <div className="nav-links">
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</div>
          <div className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>Leaderboard</div>
          <div className={`nav-item ${activeTab === 'threats' ? 'active' : ''}`} onClick={() => setActiveTab('threats')}>Threat Intelligence</div>
          <div className={`nav-item ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}>Verified Projects</div>
          <div className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>Audit Logs</div>
        </div>
        
        <div>
          {account ? (
            <div className="wallet-box">
              <div className="wallet-balance">
                <span className="status-dot active"></span>
                {balance} GEN
              </div>
              <div className="wallet-address font-mono">
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </div>
              <button 
                className="cyber-button secondary" 
                style={{ padding: '0.2rem 0.4rem', width: 'auto', fontSize: '0.65rem' }}
                onClick={disconnectWallet}
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <button className="cyber-button" style={{ width: 'auto' }} onClick={connectWallet}>
              CONNECT WALLET
            </button>
          )}
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="main-content">
        {activeTab === 'overview' && (
          <>
            {/* Top KPI Cards */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="cyber-panel" style={{ padding: '1rem' }}>
                <div className="panel-title" style={{ marginBottom: '0.5rem' }}>SPONSORED PROJECTS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{projects.length}</div>
              </div>
              <div className="cyber-panel purple-accent" style={{ padding: '1rem' }}>
                <div className="panel-title" style={{ marginBottom: '0.5rem' }}>THREATS DETECTED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{audits.filter(a => a.status?.toUpperCase() === 'MALICIOUS').length} <span className="text-danger" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>Critical</span></div>
              </div>
              <div className="cyber-panel" style={{ padding: '1rem' }}>
                <div className="panel-title" style={{ marginBottom: '0.5rem' }}>NETWORK CONSENSUS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>Active <span className="text-success" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>GenVM</span></div>
              </div>
              <div className="cyber-panel" style={{ padding: '1rem' }}>
                <div className="panel-title" style={{ marginBottom: '0.5rem' }}>TOTAL BOUNTY POOL</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {projects.reduce((acc, p) => acc + parseFloat(p.poolBalance), 0).toFixed(2)} <span className="text-muted" style={{ fontSize: '0.8rem' }}>GEN</span>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              
              {/* Left Column: Submission Form */}
              <section>
                <div className="cyber-panel purple-accent">
                  <div className="panel-header">
                    <div className="panel-title text-purple">SPONSOR A PROJECT</div>
                  </div>
                  <div className="panel-body">
                    <form onSubmit={handleRegisterProject}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        TARGET URL IDENTIFIER (GITHUB RAW / IPFS)
                      </label>
                      <input 
                        type="url" 
                        className="cyber-input" 
                        placeholder="https://raw.githubusercontent.com/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required 
                      />
                      
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        INITIAL BOUNTY POOL (GEN)
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0.1"
                        className="cyber-input" 
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        required 
                      />
                      
                      <button 
                        type="submit" 
                        className="cyber-button" 
                        disabled={isRegistering || !account}
                        style={{ opacity: !account ? 0.5 : 1, cursor: !account ? 'not-allowed' : 'pointer' }}
                      >
                        {!account 
                          ? 'CONNECT WALLET TO SPONSOR' 
                          : (isRegistering ? 'REGISTERING...' : `REGISTER & DEPOSIT ${fundAmount} GEN`)
                        }
                      </button>
                      <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        Funds are locked in escrow for successful bug hunters.
                      </div>
                    </form>
                  </div>
                </div>
              </section>

              {/* Right Column: Feed / Contracts list */}
              <section>
                <div className="cyber-panel">
                  <div className="panel-header">
                    <div className="panel-title text-cyan">ACTIVE BUG BOUNTIES</div>
                    <div className="text-cyan font-mono" style={{ fontSize: '0.75rem' }}>{projects.length} Projects Indexed</div>
                  </div>
                  <div className="panel-body" style={{ padding: 0 }}>
                    {projects.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No sponsored projects available for audit.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ padding: '0.75rem 1rem' }}>Project Target & Status</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Sponsor</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Pool & Tiered Bounties</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projects.map((proj, i) => (
                              <tr key={proj.id} className="proposal-main-row" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                <td className="table-cell">
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span className="text-muted">❖</span>
                                      <span style={{ wordBreak: 'break-all', maxWidth: '100%', display: 'inline-block' }} className="font-mono">{proj.targetUrl}</span>
                                    </div>
                                    <div>
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        padding: '0.15rem 0.4rem', 
                                        borderRadius: '3px',
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                        background: proj.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: proj.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)',
                                        border: `1px solid ${proj.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                                      }}>
                                        {proj.status}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell font-mono text-muted" style={{ fontSize: '0.7rem' }}>
                                  {proj.sponsor.slice(0,6)}...{proj.sponsor.slice(-4)}
                                </td>
                                <td className="table-cell">
                                  <div>
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{proj.poolBalance} GEN</span>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                      Crit: 2.0 | High: 1.0 | Med: 0.4 | Low: 0.1
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell">
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {proj.status === 'ACTIVE' && (
                                      <>
                                        <button 
                                          className="cyber-button" 
                                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', width: 'auto' }}
                                          onClick={() => openAuditModal(proj.id)}
                                          disabled={isAuditingId === proj.id || !account}
                                        >
                                          {isAuditingId === proj.id ? '...' : 'Hunt Bugs'}
                                        </button>
                                        <button 
                                          className="cyber-button secondary" 
                                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', width: 'auto' }}
                                          onClick={() => {
                                            setTopUpProjectId(proj.id);
                                            setTopUpAmount('2.0');
                                          }}
                                          disabled={!account}
                                          title="Top Up Bounty Pool"
                                        >
                                          + Top Up
                                        </button>
                                      </>
                                    )}
                                    {proj.status !== 'ACTIVE' && (
                                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>Program Closed</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
            
            {/* Active Audits Section */}
            <div className="cyber-panel" style={{ marginTop: '1.5rem' }}>
                  <div className="panel-header">
                    <div className="panel-title text-muted">PENDING & COMPLETED AUDITS</div>
                    <div className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>{audits.length} Audits Indexed</div>
                  </div>
                  <div className="panel-body" style={{ padding: 0 }}>
                    {audits.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No audits have been submitted yet.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ padding: '0.75rem 1rem' }}>Contract Target</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Risk Level</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Escrow Status</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {audits.map((audit, i) => (
                              <ProposalCard key={audit.id} audit={audit} index={i} onExecute={() => handleExecute(audit.id)} account={account} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
          </>
        )}
        
        {activeTab === 'leaderboard' && (
          <div className="cyber-panel" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="panel-header">
              <div className="panel-title text-cyan">WHITE-HAT RESEARCHER LEADERBOARD</div>
              <div className="text-cyan font-mono" style={{ fontSize: '0.75rem' }}>{leaderboard.length} Verified Researchers</div>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Rank & Researcher</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Reputation Tier</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total Earned</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Exploits Verified (Crit / High / Med / Low)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>False Alarms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((res, i) => {
                      const earnedGen = (res.total_earned_wei / 1e18).toFixed(2);
                      const rankTier = parseFloat(earnedGen) >= 2.0 
                        ? { title: 'Principal Auditor', color: '#ef4444' }
                        : parseFloat(earnedGen) >= 1.0 
                        ? { title: 'Senior Hunter', color: '#f97316' }
                        : parseFloat(earnedGen) >= 0.1 
                        ? { title: 'Verified Researcher', color: 'var(--primary-cyan)' }
                        : { title: 'Security Scout', color: 'var(--text-muted)' };

                      return (
                        <tr key={res.address} className="proposal-main-row" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td className="table-cell">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ 
                                fontWeight: 700, 
                                color: i === 0 ? '#fbbf24' : i === 1 ? '#e2e8f0' : i === 2 ? '#b45309' : 'var(--text-muted)',
                                fontSize: '0.85rem' 
                              }}>
                                #{i + 1}
                              </span>
                              <span className="font-mono" style={{ fontSize: '0.75rem' }}>
                                {res.address.slice(0, 8)}...{res.address.slice(-6)}
                              </span>
                              {account && res.address.toLowerCase() === account.toLowerCase() && (
                                <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--primary-cyan)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>YOU</span>
                              )}
                            </div>
                          </td>
                          <td className="table-cell">
                            <span style={{ 
                              color: rankTier.color, 
                              border: `1px solid ${rankTier.color}40`, 
                              padding: '0.2rem 0.4rem', 
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              textTransform: 'uppercase'
                            }}>
                              {rankTier.title}
                            </span>
                          </td>
                          <td className="table-cell font-mono" style={{ color: 'var(--success)', fontWeight: 600 }}>
                            {earnedGen} GEN
                          </td>
                          <td className="table-cell font-mono" style={{ fontSize: '0.75rem' }}>
                            <span style={{ color: '#ef4444', marginRight: '0.4rem' }}>{res.critical_count} Crit</span>
                            <span style={{ color: '#f97316', marginRight: '0.4rem' }}>{res.high_count} High</span>
                            <span style={{ color: '#eab308', marginRight: '0.4rem' }}>{res.medium_count} Med</span>
                            <span style={{ color: 'var(--primary-cyan)' }}>{res.low_count} Low</span>
                          </td>
                          <td className="table-cell font-mono text-muted" style={{ fontSize: '0.75rem' }}>
                            {res.slashed_count} slashed
                          </td>
                        </tr>
                      );
                    })}
                    {leaderboard.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No bounty payouts recorded yet. Be the first to claim a bounty!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'threats' && (
          <div className="cyber-panel purple-accent" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="panel-header">
              <div className="panel-title text-purple">THREAT INTELLIGENCE DATABASE</div>
              <div className="text-purple font-mono" style={{ fontSize: '0.75rem' }}>{audits.filter(a => a.status?.toUpperCase() === 'MALICIOUS').length} Threats Isolated</div>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Malicious Target</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Risk Level</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Escrow Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.filter(a => a.status?.toUpperCase() === 'MALICIOUS').map((audit, i) => (
                      <ProposalCard key={audit.id} audit={audit} index={i} onExecute={() => handleExecute(audit.id)} account={account} />
                    ))}
                    {audits.filter(a => a.status?.toUpperCase() === 'MALICIOUS').length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No threats detected in the registry.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="cyber-panel" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="panel-header">
              <div className="panel-title text-cyan">VERIFIED SMART CONTRACTS</div>
              <div className="text-cyan font-mono" style={{ fontSize: '0.75rem' }}>{audits.filter(a => a.status?.toUpperCase() === 'SECURE').length} Verified Safe</div>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Secure Target</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Risk Level</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Escrow Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.filter(a => a.status?.toUpperCase() === 'SECURE').map((audit, i) => (
                      <ProposalCard key={audit.id} audit={audit} index={i} onExecute={() => handleExecute(audit.id)} account={account} />
                    ))}
                    {audits.filter(a => a.status?.toUpperCase() === 'SECURE').length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No verified contracts in the registry.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="cyber-panel" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="panel-header">
              <div className="panel-title text-muted">GLOBAL AUDIT LEDGER</div>
              <div className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>{audits.length} Total Records</div>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Transaction / Target</th>
                      <th style={{ padding: '0.75rem 1rem' }}>AI Adjudication</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Escrow Resolution</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((audit, i) => (
                      <ProposalCard key={audit.id} audit={audit} index={i} onExecute={() => handleExecute(audit.id)} account={account} />
                    ))}
                    {audits.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Ledger is empty.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      
        {/* Audit Submission Modal */}
        {showAuditModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="cyber-panel" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', background: '#0a0a0a', border: '1px solid var(--primary-cyan)', borderRadius: '8px' }}>
              <div className="panel-title text-cyan" style={{ marginBottom: '1rem' }}>SUBMIT VULNERABILITY REPORT</div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Claimed Severity Tier</label>
                <select 
                  className="cyber-input" 
                  style={{ width: '100%', background: '#111', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={claimedSeverity}
                  onChange={(e) => setClaimedSeverity(e.target.value)}
                >
                  <option value="CRITICAL">CRITICAL — Protocol Insolvency / Direct Drain (2.0 GEN)</option>
                  <option value="HIGH">HIGH — Severe Exploit / Unauthorized State Change (1.0 GEN)</option>
                  <option value="MEDIUM">MEDIUM — Conditional Logic / DoS / Edge Exploit (0.4 GEN)</option>
                  <option value="LOW">LOW — Minor Flaw / Informational (0.1 GEN)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Specific Vulnerability Report (What is the bug, how does it work, where is it?)</label>
                <textarea 
                  className="cyber-input"
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                  value={auditReport}
                  onChange={(e) => setAuditReport(e.target.value)}
                  placeholder="Describe the vulnerability in detail..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Start Line</label>
                  <input 
                    type="number" 
                    className="cyber-input" 
                    style={{ width: '100%' }}
                    value={auditStartLine}
                    onChange={(e) => setAuditStartLine(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>End Line (Max 100 span)</label>
                  <input 
                    type="number" 
                    className="cyber-input" 
                    style={{ width: '100%' }}
                    value={auditEndLine}
                    onChange={(e) => setAuditEndLine(e.target.value)}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="cyber-button" style={{ background: 'transparent', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }} onClick={() => setShowAuditModal(false)}>Cancel</button>
                <button className="cyber-button" onClick={submitAuditModal}>Submit & Stake 0.1 GEN</button>
              </div>
            </div>
          </div>
        )}

        {/* Top Up Pool Modal */}
        {topUpProjectId !== null && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="cyber-panel" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: '#0a0a0a', border: '1px solid var(--primary-cyan)', borderRadius: '8px' }}>
              <div className="panel-title text-cyan" style={{ marginBottom: '1rem' }}>TOP UP BOUNTY POOL (PROJECT #{topUpProjectId})</div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Deposit Additional GEN (for active payouts)</label>
                <input 
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="cyber-input" 
                  style={{ width: '100%' }}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="e.g. 2.0"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="cyber-button" style={{ background: 'transparent', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }} onClick={() => setTopUpProjectId(null)}>Cancel</button>
                <button className="cyber-button" disabled={isToppingUp} onClick={handleTopUpPool}>
                  {isToppingUp ? 'Depositing...' : `Deposit ${topUpAmount} GEN`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
