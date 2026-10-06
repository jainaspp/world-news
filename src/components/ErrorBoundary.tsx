import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="status-panel" role="alert">
          <h2>頁面載入失敗</h2>
          <p>請重新整理。如果仍然失敗，稍後再試。</p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            重新整理
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
