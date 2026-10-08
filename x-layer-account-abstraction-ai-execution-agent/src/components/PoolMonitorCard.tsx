import React, { useState } from 'react';
import { Sliders, ExternalLink, RefreshCw, Radio, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import type { PoolState } from '../types';
import { OPERATIONAL_LIMITS } from '../constants/xlayer';
import type { OnChainPoolData } from '../engine/xlayerRpc';

interface PoolMonitorCardProps {
  pool: PoolState;
  onPerturbClick: () => void;
  onRefreshPool: () => void;
  isRefreshing: boolean;
  onChainData: OnChainPoolData | null;
  dataSourceMode: 'LIVE_ON_CHAIN' | 'SANDBOX_SIMULATED';
  onToggleDataSourceMode: (mode: 'LIVE_ON_CHAIN' | 'SANDBOX_SIMULATED') => void;
  customPairInput: string;
  onCustomPairChange: (addr: string) => void;
  onApplyCustomPair: () => void;
  onSliderImbalanceChange?: (ratio: number) => void;
  liveOraclePrice?: number;
  liveOracleSource?: string;
  onSeedPoolToOracle?: () => void;
}

export const PoolMonitorCard: React.FC<PoolMonitorCardProps> = ({
  pool,
  onPerturbClick,
  onRefreshPool,
  isRefreshing,
  onChainData,
  dataSourceMode,
  onToggleDataSourceMode,
  customPairInput,
  onCustomPairChange,
  onApplyCustomPair,
  onSliderImbalanceChange,
  liveOraclePrice,
  liveOracleSource,
  onSeedPoolToOracle,
}) => {
  const [showAddressInput, setShowAddressInput] = useState(false);

  const normA = Number(pool.reserveA) / 10 ** pool.tokenA.decimals;
  const normB = Number(pool.reserveB) / 10 ** pool.tokenB.decimals;
  const valueA = normA * pool.oraclePriceA;
  const valueB = normB * pool.oraclePriceB;
  const totalValue = valueA + valueB;

  const pctA = totalValue > 0 ? (valueA / totalValue) * 100 : 50;
  const pctB = totalValue > 0 ? (valueB / totalValue) * 100 : 50;

  const isImbalanced = pool.imbalanceRatio >= OPERATIONAL_LIMITS.imbalanceThresholdPercent;
  const oracleDeviation = Math.abs((pool.spotPrice - pool.oraclePriceA / pool.oraclePriceB) / (pool.oraclePriceA / pool.oraclePriceB)) * 100;
  const isDivergenceHigh = oracleDeviation > OPERATIONAL_LIMITS.maxDivergenceCeilingPercent;

  const isLiveMode = dataSourceMode === 'LIVE_ON_CHAIN';

  const getExplorerAddressUrl = (address: string) => {
    if (address.toLowerCase() === '0xC71f9e1DE80Eb505C0cB3bBf90ae6593130e5D25'.toLowerCase()) {
      return `https://www.oklink.com/xlayer/address/${address}`;
    }
    return `https://www.oklink.com/xlayer-test/address/${address}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Top Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              AMM Pool Monitor &middot; {pool.tokenA.symbol} / {pool.tokenB.symbol}
            </h2>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: isLiveMode ? 'var(--accent-green-dim)' : 'rgba(255, 255, 255, 0.08)',
              color: isLiveMode ? 'var(--accent-green)' : 'var(--accent-amber)',
              fontFamily: 'var(--font-mono)',
              border: `1px solid ${isLiveMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}>
              {isLiveMode ? 'Live On-Chain (Strict RPC)' : 'Sandbox Model (Isolated)'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Constant Product AMM (<span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>x · y = k</span>) on OKX X Layer Testnet (Chain ID 1952)
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(7, 10, 18, 0.7)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => onToggleDataSourceMode('LIVE_ON_CHAIN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 600,
                background: isLiveMode ? 'var(--accent-green-dim)' : 'transparent',
                color: isLiveMode ? 'var(--accent-green)' : 'var(--text-muted)',
              }}
            >
              <Radio size={12} />
              <span>Live On-Chain</span>
            </button>
            <button
              onClick={() => onToggleDataSourceMode('SANDBOX_SIMULATED')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 600,
                background: !isLiveMode ? 'var(--accent-cyan-dim)' : 'transparent',
                color: !isLiveMode ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}
            >
              <Sliders size={12} />
              <span>Sandbox Model</span>
            </button>
          </div>

          <button
            onClick={onRefreshPool}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
            <span>Sync RPC</span>
          </button>

          {!isLiveMode && (
            <button
              onClick={onPerturbClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-cyan-dim)',
                border: '1px solid rgba(0, 245, 212, 0.3)',
                color: 'var(--accent-cyan)',
                fontSize: '12px',
                fontWeight: 600,
              }}
              title="Simulate market price drift or pool imbalance in isolated sandbox"
            >
              <Sliders size={13} />
              <span>Attack Scenarios</span>
            </button>
          )}

          <button
            onClick={() => setShowAddressInput(!showAddressInput)}
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {showAddressInput ? 'Hide Contract' : 'Change Target'}
          </button>
        </div>
      </div>

      {/* Optional Custom Contract Address Input */}
      {showAddressInput && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(7, 10, 18, 0.6)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          fontSize: '12px',
        }}>
          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Target Contract / Pair Address:
          </span>
          <input
            type="text"
            value={customPairInput}
            onChange={(e) => onCustomPairChange(e.target.value)}
            placeholder="0x..."
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '5px 10px' }}
          />
          <button
            onClick={onApplyCustomPair}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-cyan-dim)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 245, 212, 0.3)',
              fontWeight: 600,
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            Query On-Chain
          </button>
        </div>
      )}

      {/* Mode Status Callout */}
      {isLiveMode ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          marginBottom: '16px',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="var(--accent-green)" />
            <span>
              Live On-Chain Data: <strong style={{ fontFamily: 'var(--font-mono)' }}>{pool.pairAddress}</strong>
            </span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
              (Protected &middot; Method: {onChainData?.queryMethod || 'GET_RESERVES'} &middot; Reserves polled directly from RPC)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
            <span>Block: #{onChainData?.blockNumber.toString() || '43003200'}</span>
            <a
              href={getExplorerAddressUrl(pool.pairAddress)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
            >
              <span>Explorer</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(0, 245, 212, 0.06)',
          border: '1px solid rgba(0, 245, 212, 0.2)',
          marginBottom: '16px',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--accent-cyan)" />
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
              Isolated Sandbox Model Active
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              &middot; Adjusting the slider or attack scenarios will never disrupt live on-chain data.
            </span>
          </div>
        </div>
      )}

      {/* Reserves Breakdown */}
      <div className="reserves-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}>
        {/* Token A Reserve */}
        <div className="glass-panel-subtle" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {pool.tokenA.symbol} Reserve ({pool.tokenA.name})
            </span>
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              ${pool.oraclePriceA.toFixed(2)} USD
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {normA.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {pool.tokenA.symbol}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>Pool Value: ${valueA.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{pctA.toFixed(1)}% pool weight</span>
          </div>
        </div>

        {/* Token B Reserve */}
        <div className="glass-panel-subtle" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {pool.tokenB.symbol} Reserve ({pool.tokenB.name})
            </span>
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              ${pool.oraclePriceB.toFixed(2)} USD
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {normB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {pool.tokenB.symbol}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>Pool Value: ${valueB.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{pctB.toFixed(1)}% pool weight</span>
          </div>
        </div>
      </div>

      {/* Interactive Imbalance Ratio (IR) Simulator Slider for Sandbox Mode */}
      {!isLiveMode ? (
        <div style={{
          marginBottom: '22px',
          padding: '16px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(7, 10, 18, 0.55)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Interactive Pool Imbalance Simulator (Sandbox)
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--accent-cyan-dim)',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                IR: {pool.imbalanceRatio.toFixed(2)}%
              </span>
            </div>

            <span style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '999px',
              fontWeight: 700,
              background: pool.imbalanceRatio > 5.0
                ? 'var(--accent-rose-dim)'
                : pool.imbalanceRatio >= 3.0
                ? 'var(--accent-amber-dim)'
                : 'var(--accent-green-dim)',
              color: pool.imbalanceRatio > 5.0
                ? 'var(--accent-rose)'
                : pool.imbalanceRatio >= 3.0
                ? 'var(--accent-amber)'
                : 'var(--accent-green)',
              border: `1px solid ${
                pool.imbalanceRatio > 5.0
                  ? 'rgba(244, 63, 94, 0.3)'
                  : pool.imbalanceRatio >= 3.0
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(16, 185, 129, 0.3)'
              }`,
            }}>
              {pool.imbalanceRatio > 5.0
                ? 'Flash Loan Defense Shield Active (Broadcast Blocked)'
                : pool.imbalanceRatio >= 3.0
                ? 'Rebalancing Triggered (≥ 3.00%)'
                : 'Equilibrium (Below 3.00% Threshold)'}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="10"
            step="0.05"
            value={Math.min(10, Math.max(0, pool.imbalanceRatio))}
            onChange={(e) => onSliderImbalanceChange?.(parseFloat(e.target.value))}
            className="imbalance-slider"
            aria-label="Pool imbalance ratio interactive slider"
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '2px',
            marginBottom: '10px',
          }}>
            <span>0.00% (Equilibrium)</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>↑ 3.00% Trigger</span>
            <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>↑ 5.00% Shield Ceiling</span>
            <span>10.00% (Critical Skew)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Shift:</span>
            <button
              onClick={() => onSliderImbalanceChange?.(0.0)}
              style={{
                fontSize: '11px',
                padding: '3px 9px',
                borderRadius: 'var(--radius-sm)',
                background: pool.imbalanceRatio === 0 ? 'var(--accent-green-dim)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: pool.imbalanceRatio === 0 ? 'var(--accent-green)' : 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              0.00% Equilibrium
            </button>
            <button
              onClick={() => onSliderImbalanceChange?.(3.45)}
              style={{
                fontSize: '11px',
                padding: '3px 9px',
                borderRadius: 'var(--radius-sm)',
                background: pool.imbalanceRatio >= 3.0 && pool.imbalanceRatio <= 5.0 ? 'var(--accent-cyan-dim)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: pool.imbalanceRatio >= 3.0 && pool.imbalanceRatio <= 5.0 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              3.45% Valid Trigger
            </button>
            <button
              onClick={() => onSliderImbalanceChange?.(7.5)}
              style={{
                fontSize: '11px',
                padding: '3px 9px',
                borderRadius: 'var(--radius-sm)',
                background: pool.imbalanceRatio > 5.0 ? 'var(--accent-rose-dim)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: pool.imbalanceRatio > 5.0 ? 'var(--accent-rose)' : 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              7.50% Flash Loan Attack
            </button>
          </div>
        </div>
      ) : (
        /* Visual Imbalance Progress Gauge for Live On-Chain Mode */
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Pool Imbalance Ratio:
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: isImbalanced ? 'var(--accent-rose)' : 'var(--accent-green)',
              }}>
                {pool.imbalanceRatio.toFixed(2)}%
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Rebalancing Trigger at ≥ 3.00%
            </span>
          </div>

          <div style={{
            height: '10px',
            borderRadius: '5px',
            background: 'rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (pool.imbalanceRatio / 6.0) * 100)}%`,
              background: isImbalanced
                ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                : 'linear-gradient(90deg, #10b981, #00f5d4)',
              borderRadius: '5px',
              transition: 'width 0.4s ease',
            }} />

            <div style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#ffffff',
              boxShadow: '0 0 6px #ffffff',
              zIndex: 2,
            }} title="3.0% Trigger Threshold" />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '6px',
          }}>
            <span>0.0% (Equilibrium)</span>
            <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>&uarr; 3.0% Trigger Boundary</span>
            <span>≥ 6.0% (Critical)</span>
          </div>
        </div>
      )}

      {/* Live Divergence Handling & Graceful Pause Banner (Requirement 3) */}
      {isDivergenceHigh && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#fca5a5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--accent-rose)" />
            <div>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                Execution Paused Gracefully (Flash Loan Defense Active):
              </span>{' '}
              Spot price (${pool.spotPrice.toFixed(2)}) diverged by {oracleDeviation.toFixed(2)}% from OKX market oracle (${pool.oraclePriceA.toFixed(2)}), exceeding the 5.00% ceiling.
            </div>
          </div>
          <button
            onClick={onSeedPoolToOracle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #00f5d4 0%, #0088ff 100%)',
              color: '#070a12',
              fontWeight: 700,
              fontSize: '11px',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(0, 245, 212, 0.3)'
            }}
            title="Seed/Sync pool reserves to match live OKX oracle price and restore convergence"
          >
            <Sparkles size={13} />
            <span>Seed Pool to Oracle Baseline (${(liveOraclePrice || pool.oraclePriceA).toFixed(2)})</span>
          </button>
        </div>
      )}

      {/* Pricing Matrix & Invariant Indicators */}
      <div className="pricing-matrix-wrap" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '12px 18px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(7, 10, 18, 0.6)',
        border: '1px solid var(--border-subtle)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Spot Price:</span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            1 {pool.tokenA.symbol} = {pool.spotPrice.toFixed(4)} {pool.tokenB.symbol}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>OKX Oracle Price:</span>
          <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            ${pool.oraclePriceA.toFixed(2)} USD
          </strong>
          {liveOracleSource && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({liveOracleSource})</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Oracle Divergence:</span>
          <span style={{
            color: oracleDeviation <= 5.0 ? (oracleDeviation < 1.0 ? 'var(--accent-green)' : 'var(--accent-amber)') : 'var(--accent-rose)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
          }}>
            {oracleDeviation.toFixed(2)}%
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Ceiling: ≤ 5.00%)</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <a
            href={getExplorerAddressUrl(pool.routerAddress)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
          >
            <span>Router Bytecode</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
