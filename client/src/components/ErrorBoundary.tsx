import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from './ui/Card';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <Card className="w-full max-w-md border-red-100 shadow-lg">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">Something went wrong</h2>
              <p className="mb-6 text-sm text-slate-500">
                An unexpected error occurred in the application. Our team has been notified.
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
