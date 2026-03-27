import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; section?: string; }
interface State { hasError: boolean; error: Error | null; }

class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.section || "Section"}] Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 min-h-[200px]">
          <div className="text-center space-y-3 max-w-sm">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="font-semibold text-foreground">
              {this.props.section || "This section"} encountered an error
            </h3>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default SectionErrorBoundary;
