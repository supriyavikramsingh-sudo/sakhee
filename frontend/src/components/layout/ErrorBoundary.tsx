import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white flex items-center flex-col rounded-lg shadow-lg p-8 max-w-md text-center">
          <img src="/images/404-page.svg" alt="Error Illustration" className="mb-6 w-48 h-48" />
            <h1 className="text-2xl font-bold text-danger mb-4">Something went wrong</h1>
            <p className="text-muted mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={() => (window.location.href = '/')} className="btn-primary">
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
