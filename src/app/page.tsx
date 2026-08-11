"use client";

import { useState, useEffect, useCallback } from 'react';
import ProposalCard from '../components/ProposalCard';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export interface Audit {
  id: number;
  targetUrl: string;
  status: string;
  payoutStatus: string;
  analysis: string;
  target_url?: string;
  payout_status?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  
  const [audits, setAudits] = useState<Audit[]>([]);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [readClient, setReadClient] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [writeClient, setWriteClient] = useState<any>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xC458348a760fd33D78AD1b73931C7ff6bb91cb82";

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

  const fetchAudits = useCallback(async () => {
    if (!readClient || !contractAddress) return;
    try {
      const fetched = [];
      let i = 0;
      while (true) {
        try {
          const auditStr = await readClient.readContract({
             address: contractAddress,
             functionName: 'get_audit',
             args: [i]
          });
          const audit = JSON.parse(auditStr as string);
          fetched.push({ 
            id: i, 
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
      setAudits(fetched.reverse());
    } catch (err) {
      console.error("Failed to fetch audits", err);
    }
  }, [readClient, contractAddress]);

  useEffect(() => {
    if (readClient && contractAddress) {
      fetchAudits();
      const interval = setInterval(() => fetchAudits(), 5000);
      return () => clearInterval(interval);
    }
  }, [readClient, contractAddress, fetchAudits]);

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
        await wc.connect("studionet");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !writeClient) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await writeClient.writeContract({
        address: contractAddress,
        functionName: 'submit_audit',
        args: [url, code],
        value: BigInt("1000000000000000000"), // 1 GEN
      });
      setUrl('');
      setCode('');
      setTimeout(() => {
        fetchAudits();
        updateBalance(account);
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Error submitting audit.");
    } finally {
      setIsSubmitting(false);
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
    } catch (error) {
      console.error(error);
      alert("Error triggering AI evaluation.");
    }
  };

  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="dashboard-layout">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand" style={{ fontSize: '0.9rem' }}>
          <div className="brand-icon" style={{ width: '16px', height: '16px' }}></div>
          SENTINELPY <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '400' }}>// AI-GOVERNED AUDIT DASHBOARD</span>
        </div>
        
        <div className="nav-links">
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</div>
          <div className={`nav-item ${activeTab === 'threats' ? 'active' : ''}`} onClick={() => setActiveTab('threats')}>Threat Intelligence</div>
          <div className={`nav-item ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}>Smart Contracts</div>
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
                <div className="panel-title" style={{ marginBottom: '0.5rem' }}>TOTAL AUDITS PROCESSED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{audits.length}</div>
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
                <div className="panel-title" style={{ marginBottom: '0.5rem' }}>TOTAL GEN STAKED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{audits.length}.0 <span className="text-muted" style={{ fontSize: '0.8rem' }}>GEN</span></div>
              </div>
            </div>

            <div className="dashboard-grid">
              
              {/* Left Column: Submission Form */}
              <section>
                <div className="cyber-panel purple-accent">
                  <div className="panel-header">
                    <div className="panel-title text-purple">INITIATE THREAT SCAN</div>
                  </div>
                  <div className="panel-body">
                    <form onSubmit={handleSubmit}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        TARGET URL IDENTIFIER
                      </label>
                      <input 
                        type="url" 
                        className="cyber-input" 
                        placeholder="https://github.com/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required 
                      />
                      
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        PAYLOAD / SOURCE CODE
                      </label>
                      <textarea 
                        className="cyber-input" 
                        placeholder="Paste contract code to be analyzed..."
                        rows={8}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                      ></textarea>
                      
                      <button 
                    type="submit" 
                    className="cyber-button" 
                    disabled={isSubmitting || !account}
                    style={{ opacity: !account ? 0.5 : 1, cursor: !account ? 'not-allowed' : 'pointer' }}
                  >
                    {!account 
                      ? 'CONNECT WALLET TO SCAN' 
                      : (isSubmitting ? 'INITIALIZING SCAN...' : 'STAKE 1 GEN & RUN SECURITY AUDIT')
                    }
                  </button>
                      <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        Cost: 1.00 GEN • AI Consensus Required
                      </div>
                    </form>
                  </div>
                </div>
              </section>

              {/* Right Column: Feed / Contracts list */}
              <section>
                <div className="cyber-panel">
                  <div className="panel-header">
                    <div className="panel-title text-cyan">ACTIVE SMART CONTRACTS</div>
                    <div className="text-cyan font-mono" style={{ fontSize: '0.75rem' }}>{audits.length} Records Indexed</div>
                  </div>
                  <div className="panel-body" style={{ padding: 0 }}>
                    {audits.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No contracts actively monitored in this segment.
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
              </section>
            </div>
          </>
        )}
        
        {activeTab !== 'overview' && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: '32px', height: '32px', opacity: 0.5 }}></div>
            <div style={{ fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Module Initializing</div>
            <div style={{ fontSize: '0.75rem' }}>{activeTab} data stream is currently offline.</div>
          </div>
        )}
      </main>
    </div>
  );
}
