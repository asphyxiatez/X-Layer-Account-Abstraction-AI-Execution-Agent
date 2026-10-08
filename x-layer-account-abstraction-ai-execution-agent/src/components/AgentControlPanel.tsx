import React from 'react';
import { Play, Pause, Shield, CheckCircle2, XCircle, RefreshCw, Radio, ShieldAlert } from 'lucide-react';
import type { InvariantCheckResult } from '../types';
import type { WatchdogMetrics } from '../engine/rpcWatchdog';

interface AgentControlPanelProps {
  isAutonomous: boolean;
  onToggleAutonomous: () => void;
  isExecuting: boolean;
  onRunCycle: () => void;
  strictBytecodeCheck: boolean;
  onToggleStrictBytecodeCheck: () => void;
  pollIntervalSec: number;
  onChangePollInterval: (sec: number) => void;
  invariants: InvariantCheckResult[];
  watchdogMetrics: WatchdogMetrics | null;
  flashLoanShieldActive: boolean;
}

export const AgentControlPanel: React.FC<AgentControlPanelProps> = ({
  isAutonomous,
  onToggleAutonomous,
  isExecuting,
  onRunCycle,
  strictBytecodeCheck,
  onToggleStrictBytecodeCheck,
  pollIntervalSec,
  onChangePollInterval,
  invariants,
  watchdogMetrics,
  flashLoanShieldActive,
}) => {
  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Autonomous Execution &amp; Production Safeguards
            </h2>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: isAutonomous ? 'var(--accent-green-dim)' : 'rgba(255, 255, 255, 0.08)',
              color: isAutonomous ? 'var(--accent-green)' : 'var(--text-muted)',
              fontWeight: 600,
            }}>
              {isAutonomous ? 'Active Monitoring' : 'Manual Standby'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Enforcing RPC Reconnection Guard (fallback polling) and Flash Loan &amp; Manipulation Defense (≤ 5.00% ceiling)
          </p>
        </div>

        <div className="button-action-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onToggleAutonomous}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: isAutonomous ? 'rgba(244, 63, 94, 0.15)' : 'var(--accent-cyan-dim)',
              border: `1px solid ${isAutonomous ? 'rgba(244, 63, 94, 0.3)' : 'rgba(0, 245, 212, 0.3)'}`,
              color: isAutonomous ? 'var(--accent-rose)' : 'var(--accent-cyan)',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            {isAutonomous ? <Pause size={15} /> : <Play size={15} />}
            <span>{isAutonomous ? 'Pause Autonomous Loop' : 'Start Autonomous Loop'}</span>
          </button>

          <button
            onClick={onRunCycle}
            disabled={isExecuting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #00f5d4 0%, #0088ff 100%)',
              color: '#070a12',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 0 16px rgba(0, 245, 212, 0.25)',
            }}
          >
            <RefreshCw size={14} className={isExecuting ? 'spin' : ''} />
            <span>{isExecuting ? 'Simulating...' : 'Run Rebalance Cycle'}</span>
          </button>
        </div>
      </div>

      {/* Production Safeguards Status Banner */}
      <div className="safeguards-status-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '14px',
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(7, 10, 18, 0.65)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '20px',
      }}>
        {/* Safeguard 1: RPC Reconnection Guard */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{
            padding: '6px',
            borderRadius: '6px',
            background: watchdogMetrics?.connectionState === 'RECONNECTING'
              ? 'var(--accent-rose-dim)'
              : 'var(--accent-green-dim)',
            color: watchdogMetrics?.connectionState === 'RECONNECTING'
              ? 'var(--accent-rose)'
              : 'var(--accent-green)',
            marginTop: '2px',
          }}>
            <Radio size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>RPC Reconnection Guard</span>
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-green)',
                fontWeight: 700,
              }}>
                15s Watchdog Active
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              State: <strong style={{ color: 'var(--text-secondary)' }}>{watchdogMetrics?.connectionState || 'CONNECTED'}</strong> &middot; Fallback queries: {watchdogMetrics?.fallbackTriggerCount || 0} &middot; Reconnects: {watchdogMetrics?.reconnectCount || 0}
            </div>
          </div>
        </div>

        {/* Safeguard 2: Flash Loan & Manipulation Defense */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{
            padding: '6px',
            borderRadius: '6px',
            background: flashLoanShieldActive ? 'var(--accent-rose-dim)' : 'var(--accent-cyan-dim)',
            color: flashLoanShieldActive ? 'var(--accent-rose)' : 'var(--accent-cyan)',
            marginTop: '2px',
          }}>
            <ShieldAlert size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Flash Loan Defense</span>
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: flashLoanShieldActive ? 'var(--accent-rose-dim)' : 'var(--accent-cyan-dim)',
                color: flashLoanShieldActive ? 'var(--accent-rose)' : 'var(--accent-cyan)',
                fontWeight: 700,
              }}>
                {flashLoanShieldActive ? 'ATTACK BLOCKED' : 'Ceiling ≤ 5.00%'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Spot vs Oracle divergence ceiling strictly guards against single-transaction reserve skew.
            </div>
          </div>
        </div>
      </div>

      {/* Mode Settings & Toggles */}
      <div className="control-panel-settings" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(7, 10, 18, 0.5)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Polling Frequency
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Primary RPC interval for pool state
            </div>
          </div>
          <select
            value={pollIntervalSec}
            onChange={(e) => onChangePollInterval(Number(e.target.value))}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <option value={3}>Every 3 sec (Rapid)</option>
            <option value={5}>Every 5 sec (Recommended)</option>
            <option value={10}>Every 10 sec</option>
            <option value={30}>Every 30 sec</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Strict Public RPC Bytecode Verification
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {strictBytecodeCheck
                ? 'Strict mode: halts if target router returns 0x'
                : 'Sandbox mode: uses simulated deployed bytecode'}
            </div>
          </div>
          <button
            onClick={onToggleStrictBytecodeCheck}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: strictBytecodeCheck ? 'var(--accent-amber-dim)' : 'var(--accent-blue-dim)',
              border: `1px solid ${strictBytecodeCheck ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 136, 255, 0.3)'}`,
              color: strictBytecodeCheck ? 'var(--accent-amber)' : 'var(--accent-blue)',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {strictBytecodeCheck ? 'Enforce 0x Check' : 'Simulated Sandbox'}
          </button>
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}>
          <Shield size={16} />
          <span>Operational Boundaries &amp; Security Invariants Status</span>
        </div>

        <div className="invariants-status-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
        }}>
          {invariants.map((inv) => (
            <div
              key={inv.name}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: inv.passed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.07)',
                border: `1px solid ${inv.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.28)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {inv.name}
                </span>
                {inv.passed ? (
                  <CheckCircle2 size={15} color="var(--accent-green)" />
                ) : (
                  <XCircle size={15} color="var(--accent-rose)" />
                )}
              </div>
              <div style={{ fontSize: '11px', color: inv.passed ? 'var(--accent-green)' : 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                {inv.value}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Rule: {inv.threshold}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
