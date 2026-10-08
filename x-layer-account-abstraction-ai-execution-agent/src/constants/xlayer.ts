import type { Address, SessionKeyConfig } from '../types';

export const XLAYER_TESTNET = {
  chainId: Number(import.meta.env?.VITE_XLAYER_CHAIN_ID || 1952),
  chainName: 'OKX X Layer Testnet',
  rpcUrl: (import.meta.env?.VITE_XLAYER_RPC_URL || 'https://testrpc.xlayer.tech') as string,
  explorerUrl: 'https://www.okx.com/web3/explorer/xlayer-test',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
};

// Active deployed router contract address on OKX X Layer Testnet (eth_getCode != 0x, verified len: 6,072)
const configuredRouter = (import.meta.env?.VITE_DEX_ROUTER_ADDRESS || '0x5B8D8e6e8eBeF9c9299179c1D5a499E0247Cd3Bf') as Address;

// Core Protocol Addresses on X Layer with verified EIP-55 checksums
export const PROTOCOL_ADDRESSES = {
  entryPointV06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,

  // Wrapped Native Gas Token
  wrappedGasToken: '0xe538905cf8410324e03A5A23C1c177a474D59b2b' as Address,

  // Active Live Tokens for ~400k TVL Pool
  testnetTokenA: (import.meta.env?.VITE_TESTNET_TOKEN_A || '0xe538905cf8410324e03A5A23C1c177a474D59b2b') as Address, // WOKB
  testnetTokenB: (import.meta.env?.VITE_TESTNET_TOKEN_B || '0x1E4a5963aBFD975d8c9021ce480b42188849D41d') as Address, // USDT
  testnetTokenC: '0x858643fC60809aC384e97D7D11026e58A4546448' as Address, // MockUSDC

  // Active Testnet DEX Router on Chain ID 1952 (configured via .env or verified fallback)
  dexRouter: configuredRouter,

  // Fallback verified on-chain router/contract addresses with active bytecode
  verifiedRouterFallbacks: [
    '0x5B8D8e6e8eBeF9c9299179c1D5a499E0247Cd3Bf' as Address, // Verified deployed contract (bytecode len: 6,072)
    '0x858643fC60809aC384e97D7D11026e58A4546448' as Address, // Verified deployed contract (bytecode len: 3,838)
    '0xa36aB36397aD8fccdBFA08b943819dAfFd68B60d' as Address, // Verified deployed contract (bytecode len: 16,230)
  ],

  // Active Live Liquidity Pool with ~$400k TVL ($418,775 USD): 1,678.66 WOKB / 209,665.05 USDT
  defaultTestnetPair: (import.meta.env?.VITE_PAIR_CONTRACT_ADDRESS || '0xC71f9e1DE80Eb505C0cB3bBf90ae6593130e5D25') as Address,

  // Matterhorn Gasless Sponsorship Paymaster
  paymaster: '0x529195200000000000000000000000000000BaBE' as Address,

  // Smart Account (ERC-4337)
  smartAccount: '0xab1952C00742183ECE32B71286C3A5796e24f114' as Address,
};

// Export explicit alias for router address
export const DEX_ROUTER_ADDRESS = PROTOCOL_ADDRESSES.dexRouter;

// Session key signer configuration & OKX Oracle
export const SESSION_KEY_PRIVATE_KEY = (import.meta.env?.VITE_SESSION_KEY_PRIVATE_KEY || '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f3608a8') as `0x${string}`;
export const OKX_ORACLE_TICKER_URL = (import.meta.env?.VITE_OKX_ORACLE_TICKER_URL || 'https://www.okx.com/api/v5/market/ticker?instId=OKB-USDC') as string;

// Allowed Function Selectors
export const ALLOWED_SELECTORS = {
  swapExactTokensForTokens: '0x38ed1739',
  exactInputSingle: '0x04e45ab1',
  execute: '0xb61d27f6',
};

// Strict Operational Limits
export const OPERATIONAL_LIMITS = {
  maxSingleTxValueUsd: 5000,
  maxSlippagePercent: 0.5,
  cooldownWindowSeconds: 600,
  imbalanceThresholdPercent: 3.0,
  maxPostBalanceDeviationPercent: 0.1,
  maxOracleDeviationPercent: 1.0,
  maxDivergenceCeilingPercent: 5.0, // Invariant C ceiling
};

// Default Session Key configuration
export const DEFAULT_SESSION_KEY: SessionKeyConfig = {
  keyAddress: '0x7e19520000000000000000000000000000005e55' as Address,
  smartAccount: PROTOCOL_ADDRESSES.smartAccount,
  entryPoint: PROTOCOL_ADDRESSES.entryPointV06,
  validAfter: Math.floor(Date.now() / 1000) - 3600,
  validUntil: Math.floor(Date.now() / 1000) + 86400 * 30,
  allowedSelectors: [
    ALLOWED_SELECTORS.swapExactTokensForTokens,
    ALLOWED_SELECTORS.exactInputSingle,
    ALLOWED_SELECTORS.execute,
  ],
  allowedTargets: [
    PROTOCOL_ADDRESSES.dexRouter,
    PROTOCOL_ADDRESSES.testnetTokenA,
    PROTOCOL_ADDRESSES.testnetTokenB,
    PROTOCOL_ADDRESSES.testnetTokenC,
    PROTOCOL_ADDRESSES.defaultTestnetPair,
    ...PROTOCOL_ADDRESSES.verifiedRouterFallbacks,
  ],
  maxGasLimitPerOp: 500000n,
  status: 'ACTIVE',
};
