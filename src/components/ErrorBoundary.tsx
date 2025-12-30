import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0D0D0D',
          color: '#fff',
          padding: '40px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ color: '#FF4757', marginBottom: '20px' }}>
            Something went wrong
          </h1>
          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: '#00D4FF', marginBottom: '10px' }}>Error:</h2>
            <pre style={{ 
              color: '#ff6b6b', 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error?.message}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div style={{
              backgroundColor: '#1a1a1a',
              padding: '20px',
              borderRadius: '8px',
            }}>
              <h2 style={{ color: '#00D4FF', marginBottom: '10px' }}>Stack:</h2>
              <pre style={{ 
                color: '#888', 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '12px',
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#00D4FF',
              color: '#0D0D0D',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;



