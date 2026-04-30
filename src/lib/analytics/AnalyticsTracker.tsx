import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/lib/analytics/tracker";

/**
 * Monte uma vez no topo da árvore (App ou layout). Dispara page_view
 * sempre que a rota muda.
 */
export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    // dispara em background, sem bloquear UI
    trackPageView(path).catch(() => {});
  }, [location.pathname, location.search]);

  return null;
}
