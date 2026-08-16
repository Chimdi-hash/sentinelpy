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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [readClient, setReadClient] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [writeClient, setWriteClient] = useState<any>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x6669E1583F8331083B5ECB17b438FEaB6C683E9C";

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
      const fetchedProjects = [];
      let p = 0;
      while (true) {
        try {
          const projStr = await readClient.readContract({
             address: contractAddress,
             functionName: 'get_project',
             args: [p]
          });
          const proj = JSON.parse(projStr as string);
          fetchedProjects.push({ 
            id: p, 
            targetUrl: proj.target_url || proj.targetUrl, 
            sponsor: proj.sponsor,
            poolBalance: (parseInt(proj.pool_balance || "0") / 1e18).toFixed(2)
          });
          p++;
        } catch (e) {
          break;
        }
      }
      setProjects(fetchedProjects.reverse());

      // Fetch Audits
      const fetchedAudits = [];
      let i = 0;
      while (true) {
        try {
          const auditStr = await readClient.readContract({
             address: contractAddress,
             functionName: 'get_audit',
             args: [i]
          });
          const audit = JSON.parse(auditStr as string);
          fetchedAudits.push({ 
            id: i, 
            projectId: parseInt(audit.project_id || audit.projectId || "0"),
            targetUrl: audit.target_url || audit.targetUrl, 
            status: audit.status, 
            payoutStatus: audit.payout_status || audit.payoutStatus || audit.payout_status, 
            analysis: audit.analysis 
          });
          i++;
        } catch (e) {
          break;
        }
      }
      setAudits(fetchedAudits.reverse());
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  }, [readClient, contractAddress]);

  useEffect(() => {
    if (readClient && contractAddress) {
      fetchData();
      const interval = setInterval(() => fetchData(), 15000);
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
          transport: custom(provider),
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
      await writeClient.writeContract({
        address: contractAddress,
        functionName: 'register_project',
        args: [url],
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

  const handleSubmitAudit = async (projectId: number) => {
    if (!account || !writeClient) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setIsAuditingId(projectId);
    try {
      await writeClient.writeContract({
        address: contractAddress,
        functionName: 'submit_audit',
        args: [projectId],
        value: BigInt("100000000000000000"), // 0.1 GEN stake
      });
      alert("Audit request submitted successfully! Find it in the active audits list to execute.");
      setTimeout(() => {
        fetchData();
        updateBalance(account);
      }, 2000);
    } catch (error: any) {
      console.error(error);
      alert(`Error submitting audit:\n\n${error?.message || JSON.stringify(error) || String(error)}`);
    } finally {
      setIsAuditingId(null);
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
                              <th style={{ padding: '0.75rem 1rem' }}>Project Target</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Sponsor</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Bounty Pool</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projects.map((proj, i) => (
                              <tr key={proj.id} className="proposal-main-row" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                <td className="table-cell">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="text-muted">❖</span>
                                    <span style={{ wordBreak: 'break-all', maxWidth: '100%', display: 'inline-block' }} className="font-mono">{proj.targetUrl}</span>
                                  </div>
                                </td>
                                <td className="table-cell font-mono text-muted" style={{ fontSize: '0.7rem' }}>
                                  {proj.sponsor.slice(0,6)}...{proj.sponsor.slice(-4)}
                                </td>
                                <td className="table-cell">
                                  <span style={{ color: 'var(--success)' }}>{proj.poolBalance} GEN</span>
                                </td>
                                <td className="table-cell">
                                  <button 
                                    className="cyber-button" 
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', width: 'auto' }}
                                    onClick={() => handleSubmitAudit(proj.id)}
                                    disabled={isAuditingId === proj.id || !account}
                                  >
                                    {isAuditingId === proj.id ? '...' : 'Hunt Bugs (Stake 0.1)'}
                                  </button>
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
      </main>
    </div>
  );
}
