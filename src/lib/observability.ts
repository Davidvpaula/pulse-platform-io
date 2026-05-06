/**
 * Observabilidade — Módulo Médico
 * Logger estruturado para tracing de fluxos, erros, mutations, RPCs e edge functions.
 * Não envia dados externamente; prepara a base para integração futura (Sentry, DataDog, etc).
 */

type LogLevel = "info" | "warn" | "error" | "debug";
type LogCategory =
  | "query"
  | "mutation"
  | "rpc"
  | "edge_function"
  | "auth"
  | "realtime"
  | "navigation"
  | "financeiro"
  | "gamificacao"
  | "generic";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  module?: string;
  meta?: Record<string, unknown>;
  durationMs?: number;
  userId?: string;
}

const LOG_BUFFER_MAX = 200;
const logBuffer: LogEntry[] = [];

function createEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  opts?: { module?: string; meta?: Record<string, unknown>; durationMs?: number; userId?: string }
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...opts,
  };
}

function push(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();

  // Dev-only structured output
  if (import.meta.env.DEV) {
    const tag = `[${entry.category.toUpperCase()}]`;
    const dur = entry.durationMs != null ? ` (${entry.durationMs}ms)` : "";
    const mod = entry.module ? ` [${entry.module}]` : "";
    switch (entry.level) {
      case "error":
        console.error(`${tag}${mod} ${entry.message}${dur}`, entry.meta ?? "");
        break;
      case "warn":
        console.warn(`${tag}${mod} ${entry.message}${dur}`, entry.meta ?? "");
        break;
      default:
        // info/debug silenced in prod builds
        break;
    }
  }
}

/** Observability logger */
export const obs = {
  info: (category: LogCategory, message: string, opts?: { module?: string; meta?: Record<string, unknown>; durationMs?: number }) =>
    push(createEntry("info", category, message, opts)),

  warn: (category: LogCategory, message: string, opts?: { module?: string; meta?: Record<string, unknown>; durationMs?: number }) =>
    push(createEntry("warn", category, message, opts)),

  error: (category: LogCategory, message: string, opts?: { module?: string; meta?: Record<string, unknown>; durationMs?: number }) =>
    push(createEntry("error", category, message, opts)),

  debug: (category: LogCategory, message: string, opts?: { module?: string; meta?: Record<string, unknown>; durationMs?: number }) =>
    push(createEntry("debug", category, message, opts)),

  /** Trace an async operation and log duration + success/failure */
  async trace<T>(
    category: LogCategory,
    label: string,
    fn: () => Promise<T>,
    opts?: { module?: string; meta?: Record<string, unknown> }
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      push(createEntry("info", category, `${label} — OK`, { ...opts, durationMs }));
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      push(
        createEntry("error", category, `${label} — FAIL`, {
          ...opts,
          durationMs,
          meta: { ...opts?.meta, error: err instanceof Error ? err.message : String(err) },
        })
      );
      throw err;
    }
  },

  /** Get buffered logs (for future dashboard / export) */
  getBuffer: () => [...logBuffer],
  /** Clear buffer */
  clearBuffer: () => { logBuffer.length = 0; },
} as const;
