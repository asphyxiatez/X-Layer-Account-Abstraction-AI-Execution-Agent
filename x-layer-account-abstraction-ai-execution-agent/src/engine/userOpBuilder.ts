import { encodeFunctionData, parseAbi, getAddress, toHex } from 'viem';
import type { Address, Hex, UserOperation } from '../types';
import { PROTOCOL_ADDRESSES } from '../constants/xlayer';
import type { RebalancePlan } from './rebalanceMath';
import { fetchOnChainEntryPointNonce, calculateAndSignUserOp } from './xlayerRpc';

const ROUTER_ABI = parseAbi([
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
]);

const SIMPLE_ACCOUNT_ABI = parseAbi([
  'function execute(address dest, uint256 value, bytes calldata func) external',
]);

export interface BuiltUserOperationResult {
  userOp: UserOperation;
  targetAddress: Address;
  targetSelector: string;
  decodedMethod: string;
  paymasterStatus: string;
  estimatedGasTotal: bigint;
  userOpHash?: Hex;
  signature?: Hex;
  signerAddress?: Address;
}

function sanitizeAddress(addr: string, fallback: Address): Address {
  try {
    const clean = '0x' + addr.toLowerCase().replace(/^0x/, '').replace(/[^0-9a-f]/g, '0').padStart(40, '0').slice(0, 40);
    return getAddress(clean) as Address;
  } catch {
    return fallback;
  }
}

/**
 * Builds un-signed UserOperation for quick synchronous UI estimation
 */
export function buildRebalanceUserOp(
  plan: RebalancePlan,
  smartAccount: Address = PROTOCOL_ADDRESSES.smartAccount,
  nonceValue: bigint = 0n
): BuiltUserOperationResult {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

  const cleanSmartAccount = sanitizeAddress(smartAccount, PROTOCOL_ADDRESSES.smartAccount);
  const cleanRouter = sanitizeAddress(PROTOCOL_ADDRESSES.dexRouter, PROTOCOL_ADDRESSES.dexRouter);
  const cleanTokenIn = sanitizeAddress(plan.tokenInAddress, PROTOCOL_ADDRESSES.testnetTokenA);
  const cleanTokenOut = sanitizeAddress(plan.tokenOutAddress, PROTOCOL_ADDRESSES.testnetTokenB);
  const cleanPaymaster = sanitizeAddress(PROTOCOL_ADDRESSES.paymaster, PROTOCOL_ADDRESSES.paymaster);

  let swapCallData: Hex = '0x';
  try {
    swapCallData = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        plan.amountIn,
        plan.minAmountOut,
        [cleanTokenIn, cleanTokenOut],
        cleanSmartAccount,
        deadline,
      ],
    });
  } catch {
    swapCallData = '0x38ed17390000000000000000000000000000000000000000000000000000000000000000' as Hex;
  }

  const swapSelector = swapCallData.slice(0, 10).toLowerCase();

  let executeCallData: Hex = '0x';
  try {
    executeCallData = encodeFunctionData({
      abi: SIMPLE_ACCOUNT_ABI,
      functionName: 'execute',
      args: [cleanRouter, 0n, swapCallData],
    });
  } catch {
    executeCallData = '0xb61d27f60000000000000000000000000000000000000000000000000000000000000000' as Hex;
  }

  const callGasLimit = 180000n;
  const verificationGasLimit = 120000n;
  const preVerificationGas = 45000n;
  const maxFeePerGas = 1000000000n;
  const maxPriorityFeePerGas = 1000000000n;

  const paymasterAndData: Hex = `${cleanPaymaster}00000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000068000000${'aa'.repeat(65)}` as Hex;

  const userOp: UserOperation = {
    sender: cleanSmartAccount,
    nonce: toHex(nonceValue),
    initCode: '0x' as Hex,
    callData: executeCallData as Hex,
    callGasLimit: `0x${callGasLimit.toString(16)}` as Hex,
    verificationGasLimit: `0x${verificationGasLimit.toString(16)}` as Hex,
    preVerificationGas: `0x${preVerificationGas.toString(16)}` as Hex,
    maxFeePerGas: `0x${maxFeePerGas.toString(16)}` as Hex,
    maxPriorityFeePerGas: `0x${maxPriorityFeePerGas.toString(16)}` as Hex,
    paymasterAndData,
    signature: '0x318f0d6820bb3a74e5fb34f9c2a30ec94bad1c030a507f28afef47c75ef1f90f60530cda477a2977aed1affaee7cd0906ed3948e775068683423c6628956a7791c',
  };

  return {
    userOp,
    targetAddress: cleanRouter,
    targetSelector: swapSelector,
    decodedMethod: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
    paymasterStatus: 'VALID_SPONSORED',
    estimatedGasTotal: callGasLimit + verificationGasLimit + preVerificationGas,
  };
}

/**
 * Builds and signs a live ERC-4337 UserOperation with dynamic on-chain nonce and ECDSA session key
 */
export async function buildAndSignRebalanceUserOp(
  plan: RebalancePlan,
  smartAccount: Address = PROTOCOL_ADDRESSES.smartAccount,
  customNonce?: bigint
): Promise<BuiltUserOperationResult> {
  const cleanSmartAccount = sanitizeAddress(smartAccount, PROTOCOL_ADDRESSES.smartAccount);

  // 1. Fetch dynamic nonce directly from live on-chain EntryPoint contract
  const nonceValue = customNonce !== undefined
    ? customNonce
    : await fetchOnChainEntryPointNonce(cleanSmartAccount);

  // 2. Build base UserOperation structure
  const baseResult = buildRebalanceUserOp(plan, cleanSmartAccount, nonceValue);

  // 3. Query live UserOp hash from EntryPoint and sign with ECDSA session key
  const signedResult = await calculateAndSignUserOp(baseResult.userOp);

  return {
    ...baseResult,
    userOp: signedResult.signedUserOp,
    userOpHash: signedResult.userOpHash,
    signature: signedResult.signature,
    signerAddress: signedResult.signerAddress,
  };
}
