import type { PoolState } from '../types';
import { OPERATIONAL_LIMITS } from '../constants/xlayer';

export interface RebalancePlan {
  direction: 'A_TO_B' | 'B_TO_A';
  tokenInSymbol: string;
  tokenOutSymbol: string;
  tokenInAddress: `0x${string}`;
  tokenOutAddress: `0x${string}`;
  amountIn: bigint;
  amountInDecimal: number;
  amountInUsd: number;
  expectedOut: bigint;
  expectedOutDecimal: number;
  minAmountOut: bigint;
  minAmountOutDecimal: number;
  slippagePercent: number;
  currentImbalanceRatio: number;
  predictedPostImbalanceRatio: number;
  spotPriceBefore: number;
  spotPriceAfter: number;
  oraclePriceRatio: number;
  gasEstimateUsd: number;
}

/**
 * Computes the Pool Imbalance Ratio:
 * IR = | (Reserve_A * Price_A) / (Reserve_B * Price_B) - 1 | * 100
 */
export function calculateImbalanceRatio(
  reserveA: bigint,
  decimalsA: number,
  priceA: number,
  reserveB: bigint,
  decimalsB: number,
  priceB: number
): {
  imbalanceRatio: number;
  valueAUsd: number;
  valueBUsd: number;
  spotPrice: number;
  oraclePriceRatio: number;
} {
  const normA = Number(reserveA) / 10 ** decimalsA;
  const normB = Number(reserveB) / 10 ** decimalsB;

  const valueAUsd = normA * priceA;
  const valueBUsd = normB * priceB;

  const oraclePriceRatio = priceA / (priceB || 1);

  if (normA === 0 || normB === 0 || valueBUsd === 0 || valueAUsd === 0) {
    return {
      imbalanceRatio: 0,
      valueAUsd,
      valueBUsd,
      spotPrice: normA > 0 && normB > 0 ? normB / normA : oraclePriceRatio,
      oraclePriceRatio,
    };
  }

  const ratio = (valueAUsd / valueBUsd);
  const imbalanceRatio = Math.abs(ratio - 1) * 100;
  const spotPrice = normB / normA; // Token B per Token A

  return {
    imbalanceRatio: Number(imbalanceRatio.toFixed(2)),
    valueAUsd,
    valueBUsd,
    spotPrice,
    oraclePriceRatio,
  };
}

/**
 * Calculates optimal swap amount dx to restore pool balance:
 * Target: Value_A_after = Value_B_after
 * In constant product x * y = k with fee gamma = 0.997 (0.3% fee)
 */
export function calculateOptimalRebalance(
  pool: PoolState,
  feeBps: number = 30
): RebalancePlan | null {
  const { imbalanceRatio, valueAUsd, valueBUsd, spotPrice, oraclePriceRatio } =
    calculateImbalanceRatio(
      pool.reserveA,
      pool.tokenA.decimals,
      pool.oraclePriceA,
      pool.reserveB,
      pool.tokenB.decimals,
      pool.oraclePriceB
    );

  const normA = Number(pool.reserveA) / 10 ** pool.tokenA.decimals;
  const normB = Number(pool.reserveB) / 10 ** pool.tokenB.decimals;
  const gamma = 1 - feeBps / 10000;

  let direction: 'A_TO_B' | 'B_TO_A';
  let optimalInput = 0;

  if (valueAUsd > valueBUsd) {
    direction = 'B_TO_A';
    const k = normA * normB;
    const targetB = Math.sqrt(k * (pool.oraclePriceA / pool.oraclePriceB));
    optimalInput = Math.max(0, (targetB - normB) / gamma);
  } else {
    direction = 'A_TO_B';
    const k = normA * normB;
    const targetA = Math.sqrt(k * (pool.oraclePriceB / pool.oraclePriceA));
    optimalInput = Math.max(0, (targetA - normA) / gamma);
  }

  if (optimalInput <= 0) return null;

  // Cap at maximum single transaction value ($5,000 USD equivalent)
  const tokenInPrice = direction === 'A_TO_B' ? pool.oraclePriceA : pool.oraclePriceB;
  const maxAllowedInput = OPERATIONAL_LIMITS.maxSingleTxValueUsd / tokenInPrice;
  const finalInputDecimal = Math.min(optimalInput, maxAllowedInput);

  const tokenInDecimals = direction === 'A_TO_B' ? pool.tokenA.decimals : pool.tokenB.decimals;
  const tokenOutDecimals = direction === 'A_TO_B' ? pool.tokenB.decimals : pool.tokenA.decimals;

  const amountIn = BigInt(Math.floor(finalInputDecimal * 10 ** tokenInDecimals));
  const amountInUsd = finalInputDecimal * tokenInPrice;

  // Calculate expected output using constant product formula
  let expectedOutDecimal = 0;
  let newNormA = normA;
  let newNormB = normB;

  if (direction === 'A_TO_B') {
    const inputWithFee = finalInputDecimal * gamma;
    expectedOutDecimal = (normB * inputWithFee) / (normA + inputWithFee);
    newNormA += finalInputDecimal;
    newNormB -= expectedOutDecimal;
  } else {
    const inputWithFee = finalInputDecimal * gamma;
    expectedOutDecimal = (normA * inputWithFee) / (normB + inputWithFee);
    newNormB += finalInputDecimal;
    newNormA -= expectedOutDecimal;
  }

  // 0.5% max allowed slippage
  const slippagePercent = OPERATIONAL_LIMITS.maxSlippagePercent;
  const minAmountOutDecimal = expectedOutDecimal * (1 - slippagePercent / 100);
  const minAmountOut = BigInt(Math.floor(minAmountOutDecimal * 10 ** tokenOutDecimals));
  const expectedOut = BigInt(Math.floor(expectedOutDecimal * 10 ** tokenOutDecimals));

  // Compute predicted post-rebalance imbalance
  const postResult = calculateImbalanceRatio(
    BigInt(Math.floor(newNormA * 10 ** pool.tokenA.decimals)),
    pool.tokenA.decimals,
    pool.oraclePriceA,
    BigInt(Math.floor(newNormB * 10 ** pool.tokenB.decimals)),
    pool.tokenB.decimals,
    pool.oraclePriceB
  );

  return {
    direction,
    tokenInSymbol: direction === 'A_TO_B' ? pool.tokenA.symbol : pool.tokenB.symbol,
    tokenOutSymbol: direction === 'A_TO_B' ? pool.tokenB.symbol : pool.tokenA.symbol,
    tokenInAddress: direction === 'A_TO_B' ? pool.tokenA.address : pool.tokenB.address,
    tokenOutAddress: direction === 'A_TO_B' ? pool.tokenB.address : pool.tokenA.address,
    amountIn,
    amountInDecimal: finalInputDecimal,
    amountInUsd,
    expectedOut,
    expectedOutDecimal,
    minAmountOut,
    minAmountOutDecimal,
    slippagePercent,
    currentImbalanceRatio: imbalanceRatio,
    predictedPostImbalanceRatio: postResult.imbalanceRatio,
    spotPriceBefore: spotPrice,
    spotPriceAfter: postResult.spotPrice,
    oraclePriceRatio,
    gasEstimateUsd: 0.12,
  };
}
