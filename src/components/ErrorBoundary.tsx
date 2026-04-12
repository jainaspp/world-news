import { Component, ReactNode } from 'react';
import { reportError } from '../utils/errorTracker';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: unknown; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(err: unknown, info: { componentStack?: string }) {
    reportError(err, { type: 'react_boundary', componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error instanceof Error
        ? this.state.error.message
        : '載入錯誤，請稍後再試';
      return (
        <div style={{
          textAlign: 'center', padding: '40px 24px', color: 'var(--text-sec)',
          fontFamily: 'inherit', minHeight: '60vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16,
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h2 style={{ fontSize: '1.1em', fontWeight: 700, color: 'var(--text)' }}>載入失敗</h2>
          <p style={{ fontSize: '0.85em', maxWidth: 360, lineHeight: 1.6, color: '#666' }}>
            {message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px', padding: '10px 24px',
              background: '#0070f3', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '0.9em',
            }}
          >
            🔄 重新載入
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
