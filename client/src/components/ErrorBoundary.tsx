import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Catches render errors of a page so the shell (nav, header) stays usable and the user gets a retry instead of a blank screen. */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[page error]', error, info.componentStack); }
  componentDidUpdate(prev: { resetKey?: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-500/10 text-rose-500"><AlertTriangle className="h-6 w-6" /></div>
        <p className="mt-3 font-extrabold">This page hit a problem</p>
        <p className="mt-1 text-sm text-zinc-500">{this.state.error.message}</p>
        <button className="btn-primary mt-4" onClick={() => this.setState({ error: null })}><RefreshCw className="h-4 w-4" /> Try again</button>
      </div>
    );
  }
}
