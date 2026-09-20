import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 rounded-2xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {this.props.fallbackTitle || 'Component Recovered Safely'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              A temporary display error was intercepted. Your session and workstation data remain safe.
            </p>
          </div>
          {this.state.error && (
            <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-400 text-left overflow-x-auto max-h-24">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reload Component View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
