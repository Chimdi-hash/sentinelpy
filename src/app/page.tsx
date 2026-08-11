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
      <header className="header">
        <div className="logo animate-float">🛡️ Sentinelpy</div>
        <button 
          className="glass-button" 
          style={{ width: 'auto' }}
          onClick={connectWallet}
        >
          {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
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
            {audits.length === 0 && <p style={{ paddingLeft: '1rem', color: 'var(--text-muted)' }}>No audits found on network.</p>}
            {audits.map((audit, i) => (
              <ProposalCard key={audit.id} audit={audit} index={i} onExecute={() => handleExecute(audit.id)} account={account} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
