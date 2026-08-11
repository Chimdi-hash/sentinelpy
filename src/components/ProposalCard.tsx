export interface Audit {
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
      className="glass-panel animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', wordBreak: 'break-all', paddingRight: '1rem', fontWeight: '500' }}>
          Target: <span className="text-primary">{audit.targetUrl}</span>
        </h3>
        <span className={`badge ${getStatusClass(audit.status)}`}>
          {audit.status}
        </span>
      </div>
      
      <div style={{ 
        background: 'rgba(0, 0, 0, 0.3)', 
        borderRadius: '12px', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        border: '1px solid var(--glass-border)'
      }}>
        <p style={{ marginBottom: '0.8rem', fontWeight: '600', color: 'var(--primary)', letterSpacing: '0.5px' }}>GenVM Analysis Output</p>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-muted)' }}>{audit.analysis}</p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Escrow Settlement:</span>
          <span className={`${getPayoutClass(audit.payoutStatus)}`} style={{ fontWeight: '600', fontSize: '1rem' }}>
            {audit.payoutStatus === 'Pending' ? 'Awaiting Consensus' : audit.payoutStatus}
          </span>
          
          {audit.status === 'Pending' && account && onExecute && (
            <button 
              className="btn btn-primary" 
              style={{ marginLeft: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
              onClick={onExecute}
            >
              Initialize Consensus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
