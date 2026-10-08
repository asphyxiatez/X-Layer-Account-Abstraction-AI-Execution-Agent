import type { Address } from '../types';
import { fetchLiveOnChainPoolData, getXLayerStatus } from './xlayerRpc';
import type { OnChainPoolData } from './xlayerRpc';

export type ConnectionState = 'CONNECTED' | 'FALLBACK_POLLING' | 'RECONNECTING' | 'DISCONNECTED';

export interface WatchdogMetrics {
  connectionState: ConnectionState;
  lastSyncTimestamp: number;
  lastSuccessfulPollTimestamp: number;
  consecutiveFailures: number;
  fallbackTriggerCount: number;
  reconnectCount: number;
  latencyMs: number;
  currentBlock: bigint;
}

export class RpcReconnectionGuard {
  private fallbackIntervalMs: number;
  private maxAllowedSilentIntervalMs: number;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private pairAddress: Address;
  private tokenA: Address;
  private tokenB: Address;

  private state: ConnectionState = 'CONNECTED';
  private lastSyncTimestamp: number = Date.now();
  private lastSuccessfulPollTimestamp: number = Date.now();
  private consecutiveFailures: number = 0;
  private fallbackTriggerCount: number = 0;
  private reconnectCount: number = 0;
  private latencyMs: number = 20;
  private currentBlock: bigint = 0n;

  private onDataCallback?: (data: OnChainPoolData) => void;
  private onStatusChangeCallback?: (metrics: WatchdogMetrics) => void;
  private onLogCallback?: (level: 'INFO' | 'WARN' | 'ERROR', message: string) => void;

  constructor(
    pairAddress: Address,
    tokenA: Address,
    tokenB: Address,
    fallbackIntervalSeconds: number = 15
  ) {
    this.pairAddress = pairAddress;
    this.tokenA = tokenA;
    this.tokenB = tokenB;
    this.fallbackIntervalMs = fallbackIntervalSeconds * 1000;
    this.maxAllowedSilentIntervalMs = fallbackIntervalSeconds * 1000;
  }

  public updateTargets(pairAddress: Address, tokenA: Address, tokenB: Address) {
    this.pairAddress = pairAddress;
    this.tokenA = tokenA;
    this.tokenB = tokenB;
  }

  public registerCallbacks(
    onData: (data: OnChainPoolData) => void,
    onStatusChange: (metrics: WatchdogMetrics) => void,
    onLog: (level: 'INFO' | 'WARN' | 'ERROR', message: string) => void
  ) {
    this.onDataCallback = onData;
    this.onStatusChangeCallback = onStatusChange;
    this.onLogCallback = onLog;
  }

  /**
   * Called when an event or block arrives (e.g. Sync event or block subscription)
   */
  public recordSyncEvent() {
    this.lastSyncTimestamp = Date.now();
    this.consecutiveFailures = 0;
    if (this.state !== 'CONNECTED') {
      this.state = 'CONNECTED';
      this.notifyStatus();
    }
  }

  /**
   * Starts the background watchdog timer that ensures resilience against dropped WebSocket / RPC listeners
   */
  public start() {
    if (this.intervalTimer) return;

    this.onLogCallback?.(
      'INFO',
      `RPC Reconnection Guard initialised. Watchdog polling active every ${this.fallbackIntervalMs / 1000}s.`
    );

    // Initial query
    this.executeFallbackPoll();

    this.intervalTimer = setInterval(() => {
      const timeSinceLastSync = Date.now() - this.lastSyncTimestamp;

      // If no Sync event received within threshold, fire fallback getReserves() polling
      if (timeSinceLastSync >= this.maxAllowedSilentIntervalMs) {
        this.executeFallbackPoll();
      }
    }, this.fallbackIntervalMs);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private async executeFallbackPoll() {
    this.fallbackTriggerCount++;
    const wasFallback = Date.now() - this.lastSyncTimestamp >= this.maxAllowedSilentIntervalMs;

    if (wasFallback && this.state !== 'FALLBACK_POLLING') {
      this.state = 'FALLBACK_POLLING';
      this.onLogCallback?.(
        'WARN',
        `No RPC Sync event in past ${Math.round((Date.now() - this.lastSyncTimestamp) / 1000)}s. Triggering fallback getReserves() query.`
      );
    }

    try {
      const [chainStatus, poolData] = await Promise.all([
        getXLayerStatus(),
        fetchLiveOnChainPoolData(this.pairAddress, this.tokenA, this.tokenB),
      ]);

      if (chainStatus.connected) {
        this.consecutiveFailures = 0;
        this.lastSuccessfulPollTimestamp = Date.now();
        this.latencyMs = chainStatus.latencyMs;
        this.currentBlock = chainStatus.blockNumber;

        if (this.state === 'RECONNECTING' || this.state === 'DISCONNECTED') {
          this.state = wasFallback ? 'FALLBACK_POLLING' : 'CONNECTED';
          this.onLogCallback?.('INFO', `RPC connection re-established on OKX X Layer Testnet block #${chainStatus.blockNumber}.`);
        }

        this.onDataCallback?.(poolData);
      } else {
        this.handleFailure();
      }
    } catch (err: any) {
      this.handleFailure(err.message);
    }

    this.notifyStatus();
  }

  private handleFailure(errorMsg?: string) {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= 2) {
      this.state = 'RECONNECTING';
      this.reconnectCount++;
      this.onLogCallback?.(
        'ERROR',
        `RPC connection dropped (${this.consecutiveFailures} consecutive timeouts). Re-establishing provider connection to OKX X Layer Testnet... ${errorMsg || ''}`
      );
    } else {
      this.state = 'FALLBACK_POLLING';
    }
  }

  private notifyStatus() {
    this.onStatusChangeCallback?.({
      connectionState: this.state,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSuccessfulPollTimestamp: this.lastSuccessfulPollTimestamp,
      consecutiveFailures: this.consecutiveFailures,
      fallbackTriggerCount: this.fallbackTriggerCount,
      reconnectCount: this.reconnectCount,
      latencyMs: this.latencyMs,
      currentBlock: this.currentBlock,
    });
  }

  public getMetrics(): WatchdogMetrics {
    return {
      connectionState: this.state,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSuccessfulPollTimestamp: this.lastSuccessfulPollTimestamp,
      consecutiveFailures: this.consecutiveFailures,
      fallbackTriggerCount: this.fallbackTriggerCount,
      reconnectCount: this.reconnectCount,
      latencyMs: this.latencyMs,
      currentBlock: this.currentBlock,
    };
  }
}
