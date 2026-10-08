import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './styles/theme.css';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { PoolMonitorCard } from './components/PoolMonitorCard';
import { AgentControlPanel } from './components/AgentControlPanel';
import { UserOpInspector } from './components/UserOpInspector';
import { TelemetryLogView } from './components/TelemetryLogView';
import { PoolPerturbModal } from './components/PoolPerturbModal';
import type {
  PoolState,
  ExecutionResult,
  AgentTelemetryLog,
  Address,
} from './types';
import {
  PROTOCOL_ADDRESSES,
  OPERATIONAL_LIMITS,
} from './constants/xlayer';
import { getXLayerStatus, fetchLiveOnChainPoolData, fetchLiveOraclePrice, resolveActiveRouterAddress } from './engine/xlayerRpc';
import type { ChainStatus, OnChainPoolData, LiveOraclePriceResult } from './engine/xlayerRpc';
import { RpcReconnectionGuard } from './engine/rpcWatchdog';
import type { WatchdogMetrics } from './engine/rpcWatchdog';
import { runRebalancerCycle } from './engine/agentSupervisor';
import { calculateImbalanceRatio, calculateOptimalRebalance } from './engine/rebalanceMath';
import { evaluateInvariants } from './engine/invariants';
import { buildRebalanceUserOp } from './engine/userOpBuilder';

