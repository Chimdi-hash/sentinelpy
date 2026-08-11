interface Audit {
  id: number;
  targetUrl: string;
  status: string;
  payoutStatus: string;
  analysis: string;
}

export default function ProposalCard({ audit, index, onExecute, account }: { audit: Audit, index: number, onExecute?: () => void, account?: string | null }) {
  const getStatusClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SECURE': return 'status-secure';
      case 'MALICIOUS': return 'status-malicious';
      default: return 'status-pending';
    }
  };

  const getPayoutClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'REWARDED': return 'payout-rewarded';
      case 'BURNED': return 'payout-burned';
      default: return '';
    }
  };

  return (
    <div 
      className="glass-card animate-slide-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', wordBreak: 'break-all', paddingRight: '1rem' }}>
          {audit.targetUrl}
        </h3>
        <span className={`status-badge ${getStatusClass(audit.status)}`}>
          {audit.status}
        </span>
      </div>
      
      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'white' }}>AI Analysis:</p>
        <p>{audit.analysis}</p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%' }}>
          <span style={{ color: 'var(--text-muted)' }}>Escrow Outcome:</span>
          <span className={getPayoutClass(audit.payoutStatus)}>
            {audit.payoutStatus === 'Pending' ? 'Awaiting consensus...' : audit.payoutStatus}
          </span>
          
          {audit.status === 'Pending' && account && onExecute && (
            <button 
              className="glass-button" 
              style={{ marginLeft: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              onClick={onExecute}
            >
              Trigger AI Consensus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
