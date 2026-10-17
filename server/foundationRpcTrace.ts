import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Request, RequestHandler } from "express";

const tracedPaths = new Set([
  "escolaFundamentos.updateQuestionBlock",
  "escolaFundamentos.createStudy",
  "escolaFundamentos.createStudyQuestion",
  "escolaFundamentos.saveReflection",
  "escolaFundamentos.saveBlockReflection",
  "escolaFundamentos.completeLesson",
]);
const errorCodes = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PRECONDITION_REQUIRED",
  "TIMEOUT",
  "INTERNAL_SERVER_ERROR",
  "TOO_MANY_REQUESTS",
  "METHOD_NOT_SUPPORTED",
  "PARSE_ERROR",
  "CLIENT_CLOSED_REQUEST",
]);
type Trace = {
  requestId: string;
  paths: string[];
  started: number;
  errorCount: number;
  done: boolean;
  log: (event: Record<string, unknown>) => void;
  now: () => number;
};
const traces = new WeakMap<object, Trace>();

export function foundationTracePaths(rawPath: unknown): string[] {
  if (typeof rawPath !== "string" || rawPath.length > 4096) return [];
  const path = rawPath.split("?")[0].replace(/^\//, "");
  return Array.from(
    new Set(path.split(",").filter(name => tracedPaths.has(name)))
  );
}

/** Um ID aleatório do servidor; nunca aceita ID, query, header ou payload do cliente. */
export function createFoundationRpcTraceMiddleware(
  options: {
    log?: (event: Record<string, unknown>) => void;
    now?: () => number;
  } = {}
): RequestHandler {
  const log =
    options.log ??
    (event => console.info("[foundation-rpc]", JSON.stringify(event)));
  const now = options.now ?? (() => performance.now());
  return (req, res, next) => {
    const paths = foundationTracePaths(req.path);
    if (!paths.length) return next();
    const trace: Trace = {
      requestId: randomUUID(),
      paths,
      started: now(),
      errorCount: 0,
      done: false,
      log,
      now,
    };
    traces.set(req, trace);
    res.setHeader("X-Foundation-Request-Id", trace.requestId);
    // O diagnóstico não pode impedir a operação de negócio.
    safeLog(trace, {
      event: "received",
      requestId: trace.requestId,
      procedures: paths,
    });
    const finish = (event: "finished" | "connection_closed") => {
      if (trace.done) return;
      trace.done = true;
      safeLog(trace, {
        event,
        requestId: trace.requestId,
        procedures: trace.paths,
        httpStatus: res.statusCode,
        durationMs: Math.max(0, Math.round(now() - trace.started)),
        applicationErrors: trace.errorCount,
      });
    };
    res.once("finish", () => finish("finished"));
    res.once("close", () =>
      finish(res.writableEnded ? "finished" : "connection_closed")
    );
    next();
  };
}

function safeLog(trace: Trace, event: Record<string, unknown>) {
  try {
    trace.log(event);
  } catch {
    /* Sem payload e sem impacto no salvamento. */
  }
}

export function getFoundationRpcRequestId(
  req: object | null | undefined
): string | null {
  return req ? (traces.get(req)?.requestId ?? null) : null;
}

export function recordFoundationRpcHandlerResult(
  req: object | undefined,
  path: string,
  ok: boolean
) {
  if (!req || !tracedPaths.has(path)) return;
  const trace = traces.get(req);
  if (!trace || !trace.paths.includes(path)) return;
  safeLog(trace, {
    event: "handler_completed",
    requestId: trace.requestId,
    procedure: path,
    ok,
    connectionAlreadyClosed: trace.done,
  });
}

export function recordFoundationRpcError(
  req: object | undefined,
  path: unknown,
  code: unknown
) {
  if (!req || typeof path !== "string" || !tracedPaths.has(path)) return;
  const trace = traces.get(req);
  if (!trace || !trace.paths.includes(path)) return;
  trace.errorCount += 1;
  safeLog(trace, {
    event: "application_error",
    requestId: trace.requestId,
    procedure: path,
    code:
      typeof code === "string" && errorCodes.has(code) ? code : "UNKNOWN_ERROR",
  });
}

/** Preserva contratos não relacionados; remove mensagens internas/stack da Escola. */
export function foundationRpcErrorShape<
  T extends {
    message: string;
    data: { code: string; stack?: string; [key: string]: unknown };
  },
>(
  shape: T,
  req: Request | undefined,
  procedurePath?: string
): T & { data: T["data"] & { requestId?: string } } {
  const requestId = getFoundationRpcRequestId(req);
  const path = procedurePath ?? shape.data.path;
  if (!requestId || typeof path !== "string" || !tracedPaths.has(path))
    return shape;
  return {
    ...shape,
    message:
      shape.data.code === "INTERNAL_SERVER_ERROR"
        ? "Não foi possível confirmar a operação. Seu texto deve ser preservado."
        : shape.message,
    data: { ...shape.data, stack: undefined, requestId },
  };
}
