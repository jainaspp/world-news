import { Component, ReactNode } from 'react';
import { reportError } from '../utils/errorTracker';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(e: unknown): State {
    return { hasError: true, message: e instanceof Error ? e.message : '載入錯誤，請重新整理頁面' };
  }

  componentDidCatch(err: unknown, info: { componentStack?: string }) {
    reportError(err, { type: 'react_boundary', componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          textAlign: 'center', padding: '48px 24px', color: 'var(--text-sec)',
          fontFamily: 'inherit', minHeight: '60vh', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h2 style={{ fontSize: '1.1em', fontWeight: 700, color: 'var(--text)' }}>頁面發生錯誤</h2>
          <p style={{ fontSize: '0.85em', maxWidth: 360, lineHeight: 1.6 }}>{this.state.message}</p>
          <p style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
            請檢查網絡連線，或{' '}
            <button onClick={() => location.reload()} style={{
              background: 'none', border: 'none', color: '#3b82f6',
              cursor: 'pointer', textDecoration: 'underline', fontSize: '1em',
            }}>重新整理頁面</button>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
