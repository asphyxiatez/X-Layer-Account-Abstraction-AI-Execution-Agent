# X Layer Account Abstraction & AI Execution Agent

An autonomous on-chain rebalancing agent deployed on **OKX's X Layer Testnet (Chain ID: 1952)**. Built using Matterhorn AI execution primitives and integrated with **ERC-4337 Smart Accounts** with restricted session keys for gasless execution.

[![Network](https://img.shields.io/badge/Network-OKX_X_Layer_Testnet_(1952)-00f5d4?style=flat-square)](https://www.okx.com/web3/explorer/xlayer-test)
[![ERC-4337](https://img.shields.io/badge/Standard-ERC--4337_v0.6-0088ff?style=flat-square)](https://eips.ethereum.org/EIPS/eip-4337)
[![Paymaster](https://img.shields.io/badge/Gas-Paymaster_Sponsored-10b981?style=flat-square)]()
[![Status](https://img.shields.io/badge/Status-Production_MVP-f59e0b?style=flat-square)]()

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |          OKX X Layer Testnet (1952)         |
                                      +---------------------------------------------+
                                                             |
                                            Live State (eth_call / getCode)
                                                             v
+-----------------------+              +--------------------------------------------+
|   Matterhorn Agent    |  Calculates  |        Autonomous Rebalancing Engine       |
|    Telemetry Feed     | <----------  |  1. Imbalance Ratio Check (IR >= 3.0%)     |
+-----------------------+              |  2. Bytecode Integrity (eth_getCode != 0x) |
                                       |  3. Invariant Evaluation (A, B, C)         |
                                       |  4. Optimal Route Derivation (dx)          |
                                       +--------------------------------------------+
                                                             |
                                                Builds UserOperation
                                                             v
                                       +--------------------------------------------+
                                       |        ERC-4337 Session Key Signer         |
                                       |  - Restricted to DEX Router & Allowed Sels  |
                                       |  - Paymaster Gas Sponsorship Encoded       |
                                       +--------------------------------------------+
                                                             |
                                                  Submit to EntryPoint
                                                             v
                                       +--------------------------------------------+
                                       |    EntryPoint v0.6 (0x5FF137D4b0...)       |
                                       |                     |                      |
                                       |  execute(dest, 0, swapExactTokens...)      |
                                       |                     v                      |
                                       |           Target DEX Router                |
                                       +--------------------------------------------+
```

---

## Protocol Specifications

### 1. Network & Target Contracts
- **Chain ID**: `1952` (OKX X Layer Testnet)
- **RPC Endpoint**: `https://testrpc.xlayer.tech`
- **EntryPoint v0.6**: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- **Wrapped Native Gas (WOKB)**: `0x03CFA10915B35C83E582E5e37f8D56e54F2E4DF8`
- **Testnet USDC**: `0x2D7882beDcbfDDce29Ba99965c3B660867625966`
- **Testnet USDT**: `0x38122394b822b2b11f38377ab8351e41c36371ec`

### 2. Whitelisted Function Selectors
Only the following selectors are permitted within signed UserOperations:
- `0x38ed1739` -> `swapExactTokensForTokens(uint256,uint256,address[],address,uint256)`
- `0x04e45ab1` -> `exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))`
- `0xb61d27f6` -> `execute(address,uint256,bytes)`

---

## Operational Boundaries & Security Invariants

The autonomous supervisor halts execution planning immediately if any of these invariants are violated:

1. **Bytecode Integrity (`eth_getCode`)**:
   - Before any simulation or payload construction, an `eth_getCode` call checks the target DEX router and token addresses on Chain 1952.
   - If empty (`0x`), the agent returns `SKIPPED`: `"Target DEX router contract has no deployed bytecode on Chain 1952"`.

2. **Risk Envelopes**:
   - **Max Single Transaction Value**: Capped at `$5,000 USD` equivalent.
   - **Max Allowed Slippage**: Strictly enforced at `≤ 0.5%` (`minAmountOut`).
   - **Cooldown Window**: Minimum 600 seconds (10 minutes) between rebalancing actions.

3. **Core Invariant Verifications**:
   - **Invariant A**: Post-rebalance smart account asset value must converge within `0.1%` of target parity.
   - **Invariant B**: Gas fee sponsorship validated via OKX X Layer Testnet Paymaster before payload construction.
   - **Invariant C**: Oracle price deviation from testnet pool spot price must be `< 1.0%` (guards against flash-loan price manipulation).

---

## Trigger Condition & Rebalancing Math

The agent continuously polls the target pool state to compute the **Imbalance Ratio ($IR$)**:

$$IR = \left\vert{} \frac{\text{Reserve}_{\text{TokenA}} \times \text{Price}_{\text{TokenA}}}{\text{Reserve}_{\text{TokenB}} \times \text{Price}_{\text{TokenB}}} - 1 \right\vert{} \times 100$$

- **$IR < 3.0\%$**: Returns `SKIPPED`: `"Pool within target ratio bounds."`
- **$IR \ge 3.0\%$**: Triggers state `REBALANCE_REQUIRED` and proceeds to bytecode validation, invariant checks, optimal input ($dx$) derivation, and UserOp construction.

---

## Project Structure

```
├── contracts/
│   ├── interfaces/
│   │   └── IERC4337.sol         # IEntryPoint and IAccount interfaces
│   ├── SimpleAccount.sol        # ERC-4337 Smart Account with session key validation
│   └── MockDexRouter.sol        # Swap router supporting allowed selectors
├── src/
│   ├── constants/
│   │   └── xlayer.ts            # Network IDs, contract addresses, selectors & limits
│   ├── engine/
│   │   ├── rebalanceMath.ts     # Optimal swap dx derivation and IR calculations
│   │   ├── invariants.ts        # Hardcoded boundary & invariant evaluation
│   │   ├── userOpBuilder.ts     # ERC-4337 UserOperation assembly & calldata encoding
│   │   ├── xlayerRpc.ts         # Live OKX X Layer Testnet RPC integration & bytecode verifier
│   │   └── agentSupervisor.ts   # Core execution supervisor orchestrating duty cycles
│   ├── components/
│   │   ├── Header.tsx           # RPC status, session key & gasless badges
│   │   ├── MetricCards.tsx      # Monitored TVL, IR gauge, gas sponsored, duty state
│   │   ├── PoolMonitorCard.tsx  # Reserves breakdown, IR progress bar, spot vs oracle
│   │   ├── AgentControlPanel.tsx# Autonomous loop toggle, cycle runner, invariants status
│   │   ├── UserOpInspector.tsx  # Raw JSON output & decoded UserOp table
│   │   ├── TelemetryLogView.tsx # Real-time streaming agent telemetry
│   │   └── PoolPerturbModal.tsx # Interactive pool drift simulation tool
│   ├── styles/
│   │   └── theme.css            # Obsidian/cyan theme variables and styling
│   └── App.tsx                  # Root dashboard container
├── scripts/
│   └── rebalancer-agent.mjs     # Standalone autonomous CLI agent runner
└── .matterhorn/
    └── publish.json             # Walrus decentralised hosting configuration
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 24 LTS)
- npm or bun

### Installation
```bash
npm install
```

### Run the Development Dashboard
```bash
npm run dev -- --host 0.0.0.0 --port 5173
```
The application interface will be accessible in the **Preview** panel.

### Run the CLI Agent
```bash
node scripts/rebalancer-agent.mjs
```

### Production Build
```bash
npm run build
```

---

## Decentralised Hosting on Walrus

This repository includes `.matterhorn/publish.json` preconfigured for decentralised static hosting on **Walrus**:
```json
{
  "buildCommand": "npm run build",
  "outputDir": "dist",
  "spaFallback": true
}
```
Deploy instantly by clicking **Publish** in the Matterhorn **Deploy** tab.
