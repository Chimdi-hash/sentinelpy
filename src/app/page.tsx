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

  return (
    <>
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      
      <div className="container animate-slide-up">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">❖</span> Sentinelpy
          </div>
          
          <div className="wallet-info">
            {account ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className="balance">{balance} GEN</span>
                  <span className="address">{`${account.slice(0, 6)}...${account.slice(-4)}`}</span>
                </div>
                <button className="btn btn-danger" onClick={disconnectWallet}>Disconnect</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        <main>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
              AI-Governed Security Intelligence
            </h1>
            <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.6' }}>
              Submit smart contracts and target domains to the GenVM Intelligent Contract. 
              Audits are evaluated for malicious patterns via distributed AI consensus.
            </p>
          </div>

          <section style={{ maxWidth: '800px', margin: '0 auto 4rem auto' }}>
            <div className="glass-panel">
              <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Initiate New Audit
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Target URL</label>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://github.com/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Payload / Source Code</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Paste the contract code to be analyzed..."
                    rows={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Staking 1 GEN & Submitting...' : 'Stake 1 GEN & Submit Audit'}
                </button>
              </form>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem' }}>Threat Intelligence Feed</h2>
              <div className="badge badge-secure">{audits.length} Audits Indexed</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              {audits.length === 0 && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                  No audits found on the network.
                </div>
              )}
              {audits.map((audit, i) => (
                <ProposalCard key={audit.id} audit={audit} index={i} onExecute={() => handleExecute(audit.id)} account={account} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
