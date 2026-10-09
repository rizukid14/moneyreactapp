import React from 'react';
import MaterialIcon from './common/MaterialIcon';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

/**
 * Top-level error boundary. Prevents the whole app from going blank when a
 * lazy route chunk fails to load (offline / stale deploy) or a render throws.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
          gap: '16px',
          background: 'var(--bg-main, #0f172a)',
          color: 'var(--text-main, #e2e8f0)',
        }}
      >
        <MaterialIcon name="error" className="text-[48px]" />
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
          {this.props.title || 'Terjadi kesalahan'}
        </h1>
        <p style={{ maxWidth: '420px', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
          Halaman gagal dimuat. Ini biasanya karena koneksi terputus atau aplikasi baru saja
          diperbarui. Coba muat ulang.
        </p>
        {this.state.message && (
          <code style={{ fontSize: '12px', opacity: 0.7, wordBreak: 'break-word', maxWidth: '420px' }}>
            {this.state.message}
          </code>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--primary, #14b881)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Muat Ulang
          </button>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #334155)',
              background: 'transparent',
              color: 'var(--text-main, #e2e8f0)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
