'use client';

import { useState } from 'react';
import ProposalCard from '../components/ProposalCard';
import { createClient } from 'genlayer-js';
// In a real implementation we would configure viem and genlayer client here

export default function Home() {
  const [url, setUrl] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  
  // Mock data for display purposes
  const [audits, setAudits] = useState([
    {
      id: 1,
      targetUrl: 'https://suspicious-dex.io',
      status: 'MALICIOUS',
      payoutStatus: 'BURNED',
      analysis: 'The provided smart contract contains a hidden backdoor that allows the owner to drain funds without authorization. The external link also points to a known phishing domain. 1 GEN deposit burned.'
    }
  ]);

  const connectWallet = () => {
    // Mock wallet connection
    setWalletConnected(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setIsSubmitting(true);
    
    // Mocking the contract submission & evaluation wait time
    setTimeout(() => {
      setAudits([
        {
          id: Date.now(),
          targetUrl: url,
          status: 'Pending',
          payoutStatus: 'Pending',
          analysis: 'Awaiting GenLayer AI Consensus...'
        },
        ...audits
      ]);
      setIsSubmitting(false);
      setUrl('');
      setCode('');
      
      // Mock evaluation result after some time
      setTimeout(() => {
        setAudits(prev => prev.map((a, i) => i === 0 ? {
          ...a,
          status: 'SECURE',
          payoutStatus: 'REWARDED',
          analysis: 'No malicious code patterns detected. The URL appears legitimate based on cross-referenced public directories. 1 GEN deposit returned + 0.5 GEN Reward.'
        } : a));
      }, 5000);
      
    }, 1500);
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo animate-float">🛡️ Sentinelpy</div>
        <button 
          className="glass-button" 
          style={{ width: 'auto' }}
          onClick={connectWallet}
        >
          {walletConnected ? '0xAbC...1234' : 'Connect Wallet'}
        </button>
      </header>

      <main className="grid">
        <section>
          <div className="glass-card animate-slide-in">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Submit for Audit</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Submit a project URL and smart contract code. Staking 1 GEN is required. If the AI determines your submission is valid and secure, you earn rewards. Malicious or spam submissions will have their stake burned.
            </p>
            
            <form onSubmit={handleSubmit}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Target URL</label>
                <input 
                  type="url" 
                  className="glass-input" 
                  placeholder="https://github.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Code Snippet</label>
                <textarea 
                  className="glass-input" 
                  placeholder="Paste code here..."
                  rows={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                className="glass-button" 
                disabled={isSubmitting}
                style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {isSubmitting ? 'Staking GEN & Submitting...' : 'Stake 1 GEN & Submit Audit'}
              </button>
            </form>
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: '1.5rem', paddingLeft: '1rem' }}>Recent Audits</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {audits.map((audit, i) => (
              <ProposalCard key={audit.id} audit={audit} index={i} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
