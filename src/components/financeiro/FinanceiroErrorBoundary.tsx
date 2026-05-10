import React from "react";
import { AdminError } from "@/components/admin/AdminStates";

interface Props {
  /** Nome da aba — usado no título da mensagem de erro. */
  label: string;
  /** Callback opcional executado quando o usuário aciona "Tentar novamente". */
  onRetry?: () => void;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Isola falhas de renderização de uma aba financeira.
 *
 * Regra (Frente F1.3): a falha de **uma** aba não pode derrubar o dashboard
 * inteiro nem zerar os KPIs do header. Os KPIs principais leem somente da
 * RPC consolidada `financeiro_central_dashboard`; cada aba renderizável é
 * envolvida por este boundary para falhar localmente.
 */
export class FinanceiroErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log estruturado — nunca silencioso.
    // eslint-disable-next-line no-console
    console.error(`[FinanceiroErrorBoundary:${this.props.label}]`, error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      return (
        <AdminError
          message={`Falha ao carregar a aba "${this.props.label}": ${this.state.error.message}`}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
