import React from 'react';

export interface Audit {
  id: number;
  targetUrl: string;
  status: string;
  payoutStatus: string;
  analysis: string;
}

export default function ProposalCard({ audit, index, onExecute, account }: { audit: Audit, index: number, onExecute?: () => void, account?: string | null }) {
  
  // Try to determine risk level from status or analysis
  const isMalicious = audit.status?.toUpperCase() === 'MALICIOUS';
  const isSecure = audit.status?.toUpperCase() === 'SECURE';
  
  const riskLabel = isMalicious ? 'High' : (isSecure ? 'Low' : 'Medium');
  const riskClass = isMalicious ? 'danger' : (isSecure ? 'success' : 'warning');
  
  const isPending = audit.status === 'Pending';
  
  return (
    <>
      {/* Main Row */}
      <tr style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
        <td style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="text-muted">❖</span>
            <span style={{ wordBreak: 'break-all', maxWidth: '250px', display: 'inline-block' }} className="font-mono">{audit.targetUrl}</span>
          </div>
        </td>
        
        <td style={{ padding: '1.25rem 1.5rem' }}>
          <span style={{ 
            color: `var(--${riskClass})`, 
            border: `1px solid rgba(var(--${riskClass}-rgb, 255,255,255), 0.3)`, 
            padding: '0.25rem 0.75rem', 
            borderRadius: '4px',
            fontSize: '0.75rem',
            textTransform: 'uppercase'
          }}>
            {isPending ? 'Analyzing' : riskLabel}
          </span>
        </td>
        
        <td style={{ padding: '1.25rem 1.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`status-dot ${isPending ? 'inactive' : 'active'}`}></span>
            {audit.payoutStatus === 'Pending' ? 'Awaiting Consensus' : audit.payoutStatus}
          </span>
        </td>
        
        <td style={{ padding: '1.25rem 1.5rem' }}>
          {isPending && account && onExecute ? (
            <button 
              className="cyber-button secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }}
              onClick={onExecute}
            >
              Audit ⯆
            </button>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Monitored</span>
          )}
        </td>
      </tr>
      
      {/* Expandable Analysis Details (Always visible for now as a sub-row) */}
      <tr>
        <td colSpan={4} style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderBottom: '1px solid var(--panel-border)' }}>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.4)', 
            padding: '1rem', 
            borderRadius: '6px',
            borderLeft: `2px solid ${isMalicious ? 'var(--danger)' : 'var(--primary-cyan)'}`,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ color: 'var(--primary-cyan)', marginBottom: '0.5rem' }}>&gt; GenVM Analysis Trace:</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{audit.analysis}</div>
          </div>
        </td>
      </tr>
    </>
  );
}
