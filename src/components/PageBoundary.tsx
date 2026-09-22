import { Component, Suspense, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function PageLoading() {
  return <div role="status" className="flex min-h-[40vh] items-center justify-center p-8 text-muted-foreground">Carregando página…</div>;
}

class PageErrorBoundary extends Component<{ children: ReactNode; pathname: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; pathname: string }>) {
    if (this.state.failed && previous.pathname !== this.props.pathname) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) {
      return <section role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Não foi possível carregar esta página</h1>
        <p className="max-w-md text-muted-foreground">Verifique sua conexão e tente novamente. Se o problema continuar, volte ao início.</p>
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => window.location.reload()}>Recarregar página</button>
        <Link to="/" className="underline">Voltar ao início</Link>
      </section>;
    }
    return this.props.children;
  }
}

export default function PageBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <PageErrorBoundary pathname={pathname}><Suspense fallback={<PageLoading />}>{children}</Suspense></PageErrorBoundary>;
}
