import { StrictMode, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#070a12',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            padding: '24px',
            borderRadius: '12px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e', marginBottom: '8px' }}>
              Application Render Exception
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>
              The agent dashboard encountered an unhandled error:
            </p>
            <pre style={{
              background: '#04070e',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#fca5a5',
              overflowX: 'auto',
              fontFamily: 'monospace',
              marginBottom: '16px'
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #00f5d4 0%, #0088ff 100%)',
                color: '#070a12',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
