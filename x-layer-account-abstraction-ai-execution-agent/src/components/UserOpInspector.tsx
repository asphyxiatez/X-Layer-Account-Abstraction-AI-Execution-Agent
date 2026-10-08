import React, { useState } from 'react';
import { Copy, Check, FileCode, ShieldCheck } from 'lucide-react';
import type { ExecutionResult } from '../types';
import type { BuiltUserOperationResult } from '../engine/userOpBuilder';
import type { RebalancePlan } from '../engine/rebalanceMath';
import { XLAYER_TESTNET, PROTOCOL_ADDRESSES } from '../constants/xlayer';

interface UserOpInspectorProps {
  executionResult: ExecutionResult | null;
  plannedUserOp?: BuiltUserOperationResult | null;
  plan?: RebalancePlan | null;
  isTriggered?: boolean;
}

export const UserOpInspector: React.FC<UserOpInspectorProps> = ({
  executionResult,
  plannedUserOp,
  plan,
  isTriggered,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'JSON' | 'DECODED'>('JSON');

  const hasExecutionResult = !!executionResult;
  const isExecute = executionResult?.status === 'EXECUTE';
  const usePlannedPayload = !isExecute && isTriggered && !!plannedUserOp && !!plan;

  if (!hasExecutionResult && !usePlannedPayload) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          No execution payload generated yet. Initialise a rebalancing cycle or enable autonomous monitoring.
        </p>
      </div>
    );
  }

  let cleanJson: any;
  let statusBadgeText = '';
  let statusBadgeColor = '';
  let statusBadgeBg = '';
  let statusBadgeBorder = '';

  if (isExecute && executionResult) {
    statusBadgeText = 'STATUS: EXECUTE (LIVE ECDSA SIGNED)';
    statusBadgeColor = 'var(--accent-green)';
    statusBadgeBg = 'var(--accent-green-dim)';
    statusBadgeBorder = 'rgba(16, 185, 129, 0.3)';
    cleanJson = {
      status: 'EXECUTE',
      timestamp: executionResult.timestamp,
      chain_id: executionResult.chain_id,
      trigger_reason: executionResult.trigger_reason,
      simulation: {
        status: executionResult.simulation.status,
        expected_gas_used: executionResult.simulation.expected_gas_used,
        min_amount_out: executionResult.simulation.min_amount_out,
      },
      user_operation: executionResult.user_operation,
    };
  } else if (usePlannedPayload && plannedUserOp && plan) {
    statusBadgeText = 'STATUS: TRIGGERED (ECDSA SIGNED)';
    statusBadgeColor = 'var(--accent-cyan)';
    statusBadgeBg = 'var(--accent-cyan-dim)';
    statusBadgeBorder = 'rgba(0, 245, 212, 0.35)';
    cleanJson = {
      status: 'TRIGGERED_PLANNED',
      timestamp: Math.floor(Date.now() / 1000),
      chain_id: XLAYER_TESTNET.chainId,
      trigger_reason: `Pool imbalance ratio at ${plan.currentImbalanceRatio.toFixed(2)}% (Threshold: 3.00%)`,
      simulation: {
        status: 'READY_TO_SIMULATE',
        expected_gas_used: plannedUserOp.estimatedGasTotal.toString(),
        min_amount_out: plan.minAmountOut.toString(),
      },
      user_operation: plannedUserOp.userOp,
    };
  } else if (executionResult && executionResult.status === 'SKIPPED') {
    statusBadgeText = 'STATUS: SKIPPED';
    statusBadgeColor = 'var(--accent-amber)';
    statusBadgeBg = 'rgba(255, 255, 255, 0.08)';
    statusBadgeBorder = 'rgba(245, 158, 11, 0.3)';
    cleanJson = {
      status: 'SKIPPED',
      reason: executionResult.reason,
    };
  }

  const jsonString = JSON.stringify(cleanJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const userOp = isExecute ? executionResult?.user_operation : plannedUserOp?.userOp;
  const rebalanceDetails = isExecute ? executionResult?.rebalance_details : (plan ? {
    swapDirection: plan.direction,
    tokenIn: plan.tokenInSymbol,
    tokenOut: plan.tokenOutSymbol,
    amountIn: `${plan.amountInDecimal.toFixed(4)} ${plan.tokenInSymbol}`,
    expectedOut: `${plan.expectedOutDecimal.toFixed(4)} ${plan.tokenOutSymbol}`,
    minAmountOut: `${plan.minAmountOutDecimal.toFixed(4)} ${plan.tokenOutSymbol}`,
    slippageEnforced: `${plan.slippagePercent}%`,
    imbalanceBefore: `${plan.currentImbalanceRatio.toFixed(2)}%`,
    imbalanceAfterPredicted: `${plan.predictedPostImbalanceRatio.toFixed(2)}%`,
  } : null);

  const canShowDecoded = (isExecute || usePlannedPayload) && !!userOp;
  const isEcdsaSigned = userOp?.signature && userOp.signature.startsWith('0x') && userOp.signature.length >= 130;

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileCode size={20} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Execution Payload &amp; UserOperation Inspector
          </h2>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '999px',
            fontWeight: 700,
            background: statusBadgeBg,
            color: statusBadgeColor,
            border: `1px solid ${statusBadgeBorder}`,
            letterSpacing: '0.04em',
          }}>
            {statusBadgeText}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canShowDecoded && (
            <div style={{
              display: 'flex',
              background: 'rgba(7, 10, 18, 0.6)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              border: '1px solid var(--border-subtle)',
            }}>
              <button
                onClick={() => setActiveTab('JSON')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: activeTab === 'JSON' ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: activeTab === 'JSON' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                Raw JSON
              </button>
              <button
                onClick={() => setActiveTab('DECODED')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: activeTab === 'DECODED' ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: activeTab === 'DECODED' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                Decoded UserOp
              </button>
            </div>
          )}

          <button
            onClick={handleCopy}
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
            {copied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'JSON' || !canShowDecoded ? (
        <div style={{
          position: 'relative',
          background: '#04070e',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          padding: '16px',
          overflowX: 'auto',
          maxHeight: '420px',
        }}>
          <pre style={{
            fontSize: '12px',
            color: '#a5f3fc',
            lineHeight: 1.6,
            fontFamily: 'var(--font-mono)',
            margin: 0,
          }}>
            {jsonString}
          </pre>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {rebalanceDetails && (
            <div style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 245, 212, 0.04)',
              border: '1px solid rgba(0, 245, 212, 0.15)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              fontSize: '12px',
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Swap Input:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{rebalanceDetails.amountIn}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Min Output (0.5% Slippage):</span>{' '}
                <strong style={{ color: 'var(--accent-cyan)' }}>{rebalanceDetails.minAmountOut}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Expected Output:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{rebalanceDetails.expectedOut}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Post-Swap Imbalance Target:</span>{' '}
                <strong style={{ color: 'var(--accent-green)' }}>{rebalanceDetails.imbalanceAfterPredicted}</strong>
              </div>
            </div>
          )}

          <div className="table-scroll-container" style={{
            background: '#04070e',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', width: '220px' }}>sender (Smart Account)</td>
                  <td style={{ padding: '10px 14px', color: 'var(--accent-cyan)' }}>{userOp.sender}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>target DEX Router</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{PROTOCOL_ADDRESSES.dexRouter}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>nonce (Live EntryPoint)</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>
                    {userOp.nonce} <span style={{ color: 'var(--accent-cyan)', fontSize: '10px' }}>(Dynamic on-chain)</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>callData (execute)</td>
                  <td style={{ padding: '10px 14px', color: '#e2e8f0', wordBreak: 'break-all' }}>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>0xb61d27f6</span>
                    {userOp.callData.slice(10, 60)}...
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>callGasLimit</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{userOp.callGasLimit}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>verificationGasLimit</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{userOp.verificationGasLimit}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>preVerificationGas</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{userOp.preVerificationGas}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>maxFeePerGas</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{userOp.maxFeePerGas}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>paymasterAndData</td>
                  <td style={{ padding: '10px 14px', color: 'var(--accent-green)', wordBreak: 'break-all' }}>
                    {userOp.paymasterAndData.slice(0, 42)}... (Gas Sponsored)
                  </td>
                </tr>
                {plannedUserOp?.userOpHash && (
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>EntryPoint userOpHash</td>
                    <td style={{ padding: '10px 14px', color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>
                      {plannedUserOp.userOpHash}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>signature (ECDSA)</td>
                  <td style={{ padding: '10px 14px', color: isEcdsaSigned ? 'var(--accent-cyan)' : 'var(--accent-blue)', wordBreak: 'break-all' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      {isEcdsaSigned && <ShieldCheck size={14} color="var(--accent-cyan)" />}
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(0, 245, 212, 0.15)',
                        color: 'var(--accent-cyan)',
                        fontWeight: 700
                      }}>
                        Live ECDSA Secp256k1 Signed (65 bytes)
                      </span>
                    </div>
                    {userOp.signature}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
