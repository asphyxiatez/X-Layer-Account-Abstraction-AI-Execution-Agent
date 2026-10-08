import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import type { AgentTelemetryLog } from '../types';

interface TelemetryLogViewProps {
  logs: AgentTelemetryLog[];
  onClearLogs: () => void;
}

export const TelemetryLogView: React.FC<TelemetryLogViewProps> = ({ logs, onClearLogs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getBadgeStyle = (type: AgentTelemetryLog['type']) => {
    switch (type) {
      case 'CHECK':
        return { bg: 'rgba(0, 136, 255, 0.12)', color: '#60a5fa', border: 'rgba(0, 136, 255, 0.3)' };
      case 'TRIGGER':
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'SIMULATION':
        return { bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
      case 'EXECUTION':
        return { bg: 'rgba(0, 245, 212, 0.12)', color: '#00f5d4', border: 'rgba(0, 245, 212, 0.3)' };
      case 'SKIPPED':
        return { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
      case 'ERROR':
        return { bg: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e', border: 'rgba(244, 63, 94, 0.3)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0', border: 'rgba(255, 255, 255, 0.15)' };
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Matterhorn Agent Execution Telemetry
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ({logs.length} events logged)
          </span>
        </div>

        <button
          onClick={onClearLogs}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
          title="Clear telemetry stream"
        >
          <Trash2 size={12} />
          <span>Clear Logs</span>
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          background: '#04070e',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          padding: '14px',
          height: '240px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '90px' }}>
            Agent telemetry stream initialised. Awaiting cycle trigger...
          </div>
        ) : (
          logs.map((log) => {
            const badge = getBadgeStyle(log.type);
            const timeStr = new Date(log.timestamp).toLocaleTimeString('en-GB');

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  lineHeight: 1.5,
                  padding: '2px 0',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', minWidth: '70px' }}>
                  [{timeStr}]
                </span>

                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  minWidth: '75px',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}>
                  {log.type}
                </span>

                <span style={{ color: '#e2e8f0', flex: 1, wordBreak: 'break-word' }}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
