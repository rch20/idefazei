import { EventEmitter } from "node:events";
import { createServer } from "node:http";
import express, { type Request } from "express";
import { initTRPC, TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { describe, expect, it, vi } from "vitest";
import {
  createFoundationRpcTraceMiddleware,
  foundationRpcErrorShape,
  foundationTracePaths,
  getFoundationRpcRequestId,
  recordFoundationRpcError,
  recordFoundationRpcHandlerResult,
} from "./foundationRpcTrace";

function fixture(path: string, log = vi.fn(), now = () => 100) {
  const req = {
    path,
    headers: {
      authorization: "SYNTHETIC_SECRET",
      cookie: "SYNTHETIC_COOKIE",
      "x-request-id": "UNTRUSTED_ID",
    },
    body: { reflection: "SYNTHETIC_PRIVATE_NOTE" },
  } as any;
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    writableEnded: false,
    setHeader: vi.fn(),
  });
  const next = vi.fn();
  createFoundationRpcTraceMiddleware({ log, now })(req, res as any, next);
  return { req, res, next, log };
}

describe("correlação de salvamento da Escola — metadados mínimos", () => {
  it("aceita somente nomes exatos e não registra query ou campos pessoais", () => {
    expect(
      foundationTracePaths(
        "/escolaFundamentos.saveBlockReflection,finance.secret?input=PRIVATE"
      )
    ).toEqual(["escolaFundamentos.saveBlockReflection"]);
    expect(
      foundationTracePaths("/escolaFundamentos.saveBlockReflectionEVIL")
    ).toEqual([]);
    expect(foundationTracePaths("x".repeat(4097))).toEqual([]);
  });
  it("gera ID próprio e registra início/fim uma única vez", () => {
    let time = 100;
    const f = fixture(
      "/escolaFundamentos.updateQuestionBlock",
      vi.fn(),
      () => time
    );
    const id = getFoundationRpcRequestId(f.req);
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(id).not.toBe("UNTRUSTED_ID");
    expect(f.next).toHaveBeenCalledOnce();
    time = 350;
    f.res.writableEnded = true;
    f.res.emit("finish");
    f.res.emit("close");
    expect(f.log).toHaveBeenCalledTimes(2);
    expect(f.log.mock.calls[1][0]).toMatchObject({
      event: "finished",
      requestId: id,
      durationMs: 250,
      applicationErrors: 0,
    });
    expect(JSON.stringify(f.log.mock.calls)).not.toMatch(
      /PRIVATE|SECRET|COOKIE|UNTRUSTED/
    );
  });
  it("conta erro de aplicação independentemente do status HTTP do lote", () => {
    const f = fixture(
      "/escolaFundamentos.saveBlockReflection,escolaFundamentos.saveReflection"
    );
    recordFoundationRpcError(
      f.req,
      "escolaFundamentos.saveReflection",
      "CONFLICT"
    );
    recordFoundationRpcError(f.req, "finance.secret", "INTERNAL_SERVER_ERROR");
    f.res.statusCode = 207;
    f.res.writableEnded = true;
    f.res.emit("finish");
    expect(f.log.mock.calls.at(-1)?.[0]).toMatchObject({
      httpStatus: 207,
      applicationErrors: 1,
    });
  });
  it("registra transporte fechado sem presumir rollback do banco", () => {
    const f = fixture("/escolaFundamentos.createStudy");
    f.res.emit("close");
    expect(f.log.mock.calls.at(-1)?.[0]).toMatchObject({
      event: "connection_closed",
    });
    expect(JSON.stringify(f.log.mock.calls)).not.toContain("rollback");
  });
  it("falha do logger não bloqueia a operação", () => {
    const f = fixture(
      "/escolaFundamentos.saveReflection",
      vi.fn(() => {
        throw Error("SYNTHETIC_LOG_FAILURE");
      })
    );
    expect(f.next).toHaveBeenCalledOnce();
    expect(() => f.res.emit("finish")).not.toThrow();
  });
  it("rotas não relacionadas ficam sem ID, eventos ou mudança de erro", () => {
    const f = fixture("/finance.list");
    expect(f.log).not.toHaveBeenCalled();
    expect(f.res.setHeader).not.toHaveBeenCalled();
    const shape = {
      message: "erro de outro contrato",
      data: { code: "BAD_REQUEST", stack: "original" },
    };
    expect(foundationRpcErrorShape(shape, f.req)).toBe(shape);
  });
  it("não altera erro de outra área em lote misto", () => {
    const f = fixture("/escolaFundamentos.saveReflection,finance.list");
    const shape = {
      message: "erro de outro contrato",
      data: { code: "BAD_REQUEST", stack: "original" },
    };
    expect(foundationRpcErrorShape(shape, f.req, "finance.list")).toBe(shape);
  });
  it("registra handler concluído mesmo após conexão fechada sem presumir entrega", () => {
    const f = fixture("/escolaFundamentos.updateQuestionBlock");
    f.res.emit("close");
    recordFoundationRpcHandlerResult(
      f.req,
      "escolaFundamentos.updateQuestionBlock",
      true
    );
    expect(f.log.mock.calls.at(-1)?.[0]).toMatchObject({
      event: "handler_completed",
      ok: true,
      connectionAlreadyClosed: true,
    });
  });
  it("redige erro interno e stack e preserva conflito estruturado", () => {
    const f = fixture("/escolaFundamentos.saveBlockReflection");
    const shaped = foundationRpcErrorShape(
      {
        message: "SQL SYNTHETIC_PRIVATE_NOTE",
        data: {
          code: "INTERNAL_SERVER_ERROR",
          stack: "SYNTHETIC_STACK_SECRET",
          httpStatus: 500,
        },
      },
      f.req,
      "escolaFundamentos.saveBlockReflection"
    );
    expect(JSON.stringify(shaped)).not.toMatch(/PRIVATE|SECRET|SQL/);
    expect(shaped.data.requestId).toBe(getFoundationRpcRequestId(f.req));
    const conflict = foundationRpcErrorShape(
      {
        message: "NOTE_VERSION_CONFLICT",
        data: { code: "CONFLICT", stack: "stack", httpStatus: 409 },
      },
      f.req,
      "escolaFundamentos.saveBlockReflection"
    );
    expect(conflict.message).toBe("NOTE_VERSION_CONFLICT");
    expect(conflict.data.stack).toBeUndefined();
  });
  it("propaga o mesmo ID no header e erro HTTP tRPC real, sem detalhes internos", async () => {
    const log = vi.fn();
    const t = initTRPC.context<{ req: Request }>().create({
      errorFormatter: ({ shape, ctx, path }) =>
        foundationRpcErrorShape(shape, ctx?.req, path),
    });
    const router = t.router({
      escolaFundamentos: t.router({
        updateQuestionBlock: t.procedure.mutation(() => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "SYNTHETIC_SQL_PRIVATE_VALUE",
          });
        }),
      }),
    });
    const app = express();
    app.use(express.json());
    app.use(
      "/api/trpc",
      createFoundationRpcTraceMiddleware({ log }),
      createExpressMiddleware({
        router,
        createContext: ({ req }) => ({ req }),
        onError: ({ error, path, ctx }) =>
          recordFoundationRpcError(ctx?.req, path, error.code),
      })
    );
    const server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw Error("LOCAL_SERVER_REQUIRED");
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/trpc/escolaFundamentos.updateQuestionBlock`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }
      );
      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).not.toContain("SYNTHETIC_SQL_PRIVATE_VALUE");
      expect(body).toContain(response.headers.get("x-foundation-request-id")!);
      expect(
        log.mock.calls.some(([event]) => event.event === "application_error")
      ).toBe(true);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve()))
      );
    }
  });
});
