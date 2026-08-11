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
  const [audits, setAudits] = useState<Audit[]>([]);
  
  const [readClient, setReadClient] = useState<any>(null);
  const [writeClient, setWriteClient] = useState<any>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xC458348a760fd33D78AD1b73931C7ff6bb91cb82";

  useEffect(() => {
    const rc = createClient({
      chain: studionet,
    });
    setReadClient(rc);
  }, []);

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
          break; // Stop when index doesn't exist
        }
      }
      setAudits(fetched.reverse()); // Show newest first
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
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = (window as any).ethereum;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        setAccount(address);
        
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
      setTimeout(fetchAudits, 2000);
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
    <div className="container">
      <div className="scan-line"></div>
      
      <header className="header">
        <div className="logo animate-pulse-glow">
          <span style={{ color: 'var(--primary)' }}>[</span> Sentinelpy <span style={{ color: 'var(--primary)' }}>]</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="font-mono text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: account ? 'var(--primary)' : 'var(--danger)' }}></div>
            StudioNet: {account ? 'CONNECTED' : 'OFFLINE'}
          </div>
          <button 
            className="cyber-button" 
            style={{ width: 'auto', padding: '8px 16px' }}
            onClick={connectWallet}
          >
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'INIT CONNECTION'}
          </button>
        </div>
      </header>

      <main>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>AI-Governed Security Intelligence</h1>
          <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Submit smart contracts and target domains to the GenVM Intelligent Contract. 
            Audits are evaluated for malicious patterns via distributed AI consensus. Staking 1 GEN is required.
          </p>
        </div>

        <section style={{ maxWidth: '800px', margin: '0 auto 4rem auto' }}>
          <div className="cyber-card">
            <h2 className="font-mono text-primary" style={{ marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              &gt; SUBMIT_NEW_AUDIT_TASK
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div>
                <label className="font-mono text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>TARGET_URL</label>
                <input 
                  type="url" 
                  className="cyber-input" 
                  placeholder="https://github.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required 
                />
              </div>
              
              <div>
                <label className="font-mono text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>PAYLOAD_SOURCE_CODE</label>
                <textarea 
                  className="cyber-input" 
                  placeholder="// Paste contract code to be analyzed..."
                  rows={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                className="cyber-button" 
                disabled={isSubmitting}
                style={{ marginTop: '0.5rem' }}
              >
                {isSubmitting ? 'EXECUTING STAKE & SUBMIT...' : 'STAKE 1 GEN & INITIATE SCAN'}
              </button>
            </form>
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="font-mono" style={{ fontSize: '1.3rem' }}>Threat Intelligence Feed</h2>
            <div className="font-mono text-primary" style={{ fontSize: '0.8rem' }}>{audits.length} RECORDS FOUND</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {audits.length === 0 && (
              <div className="terminal-block" style={{ textAlign: 'center', padding: '3rem' }}>
                &gt; NO_AUDITS_FOUND_ON_NETWORK
              </div>
            )}
            {audits.map((audit, i) => (
              <ProposalCard key={audit.id} audit={audit} index={i} onExecute={() => handleExecute(audit.id)} account={account} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
