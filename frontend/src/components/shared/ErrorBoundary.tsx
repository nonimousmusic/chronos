import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', 
          backgroundColor: '#0a0a0a', 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px', 
            padding: '40px', 
            background: 'rgba(255, 45, 85, 0.05)', 
            border: '1px solid rgba(255, 45, 85, 0.2)', 
            borderRadius: '24px', 
            textAlign: 'center'
          }}>
            <AlertCircle size={48} color="#ff2d55" style={{ margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>System Crash Detected</h2>
            <p style={{ color: '#a1a1aa', marginBottom: '32px', lineHeight: '1.6' }}>
              The Sentinel system encountered an unexpected UI error. Your vital telemetry and hash chains are still recording in the robust backend.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', fontSize: '12px', color: '#ff8a8a', fontFamily: 'monospace', textAlign: 'left', marginBottom: '32px', overflowX: 'auto' }}>
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
              Reboot Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
