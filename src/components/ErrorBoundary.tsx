import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      if (friendly.includes('Missing or insufficient permissions')) {
        friendly =
          'Your session does not have permission for this record. Please sign in with an authorized account or contact FEGGY support.';
      }
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-slate-200 rounded-2xl p-8 bg-slate-50">
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed break-words">{friendly}</p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="mt-6 px-5 py-2.5 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
            >
              Return to FEGGY Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
