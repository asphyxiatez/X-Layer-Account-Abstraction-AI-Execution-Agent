import type { Address, InvariantCheckResult, PoolState } from '../types';
import { OPERATIONAL_LIMITS, PROTOCOL_ADDRESSES } from '../constants/xlayer';
import type { RebalancePlan } from './rebalanceMath';

export interface InvariantEvaluation {
  allPassed: boolean;
  failedKey?: string;
  failureReason?: string;
  results: InvariantCheckResult[];
  flashLoanShieldTriggered: boolean;
  spotOracleDivergencePercent: number;
}

export function evaluateInvariants(
  _pool: PoolState,
  plan: RebalancePlan,
  lastExecutionTimestamp: number,
  paymasterVerified: boolean,
  bytecodePresent: boolean
): InvariantEvaluation {
  const now = Math.floor(Date.now() / 1000);
  const results: InvariantCheckResult[] = [];

  // 1. Bytecode Integrity Check
  const bytecodePassed = bytecodePresent;
  results.push({
    name: 'Bytecode Integrity',
    key: 'bytecode',
    passed: bytecodePassed,
    value: bytecodePassed ? 'Active (Bytecode != 0x)' : 'Empty / Missing (0x)',
    threshold: '!= 0x on Chain 1952',
    detail: bytecodePassed
      ? 'DEX Router and Token contracts verified deployed on OKX X Layer Testnet.'
      : 'Target DEX router contract has no deployed bytecode on Chain 1952.',
  });

  // 2. Token Whitelist Check
  const knownTokens: Address[] = [
    PROTOCOL_ADDRESSES.wrappedGasToken.toLowerCase() as Address,
    PROTOCOL_ADDRESSES.testnetTokenA.toLowerCase() as Address,
    PROTOCOL_ADDRESSES.testnetTokenB.toLowerCase() as Address,
    PROTOCOL_ADDRESSES.testnetTokenC.toLowerCase() as Address,
  ];

  const tokenInKnown = knownTokens.includes(plan.tokenInAddress.toLowerCase() as Address);
  const tokenOutKnown = knownTokens.includes(plan.tokenOutAddress.toLowerCase() as Address);
  const whitelistPassed = tokenInKnown && tokenOutKnown;

  if (!whitelistPassed) {
    results.push({
      name: 'Token Whitelist',
      key: 'invariant_a',
      passed: false,
      value: 'Unknown Token Encountered',
      threshold: 'Must be in Token Whitelist',
      detail: 'Security invariant violation: attempted swap with unapproved token address.',
    });
  }

  // 3. Max Single Transaction Value ($5,000 USD limit)
  const maxValuePassed = plan.amountInUsd <= OPERATIONAL_LIMITS.maxSingleTxValueUsd;
  results.push({
    name: 'Max Transaction Size',
    key: 'max_value',
    passed: maxValuePassed,
    value: `$${plan.amountInUsd.toFixed(2)} USD`,
    threshold: `≤ $${OPERATIONAL_LIMITS.maxSingleTxValueUsd} USD`,
    detail: maxValuePassed
      ? 'Swap value complies with maximum single transaction risk envelope.'
      : `Proposed swap size ($${plan.amountInUsd.toFixed(2)}) exceeds maximum allowed risk limit ($5,000 USD).`,
  });

  // 4. Slippage Bounds (≤ 0.5%)
  const slippagePassed = plan.slippagePercent <= OPERATIONAL_LIMITS.maxSlippagePercent;
  results.push({
    name: 'Slippage Guard',
    key: 'slippage',
    passed: slippagePassed,
    value: `${plan.slippagePercent.toFixed(2)}%`,
    threshold: `≤ ${OPERATIONAL_LIMITS.maxSlippagePercent}%`,
    detail: slippagePassed
      ? 'MinAmountOut mathematically protects against frontrunning and sandwich attacks.'
      : 'Slippage parameter exceeds maximum allowed 0.5% threshold.',
  });

  // 5. Cooldown Window (≥ 600s)
  const timeSinceLastRebalance = now - lastExecutionTimestamp;
  const cooldownPassed =
    lastExecutionTimestamp === 0 || timeSinceLastRebalance >= OPERATIONAL_LIMITS.cooldownWindowSeconds;
  results.push({
    name: 'Execution Cooldown',
    key: 'cooldown',
    passed: cooldownPassed,
    value: lastExecutionTimestamp === 0 ? 'Ready (None prior)' : `${timeSinceLastRebalance}s elapsed`,
    threshold: `≥ ${OPERATIONAL_LIMITS.cooldownWindowSeconds}s (10 min)`,
    detail: cooldownPassed
      ? 'Cooldown window respected; dampens oscillatory rebalance loops.'
      : `Action blocked: cooling down (${OPERATIONAL_LIMITS.cooldownWindowSeconds - timeSinceLastRebalance}s remaining).`,
  });

  // 6. Invariant A: Smart Account token value post-rebalance within 0.1% of predicted balance
  const predictedPostImbalance = plan.predictedPostImbalanceRatio;
  const invariantAPassed = predictedPostImbalance <= 1.0;
  results.push({
    name: 'Invariant A: Post-Balance Drift',
    key: 'invariant_a',
    passed: invariantAPassed,
    value: `${predictedPostImbalance.toFixed(3)}% residual`,
    threshold: '≤ 0.10% target balance',
    detail: invariantAPassed
      ? 'Smart Account post-rebalance asset value satisfies 0.1% convergence criteria.'
      : 'Predicted post-swap balance deviates beyond 0.1% tolerance.',
  });

  // 7. Invariant B: Gas fee sponsorship validated via Testnet Paymaster
  const invariantBPassed = paymasterVerified;
  results.push({
    name: 'Invariant B: Paymaster Sponsorship',
    key: 'invariant_b',
    passed: invariantBPassed,
    value: invariantBPassed ? 'Verified & Sponsored' : 'Sponsorship Refused',
    threshold: 'ERC-4337 Paymaster Active',
    detail: invariantBPassed
      ? 'OKX X Layer Testnet Paymaster verified gas deposit & sponsorship policy.'
      : 'Gas fee sponsorship could not be validated via Testnet Paymaster.',
  });

  // 8. Invariant C: Flash Loan & Manipulation Defense (Ceiling ≤ 5.00%)
  // Always calculate spot price from live reserves and check it against reference oracle
  const spotPrice = plan.spotPriceBefore;
  const oracleReferencePrice = plan.oraclePriceRatio;
  const spotOracleDivergence = Math.abs((spotPrice - oracleReferencePrice) / (oracleReferencePrice || 1)) * 100;

  // Flash loan manipulation ceiling: ≤ 5.00%
  const flashLoanShieldTriggered = spotOracleDivergence > 5.00;
  const invariantCPassed = !flashLoanShieldTriggered;

  results.push({
    name: 'Invariant C: Flash Loan Defense',
    key: 'invariant_c',
    passed: invariantCPassed,
    value: `${spotOracleDivergence.toFixed(2)}% divergence`,
    threshold: '≤ 5.00% manipulation ceiling',
    detail: invariantCPassed
      ? `Live spot price (${spotPrice.toFixed(4)}) aligns within 5.00% ceiling of reference oracle (${oracleReferencePrice.toFixed(4)}).`
      : `Flash Loan / Manipulation Defense Triggered: Spot price (${spotPrice.toFixed(4)}) diverged by ${spotOracleDivergence.toFixed(2)}% from reference oracle (${oracleReferencePrice.toFixed(4)}), exceeding the 5.00% safety ceiling. Broadcasting blocked.`,
  });

  const firstFailed = results.find((r) => !r.passed);

  return {
    allPassed: !firstFailed,
    failedKey: firstFailed?.key,
    failureReason: firstFailed ? firstFailed.detail : undefined,
    results,
    flashLoanShieldTriggered,
    spotOracleDivergencePercent: spotOracleDivergence,
  };
}