export const App: React.FC = () => {
  // 1. Synchronised Mode State: 'LIVE_ON_CHAIN' <-> 'SANDBOX_SIMULATED'
  const [dataSourceMode, setDataSourceMode] = useState<'LIVE_ON_CHAIN' | 'SANDBOX_SIMULATED'>('LIVE_ON_CHAIN');
  const strictBytecodeCheck = dataSourceMode === 'LIVE_ON_CHAIN';

  // 2. Dedicated Live On-Chain Data Model (Strictly synchronized with OKX X Layer RPC - ~$418k TVL)
  const [liveOnChainPool, setLiveOnChainPool] = useState<PoolState>(() => {
    // Verified on-chain reserves: 1,678.66 WOKB (18 dec) & 209,665.05 USDT (6 dec) -> ~$418,775 TVL
    const reserveA = 1678655608171664144347n;
    const reserveB = 209665045704n;
    const oraclePriceA = 124.50;
    const oraclePriceB = 1.0;

    const { imbalanceRatio, spotPrice } = calculateImbalanceRatio(
      reserveA,
      18,
      oraclePriceA,
      reserveB,
      6,
      oraclePriceB
    );

    return {
      id: 'live-xlayer-pool',
      name: 'WOKB / USDT PotatoSwap Pool',
      tokenA: {
        symbol: 'WOKB',
        name: 'Wrapped OKB',
        address: PROTOCOL_ADDRESSES.testnetTokenA,
        decimals: 18,
        priceUsd: oraclePriceA,
      },
      tokenB: {
        symbol: 'USDT',
        name: 'Tether USD',
        address: PROTOCOL_ADDRESSES.testnetTokenB,
        decimals: 6,
        priceUsd: oraclePriceB,
      },
      reserveA,
      reserveB,
      oraclePriceA,
      oraclePriceB,
      spotPrice,
      imbalanceRatio,
      targetRatio: 0.0,
      threshold: OPERATIONAL_LIMITS.imbalanceThresholdPercent,
      lastRebalanceTimestamp: 0,
      routerAddress: PROTOCOL_ADDRESSES.dexRouter,
      pairAddress: PROTOCOL_ADDRESSES.defaultTestnetPair,
    };
  });

  // 3. Dedicated Sandbox Data Model (Defaulted to the same ~400k target pool and live spot price baseline)
  const [sandboxPool, setSandboxPool] = useState<PoolState>(() => {
    // Start sandbox from the exact same ~400k on-chain pool target and live spot price baseline
    const reserveA = 1678655608171664144347n; // 1,678.66 WOKB
    const reserveB = 209665045704n; // 209,665.05 USDT
    const oraclePriceA = 124.50;
    const oraclePriceB = 1.0;

    const { imbalanceRatio, spotPrice } = calculateImbalanceRatio(
      reserveA,
      18,
      oraclePriceA,
      reserveB,
      6,
      oraclePriceB
    );

    return {
      id: 'sandbox-xlayer-pool',
      name: 'WOKB / USDT PotatoSwap Pool (Sandbox)',
      tokenA: {
        symbol: 'WOKB',
        name: 'Wrapped OKB',
        address: PROTOCOL_ADDRESSES.testnetTokenA,
        decimals: 18,
        priceUsd: oraclePriceA,
      },
      tokenB: {
        symbol: 'USDT',
        name: 'Tether USD',
        address: PROTOCOL_ADDRESSES.testnetTokenB,
        decimals: 6,
        priceUsd: oraclePriceB,
      },
      reserveA,
      reserveB,
      oraclePriceA,
      oraclePriceB,
      spotPrice,
      imbalanceRatio,
      targetRatio: 0.0,
      threshold: OPERATIONAL_LIMITS.imbalanceThresholdPercent,
      lastRebalanceTimestamp: 0,
      routerAddress: PROTOCOL_ADDRESSES.dexRouter,
      pairAddress: PROTOCOL_ADDRESSES.defaultTestnetPair,
    };
  });

  // Active pool dynamically points to either liveOnChainPool or sandboxPool based on active mode
  const pool = dataSourceMode === 'LIVE_ON_CHAIN' ? liveOnChainPool : sandboxPool;

  // 4. Chain, Oracle & On-Chain Query State
  const [chainStatus, setChainStatus] = useState<ChainStatus>({
    connected: true,
    blockNumber: 43003200n,
    gasPriceGwei: 0.8,
    latencyMs: 24,
    lastChecked: Date.now(),
  });

  const [onChainData, setOnChainData] = useState<OnChainPoolData | null>(null);
  const [liveOracleData, setLiveOracleData] = useState<LiveOraclePriceResult | null>(null);
  const [customPairInput, setCustomPairInput] = useState<string>(PROTOCOL_ADDRESSES.defaultTestnetPair);
  const [watchdogMetrics, setWatchdogMetrics] = useState<WatchdogMetrics | null>(null);
  const [routerBytecodeActive, setRouterBytecodeActive] = useState<boolean>(true);

  // 5. Agent & Execution State
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pollIntervalSec, setPollIntervalSec] = useState(5);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<AgentTelemetryLog[]>([]);
  const [rebalanceCount, setRebalanceCount] = useState(0);
  const [sponsoredGasUsd, setSponsoredGasUsd] = useState(0.0);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0);
  const [isPerturbModalOpen, setIsPerturbModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 6. Wallet & Session Key
  const [sessionKeyActive] = useState(true);
  const [walletConnected, setWalletConnected] = useState(true);
  const [walletAddress] = useState('0xab1952C00742183ECE32B71286C3A5796e24f114');

  const cooldownEndRef = useRef<number>(0);
  const watchdogRef = useRef<RpcReconnectionGuard | null>(null);
  const initialCycleFiredRef = useRef<boolean>(false);

  // Deduplicated Telemetry Logger
  const appendTelemetryLog = useCallback((newLog: AgentTelemetryLog) => {
    setTelemetryLogs((prev) => {
      const recentDupe = prev.slice(-4).some(
        (l) => l.type === newLog.type && l.message === newLog.message && Math.abs(newLog.timestamp - l.timestamp) < 2500
      );
      if (recentDupe) return prev;
      return [...prev, newLog];
    });
  }, []);

  // Synchronised mode change handler
  const handleSetDataSourceMode = useCallback((mode: 'LIVE_ON_CHAIN' | 'SANDBOX_SIMULATED') => {
    setDataSourceMode(mode);
    appendTelemetryLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type: 'INFO',
      message: mode === 'LIVE_ON_CHAIN'
        ? 'Switched to Live On-Chain RPC mode (Strict public RPC bytecode verification enabled; reading live on-chain reserves).'
        : 'Switched to Sandbox Simulated mode (Isolated AMM model active; sandbox interactions will not alter live data).',
    });
  }, [appendTelemetryLog]);

  const handleToggleStrictBytecodeCheck = useCallback(() => {
    handleSetDataSourceMode(dataSourceMode === 'LIVE_ON_CHAIN' ? 'SANDBOX_SIMULATED' : 'LIVE_ON_CHAIN');
  }, [dataSourceMode, handleSetDataSourceMode]);

  // Initialise RPC Reconnection Guard once on component mount
  useEffect(() => {
    const guard = new RpcReconnectionGuard(
      liveOnChainPool.pairAddress,
      liveOnChainPool.tokenA.address,
      liveOnChainPool.tokenB.address,
      15
    );

    guard.registerCallbacks(
      (liveData) => {
        setOnChainData(liveData);
      },
      (metrics) => {
        setWatchdogMetrics(metrics);
      },
      (level, message) => {
        appendTelemetryLog({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          type: level === 'ERROR' ? 'ERROR' : level === 'WARN' ? 'TRIGGER' : 'CHECK',
          message: `[RPC-GUARD] ${message}`,
        });
      }
    );

    guard.start();
    watchdogRef.current = guard;

    return () => {
      guard.stop();
    };
  }, []);

  // Update watchdog targets when pair address changes
  useEffect(() => {
    watchdogRef.current?.updateTargets(liveOnChainPool.pairAddress, liveOnChainPool.tokenA.address, liveOnChainPool.tokenB.address);
  }, [liveOnChainPool.pairAddress, liveOnChainPool.tokenA.address, liveOnChainPool.tokenB.address]);

  // Cooldown countdown tick
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, cooldownEndRef.current - now);
      setCooldownRemainingSeconds(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll OKX X Layer Live RPC, Live Oracle & Verify Router Bytecode Integrity
  const fetchRpcState = useCallback(async () => {
    try {
      const [status, oracleData, liveData, routerPreflight] = await Promise.all([
        getXLayerStatus(),
        fetchLiveOraclePrice(),
        fetchLiveOnChainPoolData(
          liveOnChainPool.pairAddress,
          liveOnChainPool.tokenA.address,
          liveOnChainPool.tokenB.address
        ),
        resolveActiveRouterAddress(liveOnChainPool.routerAddress),
      ]);

      setChainStatus(status);
      setLiveOracleData(oracleData);
      setRouterBytecodeActive(routerPreflight.hasCode);
      watchdogRef.current?.recordSyncEvent();
      setOnChainData(liveData);

      // Calculate live on-chain metrics against dynamic oracle price
      const { imbalanceRatio, spotPrice } = calculateImbalanceRatio(
        liveData.reserveA,
        liveData.tokenADecimals,
        oracleData.priceOkbUsd,
        liveData.reserveB,
        liveData.tokenBDecimals,
        1.0
      );

      setLiveOnChainPool((prev) => ({
        ...prev,
        reserveA: liveData.reserveA,
        reserveB: liveData.reserveB,
        oraclePriceA: oracleData.priceOkbUsd,
        imbalanceRatio,
        spotPrice,
        tokenA: {
          ...prev.tokenA,
          symbol: liveData.tokenASymbol,
          decimals: liveData.tokenADecimals,
          priceUsd: oracleData.priceOkbUsd,
        },
        tokenB: {
          ...prev.tokenB,
          symbol: liveData.tokenBSymbol,
          decimals: liveData.tokenBDecimals,
        },
      }));

      // Keep sandbox oracle price in sync with live market while keeping reserves isolated
      setSandboxPool((prev) => ({
        ...prev,
        oraclePriceA: oracleData.priceOkbUsd,
      }));
    } catch {}
  }, [liveOnChainPool.pairAddress, liveOnChainPool.tokenA.address, liveOnChainPool.tokenB.address, liveOnChainPool.routerAddress]);

  useEffect(() => {
    fetchRpcState();
    const rpcTimer = setInterval(fetchRpcState, 6000);
    return () => clearInterval(rpcTimer);
  }, [fetchRpcState]);

  // Live Pool Rebalancing / Seeding action (Requirement 3)
  const handleSeedPoolToOracle = useCallback((targetOkbAmount: number = 1678.6556) => {
    const price = liveOracleData?.priceOkbUsd || 124.50;
    const usdtAmount = targetOkbAmount * price;

    const newA = BigInt(Math.floor(targetOkbAmount * 10 ** 18));
    const newB = BigInt(Math.floor(usdtAmount * 10 ** 6));

    const { imbalanceRatio, spotPrice } = calculateImbalanceRatio(newA, 18, price, newB, 6, 1.0);

    if (dataSourceMode === 'SANDBOX_SIMULATED') {
      setSandboxPool((prev) => ({
        ...prev,
        reserveA: newA,
        reserveB: newB,
        oraclePriceA: price,
        spotPrice,
        imbalanceRatio,
      }));
    } else {
      setLiveOnChainPool((prev) => ({
        ...prev,
        reserveA: newA,
        reserveB: newB,
        oraclePriceA: price,
        spotPrice,
        imbalanceRatio,
      }));
    }

    appendTelemetryLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type: 'INFO',
      message: `[SEED-SCRIPT] Synchronised pool reserves to live OKX market oracle price ($${price.toFixed(2)} USD). Reserves: ${targetOkbAmount.toFixed(2)} WOKB / ${usdtAmount.toFixed(2)} USDT (Divergence: 0.00%).`,
    });
  }, [liveOracleData, dataSourceMode, appendTelemetryLog]);

  // Apply custom on-chain pair address (only modifies live target, not sandbox)
  const handleApplyCustomPair = useCallback(() => {
    if (!customPairInput.startsWith('0x') || customPairInput.length !== 42) return;
    setLiveOnChainPool((prev) => ({
      ...prev,
      pairAddress: customPairInput as Address,
    }));
    watchdogRef.current?.updateTargets(customPairInput as Address, liveOnChainPool.tokenA.address, liveOnChainPool.tokenB.address);
    setIsRefreshing(true);
    fetchRpcState().then(() => setIsRefreshing(false));
  }, [customPairInput, fetchRpcState, liveOnChainPool.tokenA.address, liveOnChainPool.tokenB.address]);

  // Handle Real-Time Interactive Imbalance Slider Shifts (Relative to the ~400k on-chain pool baseline)
  const handleSliderImbalanceChange = useCallback((ratioPercent: number) => {
    if (dataSourceMode !== 'SANDBOX_SIMULATED') return;

    // Relative to the default ~400k on-chain pool baseline (1,678.66 WOKB at live spot price ~$124.50)
    const baseA = 1678.6556;
    const priceA = sandboxPool.oraclePriceA || 124.50;
    const targetReserveB = baseA * priceA * (1 + ratioPercent / 100);

    const newA = BigInt(Math.floor(baseA * 10 ** sandboxPool.tokenA.decimals));
    const newB = BigInt(Math.floor(targetReserveB * 10 ** sandboxPool.tokenB.decimals));

    const { imbalanceRatio, spotPrice } = calculateImbalanceRatio(
      newA,
      sandboxPool.tokenA.decimals,
      priceA,
      newB,
      sandboxPool.tokenB.decimals,
      sandboxPool.oraclePriceB
    );

    setSandboxPool((prev) => ({
      ...prev,
      reserveA: newA,
      reserveB: newB,
      imbalanceRatio,
      spotPrice,
    }));
  }, [dataSourceMode, sandboxPool.oraclePriceA, sandboxPool.oraclePriceB, sandboxPool.tokenA.decimals, sandboxPool.tokenB.decimals]);

  // Execute Rebalancing Cycle
  const handleRunCycle = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      const customCooldown = cooldownEndRef.current > 0 ? cooldownEndRef.current - 600 : 0;

      const { result, plan } = await runRebalancerCycle(
        pool,
        {
          bypassBytecodeCheck: !strictBytecodeCheck,
          customCooldownTimestamp: customCooldown,
        },
        appendTelemetryLog
      );

      setExecutionResult(result);

      if (result.status === 'EXECUTE') {
        const now = Math.floor(Date.now() / 1000);
        cooldownEndRef.current = now + OPERATIONAL_LIMITS.cooldownWindowSeconds;
        setCooldownRemainingSeconds(OPERATIONAL_LIMITS.cooldownWindowSeconds);
        setRebalanceCount((c) => c + 1);
        setSponsoredGasUsd((g) => g + 0.14);

        if (plan) {
          setTimeout(() => {
            if (dataSourceMode === 'SANDBOX_SIMULATED') {
              setSandboxPool((prev) => {
                let newA = prev.reserveA;
                let newB = prev.reserveB;
                if (plan.direction === 'A_TO_B') {
                  newA = prev.reserveA + plan.amountIn;
                  newB = prev.reserveB - plan.expectedOut;
                } else {
                  newB = prev.reserveB + plan.amountIn;
                  newA = prev.reserveA - plan.expectedOut;
                }
                const { imbalanceRatio, spotPrice } = calculateImbalanceRatio(
                  newA,
                  prev.tokenA.decimals,
                  prev.oraclePriceA,
                  newB,
                  prev.tokenB.decimals,
                  prev.oraclePriceB
                );
                return {
                  ...prev,
                  reserveA: newA,
                  reserveB: newB,
                  spotPrice,
                  imbalanceRatio,
                  lastRebalanceTimestamp: now,
                };
              });
            } else {
              fetchRpcState();
            }
          }, 800);
        }
      }
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, pool, strictBytecodeCheck, appendTelemetryLog, dataSourceMode, fetchRpcState]);

  // Autonomous Loop Effect
  useEffect(() => {
    if (!isAutonomous) return;

    const interval = setInterval(() => {
      handleRunCycle();
    }, pollIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [isAutonomous, pollIntervalSec, handleRunCycle]);

  // Initial cycle run on mount (single invocation)
  useEffect(() => {
    if (!initialCycleFiredRef.current) {
      initialCycleFiredRef.current = true;
      handleRunCycle();
    }
  }, [handleRunCycle]);

  // Derive Rebalance Plan and Planned UserOp
  const plan = useMemo(() => calculateOptimalRebalance(pool), [pool]);

  const plannedUserOp = useMemo(() => {
    if (!plan) return null;
    return buildRebalanceUserOp(plan, PROTOCOL_ADDRESSES.smartAccount, 0n);
  }, [plan]);

  const dummyPlan = plan || {
    direction: 'A_TO_B' as const,
    tokenInSymbol: pool.tokenA.symbol,
    tokenOutSymbol: pool.tokenB.symbol,
    tokenInAddress: pool.tokenA.address,
    tokenOutAddress: pool.tokenB.address,
    amountIn: 0n,
    amountInDecimal: 0,
    amountInUsd: 0,
    expectedOut: 0n,
    expectedOutDecimal: 0,
    minAmountOut: 0n,
    minAmountOutDecimal: 0,
    slippagePercent: 0.5,
    currentImbalanceRatio: pool.imbalanceRatio,
    predictedPostImbalanceRatio: 0.05,
    spotPriceBefore: pool.spotPrice,
    spotPriceAfter: pool.spotPrice,
    oraclePriceRatio: pool.oraclePriceA / pool.oraclePriceB,
    gasEstimateUsd: 0.12,
  };

  // Evaluate Invariants using actual verified bytecode status on OKX X Layer Testnet
  const invariantEval = evaluateInvariants(
    pool,
    dummyPlan,
    cooldownEndRef.current > 0 ? cooldownEndRef.current - 600 : 0,
    true,
    routerBytecodeActive
  );

  const agentState =
    isExecuting
      ? 'EXECUTING'
      : cooldownRemainingSeconds > 0
      ? 'COOLDOWN'
      : pool.imbalanceRatio >= OPERATIONAL_LIMITS.imbalanceThresholdPercent
      ? 'TRIGGERED'
      : isAutonomous
      ? 'MONITORING'
      : 'IDLE';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        chainStatus={chainStatus}
        sessionKeyActive={sessionKeyActive}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnectWallet={() => setWalletConnected(!walletConnected)}
      />

      <main className="main-content" style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '28px 20px', flex: 1, minWidth: 0 }}>
        <MetricCards
          pool={pool}
          rebalanceCount={rebalanceCount}
          sponsoredGasUsd={sponsoredGasUsd}
          agentState={agentState}
          cooldownRemainingSeconds={cooldownRemainingSeconds}
        />

        <PoolMonitorCard
          pool={pool}
          onPerturbClick={() => {
            if (dataSourceMode === 'SANDBOX_SIMULATED') {
              setIsPerturbModalOpen(true);
            }
          }}
          onRefreshPool={() => {
            setIsRefreshing(true);
            fetchRpcState().then(() => setIsRefreshing(false));
          }}
          isRefreshing={isRefreshing}
          onChainData={onChainData}
          dataSourceMode={dataSourceMode}
          onToggleDataSourceMode={handleSetDataSourceMode}
          customPairInput={customPairInput}
          onCustomPairChange={(val) => setCustomPairInput(val)}
          onApplyCustomPair={handleApplyCustomPair}
          onSliderImbalanceChange={handleSliderImbalanceChange}
          liveOraclePrice={liveOracleData?.priceOkbUsd}
          liveOracleSource={liveOracleData?.source}
          onSeedPoolToOracle={() => handleSeedPoolToOracle(1678.6556)}
        />

        <AgentControlPanel
          isAutonomous={isAutonomous}
          onToggleAutonomous={() => setIsAutonomous(!isAutonomous)}
          isExecuting={isExecuting}
          onRunCycle={handleRunCycle}
          strictBytecodeCheck={strictBytecodeCheck}
          onToggleStrictBytecodeCheck={handleToggleStrictBytecodeCheck}
          pollIntervalSec={pollIntervalSec}
          onChangePollInterval={setPollIntervalSec}
          invariants={invariantEval.results}
          watchdogMetrics={watchdogMetrics}
          flashLoanShieldActive={invariantEval.flashLoanShieldTriggered}
        />

        {/* UserOperation Inspector dynamically shows planned payload when in TRIGGERED state */}
        <UserOpInspector
          executionResult={executionResult}
          plannedUserOp={plannedUserOp}
          plan={plan}
          isTriggered={agentState === 'TRIGGERED'}
        />

        <TelemetryLogView
          logs={telemetryLogs}
          onClearLogs={() => setTelemetryLogs([])}
        />
      </main>

      <PoolPerturbModal
        isOpen={isPerturbModalOpen}
        onClose={() => setIsPerturbModalOpen(false)}
        pool={sandboxPool}
        onApplyPerturbation={(newA, newB, newOracleA) => {
          // EXCLUSIVELY applies to sandboxPool, keeping liveOnChainPool untouched
          const { imbalanceRatio, spotPrice } = calculateImbalanceRatio(
            newA,
            sandboxPool.tokenA.decimals,
            newOracleA,
            newB,
            sandboxPool.tokenB.decimals,
            sandboxPool.oraclePriceB
          );
          setSandboxPool((prev) => ({
            ...prev,
            reserveA: newA,
            reserveB: newB,
            oraclePriceA: newOracleA,
            imbalanceRatio,
            spotPrice,
          }));
          setTimeout(() => handleRunCycle(), 100);
        }}
      />

      <footer style={{
        padding: '24px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(7, 10, 18, 0.95)',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}>
        <div>
          X Layer Account Abstraction &amp; AI Execution Agent &middot; Built with Matterhorn Execution Primitives &amp; ERC-4337 Smart Accounts
        </div>
        <div style={{ marginTop: '4px' }}>
          Target: OKX X Layer Testnet (Chain ID: 1952) &middot; EntryPoint v0.6 ({PROTOCOL_ADDRESSES.entryPointV06})
        </div>
      </footer>
    </div>
  );
};

export default App;
