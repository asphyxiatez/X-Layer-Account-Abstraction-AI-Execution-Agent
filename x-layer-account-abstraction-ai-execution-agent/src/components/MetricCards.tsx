import React from 'react';
import { Layers, TrendingUp, ShieldAlert, Zap, Clock } from 'lucide-react';
import type { PoolState } from '../types';
import { OPERATIONAL_LIMITS } from '../constants/xlayer';

interface MetricCardsProps {
  pool: PoolState;
  rebalanceCount: number;
  sponsoredGasUsd: number;
  agentState: 'IDLE' | 'MONITORING' | 'TRIGGERED' | 'EXECUTING' | 'COOLDOWN';
  cooldownRemainingSeconds: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  pool,
  rebalanceCount,
  sponsoredGasUsd,
  agentState,
  cooldownRemainingSeconds,
}) => {
  const normA = Number(pool.reserveA) / 10 ** pool.tokenA.decimals;
  const normB = Number(pool.reserveB) / 10 ** pool.tokenB.decimals;
  const totalTvlUsd = normA * pool.oraclePriceA + normB * pool.oraclePriceB;

  const isImbalanced = pool.imbalanceRatio >= OPERATIONAL_LIMITS.imbalanceThresholdPercent;

  return (
    <div className="metrics-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    }}>
      {/* Metric 1: Monitored TVL */}
      <div className="glass-panel" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Monitored Pool TVL
          </span>
          <div style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'var(--accent-cyan-dim)',
            color: 'var(--accent-cyan)',
          }}>
            <Layers size={17} />
          </div>
        </div>
        <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          ${totalTvlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {pool.tokenA.symbol} / {pool.tokenB.symbol} on OKX X Layer
        </div>
      </div>

      {/* Metric 2: Pool Imbalance Ratio */}
      <div className="glass-panel" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Imbalance Ratio (IR)
          </span>
          <div style={{
            padding: '6px',
            borderRadius: '8px',
            background: isImbalanced ? 'var(--accent-rose-dim)' : 'var(--accent-green-dim)',
            color: isImbalanced ? 'var(--accent-rose)' : 'var(--accent-green)',
          }}>
            <TrendingUp size={17} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{
            fontSize: '26px',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: isImbalanced ? 'var(--accent-rose)' : 'var(--accent-green)',
          }}>
            {pool.imbalanceRatio.toFixed(2)}%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Threshold: {OPERATIONAL_LIMITS.imbalanceThresholdPercent.toFixed(1)}%
          </span>
        </div>
        <div style={{
          fontSize: '12px',
          color: isImbalanced ? 'var(--accent-rose)' : 'var(--text-secondary)',
          marginTop: '4px',
          fontWeight: 500,
        }}>
          {isImbalanced ? 'Threshold exceeded: Rebalancing required' : 'Balanced within target bounds'}
        </div>
      </div>

      {/* Metric 3: Paymaster Gas Sponsored */}
      <div className="glass-panel" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Paymaster Gas Sponsored
          </span>
          <div style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'var(--accent-cyan-dim)',
            color: 'var(--accent-cyan)',
          }}>
            <Zap size={17} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)' }}>
            ${sponsoredGasUsd.toFixed(2)} USD
          </span>
          {rebalanceCount === 0 && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(0, 245, 212, 0.15)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 245, 212, 0.25)',
              fontWeight: 600,
            }}>
              Sponsorship Active
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {rebalanceCount === 0
            ? '0 Executed · Ready for 1st execution (Sponsored)'
            : `${rebalanceCount} gasless rebalances executed · Sponsored`}
        </div>
      </div>

      {/* Metric 4: Agent Core Duty State */}
      <div className="glass-panel" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Agent Duty State
          </span>
          <div style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'var(--accent-blue-dim)',
            color: 'var(--accent-blue)',
          }}>
            {cooldownRemainingSeconds > 0 ? <Clock size={17} /> : <ShieldAlert size={17} />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background:
              agentState === 'EXECUTING'
                ? 'var(--accent-cyan)'
                : agentState === 'TRIGGERED'
                ? 'var(--accent-amber)'
                : 'var(--accent-green)',
            boxShadow: '0 0 10px currentColor',
          }} />
          <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {agentState}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {cooldownRemainingSeconds > 0
            ? `Cooldown window: ${cooldownRemainingSeconds}s remaining`
            : 'Standing by for pool drift'}
        </div>
      </div>
    </div>
  );
};
