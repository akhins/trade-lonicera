import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: '#16213e',
            padding: '30px',
            borderRadius: '8px',
            border: '1px solid #d32f2f'
          }}>
            <h1 style={{ color: '#d32f2f', marginBottom: '20px' }}>⚠️ Something went wrong</h1>
            <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
              We're sorry, but an unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details style={{
                marginBottom: '20px',
                textAlign: 'left',
                backgroundColor: '#0f3460',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#ccc'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                  Error Details (click to expand)
                </summary>
                <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && '\n' + this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#00d4ff',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              Refresh Page
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              style={{
                padding: '10px 20px',
                backgroundColor: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
