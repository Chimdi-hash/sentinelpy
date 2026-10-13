import React from 'react';

export interface Audit {
  id: number;
  targetUrl: string;
  status: string;
  payoutStatus: string;
  analysis: string;
  report?: string;
  startLine?: number;
  endLine?: number;
  severity?: string;
}

export default function ProposalCard({ audit, index, onExecute, account }: { audit: Audit, index: number, onExecute?: () => void, account?: string | null }) {
  
  const isMalicious = audit.status?.toUpperCase() === 'MALICIOUS';
  const isSecure = audit.status?.toUpperCase() === 'SECURE';
  const isPending = audit.status === 'Pending';
  
  // Severity-based styling
  const severityUpper = (audit.severity || '').toUpperCase();
  let severityLabel = 'Analyzing';
  let severityColor = 'var(--text-muted)';
  let severityBorder = 'rgba(255, 255, 255, 0.2)';

  if (isPending) {
    severityLabel = 'Analyzing';
    severityColor = 'var(--warning)';
    severityBorder = 'rgba(234, 179, 8, 0.4)';
  } else if (isSecure) {
    severityLabel = 'SECURE (LOW)';
    severityColor = 'var(--success)';
    severityBorder = 'rgba(34, 197, 94, 0.4)';
  } else if (severityUpper === 'CRITICAL') {
    severityLabel = 'CRITICAL (2.0 GEN)';
    severityColor = '#ef4444';
    severityBorder = 'rgba(239, 68, 68, 0.6)';
  } else if (severityUpper === 'HIGH') {
    severityLabel = 'HIGH (1.0 GEN)';
    severityColor = '#f97316';
    severityBorder = 'rgba(249, 115, 22, 0.6)';
  } else if (severityUpper === 'MEDIUM') {
    severityLabel = 'MEDIUM (0.4 GEN)';
    severityColor = '#eab308';
    severityBorder = 'rgba(234, 179, 8, 0.6)';
  } else if (severityUpper === 'LOW') {
    severityLabel = 'LOW (0.1 GEN)';
    severityColor = 'var(--primary-cyan)';
    severityBorder = 'rgba(6, 182, 212, 0.6)';
  } else if (isMalicious) {
    severityLabel = 'VULNERABLE';
    severityColor = 'var(--danger)';
    severityBorder = 'rgba(239, 68, 68, 0.6)';
  }

  const getPayoutBadge = () => {
    if (audit.payoutStatus === 'Pending') return 'Awaiting Consensus';
    const status = audit.payoutStatus.toUpperCase();
    if (status === 'STAKE_SLASHED') return 'STAKE BURNED (0.1 GEN)';
    if (status === 'BOUNTY_PAID') {
      if (severityUpper === 'CRITICAL') return 'CRITICAL BOUNTY (2.1 GEN)';
      if (severityUpper === 'HIGH') return 'HIGH BOUNTY (1.1 GEN)';
      if (severityUpper === 'MEDIUM') return 'MEDIUM BOUNTY (0.5 GEN)';
      if (severityUpper === 'LOW') return 'LOW BOUNTY (0.2 GEN)';
      return 'BOUNTY PAID';
    }
    if (status === 'POOL_DEPLETED_PARTIAL_PAYOUT') return 'POOL SETTLED (PARTIAL)';
    if (status === 'POOL_DEPLETED') return 'POOL DEPLETED';
    return audit.payoutStatus;
  };
  
  return (
    <>
      {/* Main Row */}
      <tr className="proposal-main-row" style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
        <td className="table-cell">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-muted">❖</span>
            <span style={{ wordBreak: 'break-all', maxWidth: '100%', display: 'inline-block' }} className="font-mono">{audit.targetUrl}</span>
          </div>
        </td>
        
        <td className="table-cell">
          <span style={{ 
            color: severityColor, 
            border: `1px solid ${severityBorder}`, 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            {severityLabel}
          </span>
        </td>
        
        <td className="table-cell">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={`status-dot ${isPending ? 'inactive' : 'active'}`}></span>
            {getPayoutBadge()}
          </span>
        </td>
        
        <td className="table-cell">
          {isPending && account && onExecute ? (
            <button 
              className="cyber-button secondary" 
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', width: 'auto' }}
              onClick={onExecute}
            >
              Audit ⯆
            </button>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Monitored</span>
          )}
        </td>
      </tr>
      
      {/* Expandable Analysis Details */}
      <tr className="proposal-details-row">
        <td colSpan={4} className="details-cell">
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.4)', 
            padding: '0.75rem', 
            borderRadius: '4px',
            borderLeft: `2px solid ${isMalicious ? 'var(--danger)' : 'var(--primary-cyan)'}`,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            {audit.report && (
              <>
                <div style={{ color: 'var(--warning)', marginBottom: '0.4rem', marginTop: '0.4rem' }}>
                  &gt; Auditor Report {audit.startLine && audit.endLine ? `(Lines ${audit.startLine}-${audit.endLine})` : ''}:
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', marginBottom: '1rem', color: 'var(--text-main)' }}>{audit.report}</div>
              </>
            )}
            <div style={{ color: 'var(--primary-cyan)', marginBottom: '0.4rem' }}>&gt; GenVM Analysis Trace:</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{audit.analysis}</div>
          </div>
        </td>
      </tr>
    </>
  );
}
