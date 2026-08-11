interface Audit {
  id: number;
  targetUrl: string;
  status: string;
  payoutStatus: string;
  analysis: string;
}

export default function ProposalCard({ audit, index, onExecute, account }: { audit: Audit, index: number, onExecute?: () => void, account?: string | null }) {
  const getStatusClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SECURE': return 'badge-secure';
      case 'MALICIOUS': return 'badge-malicious';
      default: return 'badge-pending';
    }
  };

  const getPayoutClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'REWARDED': return 'text-primary';
      case 'BURNED': return 'text-muted';
      default: return 'text-muted';
    }
  };

  return (
    <div 
      className="cyber-card animate-slide-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 className="font-mono text-primary" style={{ fontSize: '1rem', wordBreak: 'break-all', paddingRight: '1rem' }}>
          &gt; TARGET: {audit.targetUrl}
        </h3>
        <span className={`badge ${getStatusClass(audit.status)}`}>
          {audit.status}
        </span>
      </div>
      
      <div className="terminal-block" style={{ marginBottom: '1rem' }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>&gt; GenVM_Analysis_Output:</p>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{audit.analysis}</p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%' }}>
          <span className="font-mono text-muted">ESCROW_SETTLEMENT:</span>
          <span className={`font-mono ${getPayoutClass(audit.payoutStatus)}`} style={{ fontWeight: '600' }}>
            [{audit.payoutStatus === 'Pending' ? 'AWAITING_CONSENSUS' : audit.payoutStatus}]
          </span>
          
          {audit.status === 'Pending' && account && onExecute && (
            <button 
              className="cyber-button" 
              style={{ marginLeft: 'auto', padding: '0.4rem 1rem', fontSize: '0.75rem', width: 'auto' }}
              onClick={onExecute}
            >
              INITIALIZE_CONSENSUS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
