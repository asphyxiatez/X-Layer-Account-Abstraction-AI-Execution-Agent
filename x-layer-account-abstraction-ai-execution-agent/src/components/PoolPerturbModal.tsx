import React from 'react';
import { X, Sliders, RotateCcw, ArrowRight, ShieldAlert } from 'lucide-react';
import type { PoolState } from '../types';

interface PoolPerturbModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: PoolState;
  onApplyPerturbation: (newReserveA: bigint, newReserveB: bigint, newOracleA: number) => void;
}

export const PoolPerturbModal: React.FC<PoolPerturbModalProps> = ({
  isOpen,
  onClose,
  pool,
  onApplyPerturbation,
}) => {
  if (!isOpen) return null;

  const handleQuickPreset = (type: 'IMBALANCE_OVER_3' | 'SLIGHT_IMBALANCE' | 'EQUILIBRIUM' | 'FLASH_LOAN_ATTACK') => {
    // Relative to the default ~400k on-chain pool baseline (1,678.66 WOKB at live spot price ~$124.50)
    const baseA = 1678.6556;
    const priceA = pool.oraclePriceA || 124.50;

    let targetReserveB = baseA * priceA;

    if (type === 'IMBALANCE_OVER_3') {
      // 3.8% legitimate market drift: spot price stays within 5.0% oracle ceiling (e.g. ~3.8% divergence)
      targetReserveB = targetReserveB * 1.038;
    } else if (type === 'SLIGHT_IMBALANCE') {
      // 1.2% sub-threshold drift
      targetReserveB = targetReserveB * 1.012;
    } else if (type === 'FLASH_LOAN_ATTACK') {
      // 7.8% artificial price skew: triggers > 5.00% Invariant C Flash Loan ceiling!
      targetReserveB = targetReserveB * 1.078;
    } else if (type === 'EQUILIBRIUM') {
      targetReserveB = baseA * priceA;
    }

    const resABig = BigInt(Math.floor(baseA * 10 ** pool.tokenA.decimals));
    const resBBig = BigInt(Math.floor(targetReserveB * 10 ** pool.tokenB.decimals));

    onApplyPerturbation(resABig, resBBig, priceA);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '24px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
              Simulate Market Drift &amp; Attack Scenarios
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', padding: '4px' }}
            aria-label="Close dialogue"
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Test production safeguards on OKX X Layer Testnet, including legitimate rebalancing triggers and Flash Loan Manipulation Defense (Invariant C ceiling ≤ 5.00%).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {/* Preset 1: Legitimate Rebalance Trigger */}
          <button
            onClick={() => handleQuickPreset('IMBALANCE_OVER_3')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--text-primary)',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-amber)' }}>
                Legitimate Imbalance (IR = 3.80%, Divergence = 3.80%)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Exceeds 3.00% threshold but respects ≤ 5.00% ceiling. Triggers valid rebalancing UserOp.
              </div>
            </div>
            <ArrowRight size={16} color="var(--accent-amber)" />
          </button>

          {/* Preset 2: Flash Loan / Price Manipulation Attack */}
          <button
            onClick={() => handleQuickPreset('FLASH_LOAN_ATTACK')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: 'var(--text-primary)',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} />
                <span>Flash Loan Attack Simulation (Divergence = 7.80%)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Artificially skews spot price beyond 5.00% Invariant C ceiling. Tests automatic broadcast halt.
              </div>
            </div>
            <ArrowRight size={16} color="var(--accent-rose)" />
          </button>

          {/* Preset 3: Sub-Threshold Imbalance */}
          <button
            onClick={() => handleQuickPreset('SLIGHT_IMBALANCE')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(148, 163, 184, 0.08)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>
                Sub-threshold Imbalance (IR = 1.20%)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Pool drifts slightly, testing the SKIPPED: &quot;Pool within target ratio bounds.&quot;
              </div>
            </div>
            <ArrowRight size={16} />
          </button>

          {/* Preset 4: Reset to Equilibrium */}
          <button
            onClick={() => handleQuickPreset('EQUILIBRIUM')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--text-primary)',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-green)' }}>
                Reset to Equilibrium (IR = 0.00%)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Restore pool reserves to exact 50/50 USD value parity.
              </div>
            </div>
            <RotateCcw size={16} color="var(--accent-green)" />
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
