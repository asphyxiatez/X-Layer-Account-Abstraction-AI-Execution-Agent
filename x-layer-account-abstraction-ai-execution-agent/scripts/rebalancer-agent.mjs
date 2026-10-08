#!/usr/bin/env node

/**
 * X Layer Rebalancer Agent - Autonomous CLI Runner
 * Target: OKX X Layer Testnet (Chain ID 1952)
 * EntryPoint: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
 */

import { createPublicClient, http } from 'viem';

const XLAYER_RPC = process.env.VITE_XLAYER_RPC_URL || 'https://testrpc.xlayer.tech';
const CHAIN_ID = Number(process.env.VITE_XLAYER_CHAIN_ID || 1952);
const ROUTER = process.env.VITE_DEX_ROUTER_ADDRESS || '0x5B8D8e6e8eBeF9c9299179c1D5a499E0247Cd3Bf';
const ROUTER_FALLBACKS = [
  '0x5B8D8e6e8eBeF9c9299179c1D5a499E0247Cd3Bf',
  '0x858643fC60809aC384e97D7D11026e58A4546448',
  '0xa36aB36397aD8fccdBFA08b943819dAfFd68B60d',
];

const client = createPublicClient({
  transport: http(XLAYER_RPC),
});

async function main() {
  console.log(`[X-Layer-Rebalancer] Initialising agent on Chain ID ${CHAIN_ID}...`);

  try {
    const block = await client.getBlockNumber();
    console.log(`[X-Layer-Rebalancer] Connected to OKX X Layer Testnet. Block height: #${block}`);

    console.log(`[X-Layer-Rebalancer] Running automated pre-flight bytecode verification for Router (${ROUTER})...`);
    let activeRouter = ROUTER;
    let code = await client.getBytecode({ address: activeRouter });

    if (!code || code === '0x') {
      console.log(`[X-Layer-Rebalancer] Primary router returned 0x. Attempting automated pre-flight resolution...`);
      for (const fallback of ROUTER_FALLBACKS) {
        const fallbackCode = await client.getBytecode({ address: fallback });
        if (fallbackCode && fallbackCode !== '0x') {
          activeRouter = fallback;
          code = fallbackCode;
          console.log(`[X-Layer-Rebalancer] Pre-flight resolved to active on-chain contract: ${activeRouter} (bytecode len: ${code.length})`);
          break;
        }
      }
    }

    if (!code || code === '0x') {
      const output = {
        status: 'SKIPPED',
        reason: 'Target DEX router contract has no deployed bytecode on Chain 1952',
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(0);
    }

    console.log(`[X-Layer-Rebalancer] Bytecode verified successfully on Chain ID 1952 (${activeRouter}, len: ${code.length}).`);
  } catch (err) {
    console.error(`[X-Layer-Rebalancer] Error checking RPC:`, err.message);
  }
}

main();
