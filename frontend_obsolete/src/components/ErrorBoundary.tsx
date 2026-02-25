import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6 rounded-lg border border-destructive/50 bg-destructive/5 text-foreground">
          <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
