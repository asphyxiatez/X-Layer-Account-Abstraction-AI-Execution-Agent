export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export interface TokenInfo {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  priceUsd: number;
  icon?: string;
}

export interface PoolState {
  id: string;
  name: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserveA: bigint;
  reserveB: bigint;
  oraclePriceA: number;
  oraclePriceB: number;
  spotPrice: number; // TokenA in terms of TokenB
  imbalanceRatio: number; // IR percentage e.g. 3.42
  targetRatio: number; // 0.0%
  threshold: number; // 3.0%
  lastRebalanceTimestamp: number;
  routerAddress: Address;
  pairAddress: Address;
}

export interface UserOperation {
  sender: Address;
  nonce: Hex;
  initCode: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
  signature: string;
}

export interface SimulationResult {
  status: 'SUCCESS' | 'FAILED' | 'REVERTED';
  expected_gas_used: string;
  min_amount_out: string;
  execution_price?: number;
  gas_estimate_usd?: number;
  error?: string;
}

export interface ExecuteOutput {
  status: 'EXECUTE';
  timestamp: number;
  chain_id: number;
  trigger_reason: string;
  simulation: SimulationResult;
  user_operation: UserOperation;
  rebalance_details: {
    swapDirection: 'A_TO_B' | 'B_TO_A';
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    expectedOut: string;
    minAmountOut: string;
    slippageEnforced: string;
    imbalanceBefore: string;
    imbalanceAfterPredicted: string;
  };
}

export interface SkippedOutput {
  status: 'SKIPPED';
  reason: string;
}

export type ExecutionResult = ExecuteOutput | SkippedOutput;

export interface InvariantCheckResult {
  name: string;
  key: 'invariant_a' | 'invariant_b' | 'invariant_c' | 'max_value' | 'slippage' | 'cooldown' | 'bytecode';
  passed: boolean;
  value: string;
  threshold: string;
  detail: string;
}

export interface AgentTelemetryLog {
  id: string;
  timestamp: number;
  type: 'CHECK' | 'TRIGGER' | 'SIMULATION' | 'EXECUTION' | 'SKIPPED' | 'ERROR' | 'INFO';
  message: string;
  metadata?: Record<string, any>;
}

export interface SessionKeyConfig {
  keyAddress: Address;
  smartAccount: Address;
  entryPoint: Address;
  validAfter: number;
  validUntil: number;
  allowedSelectors: string[];
  allowedTargets: Address[];
  maxGasLimitPerOp: bigint;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}
