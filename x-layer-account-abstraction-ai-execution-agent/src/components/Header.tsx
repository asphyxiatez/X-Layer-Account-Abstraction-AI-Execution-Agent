import React from 'react';
import { ShieldCheck, Zap, Activity, ExternalLink } from 'lucide-react';
import type { ChainStatus } from '../engine/xlayerRpc';
import { XLAYER_TESTNET } from '../constants/xlayer';

interface HeaderProps {
  chainStatus: ChainStatus;
  sessionKeyActive: boolean;
  walletConnected: boolean;
  walletAddress: string;
  onConnectWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  chainStatus,
  sessionKeyActive,
  walletConnected,
  walletAddress,
  onConnectWallet,
}) => {
  return (
    <header
      className="app-header"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(7, 10, 18, 0.90)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: '16px',
        width: '100%',
      }}
    >
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        {/* Pixelated OKX X Layer Icon Badge */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            background: '#020408',
            border: '1px solid rgba(0, 245, 212, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 245, 212, 0.25), inset 0 0 10px rgba(0, 0, 0, 0.9)',
            flexShrink: 0,
            position: 'relative',
          }}
          title="OKX X Layer"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ shapeRendering: 'crispEdges' }}
          >
            {/* Center pixel block - OKX electric cyan */}
            <rect x="18" y="18" width="12" height="12" fill="#00f5d4" />
            {/* Diagonal corner pixel blocks - stark white */}
            <rect x="6" y="6" width="12" height="12" fill="#ffffff" />
            <rect x="30" y="6" width="12" height="12" fill="#ffffff" />
            <rect x="6" y="30" width="12" height="12" fill="#ffffff" />
            <rect x="30" y="30" width="12" height="12" fill="#ffffff" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="header-brand-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              X Layer Rebalancing Agent
            </h1>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--accent-cyan-dim)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 245, 212, 0.25)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              Production MVP
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Autonomous AMM rebalancing &middot; ERC-4337 Smart Account via Restricted Session Keys
          </p>
        </div>
      </div>

      {/* Network, Creator Credit & Account Badges */}
      <div className="header-badges-wrap" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        {/* Creator / Maker Credit */}
        <a
          href="https://web.matterhorn.so/s/E0CbMtoFNZPKA6kkpHZ2XQXfDYgD3w0-QbqLZABe48Q"
          target="_blank"
          rel="noopener noreferrer"
          className="maker-credit"
          title="Visit Kai Sheng Yeo's profile"
        >
          <span style={{ color: 'var(--text-muted)' }}>Made by</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>Kai Sheng Yeo</span>
          <ExternalLink size={12} style={{ color: 'var(--accent-cyan)', opacity: 0.8 }} />
        </a>

        {/* Network status */}
        <a
          href={XLAYER_TESTNET.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
          title="OKX X Layer Testnet Explorer"
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: chainStatus.connected ? 'var(--accent-green)' : 'var(--accent-amber)',
              boxShadow: chainStatus.connected ? '0 0 8px var(--accent-green)' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>X Layer Testnet</span>
          <span style={{ color: 'var(--text-muted)' }}>({XLAYER_TESTNET.chainId})</span>
          {chainStatus.blockNumber > 0n && (
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '11px' }}>
              #{chainStatus.blockNumber.toString()}
            </span>
          )}
          <ExternalLink size={12} style={{ opacity: 0.6 }} />
        </a>

        {/* Gasless Paymaster Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-cyan-dim)',
            border: '1px solid rgba(0, 245, 212, 0.25)',
            color: 'var(--accent-cyan)',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <Zap size={14} />
          <span>Paymaster: Sponsored</span>
        </div>

        {/* Session Key Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: sessionKeyActive ? 'var(--accent-blue-dim)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${sessionKeyActive ? 'rgba(0, 136, 255, 0.3)' : 'var(--border-subtle)'}`,
            color: sessionKeyActive ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldCheck size={14} />
          <span>Session Key: {sessionKeyActive ? 'Active' : 'Unsigned'}</span>
        </div>

        {/* Wallet / Smart Account Button */}
        <button
          onClick={onConnectWallet}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 15px',
            borderRadius: 'var(--radius-sm)',
            background: walletConnected
              ? 'rgba(255, 255, 255, 0.08)'
              : 'linear-gradient(135deg, #00f5d4 0%, #00b4d8 100%)',
            color: walletConnected ? 'var(--text-primary)' : '#070a12',
            fontWeight: 600,
            fontSize: '12px',
            border: walletConnected ? '1px solid var(--border-subtle)' : 'none',
            boxShadow: walletConnected ? 'none' : '0 0 16px rgba(0, 245, 212, 0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          <Activity size={14} />
          {walletConnected ? (
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </header>
  );
};
