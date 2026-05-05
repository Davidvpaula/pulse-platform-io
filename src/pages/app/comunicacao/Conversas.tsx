import { Navigate } from "react-router-dom";

/**
 * Conversas — componente legado (era mock de WhatsApp).
 * Agora redireciona para o Inbox real da plataforma.
 */
export default function Conversas() {
  return <Navigate to="/app/comunicacao/inbox" replace />;
}
