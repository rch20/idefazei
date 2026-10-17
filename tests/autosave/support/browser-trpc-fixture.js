import { useCallback, useEffect, useRef, useState } from "react";

const origin = () =>
  window.__FOUNDATION_TEST_ORIGIN__ || window.location.origin;
const contextId = () => window.__FOUNDATION_CONTEXT_ID__ || "context-unknown";
let requestOrdinal = 0;
const queryCache = new Map();
const listeners = new Map();

function stable(value) {
  if (value === undefined) return "undefined";
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function keyFor(procedure, input) {
  return `${procedure}:${stable(input || {})}`;
}

function notify(key) {
  for (const listener of listeners.get(key) || []) listener();
}

function entryFor(key) {
  let entry = queryCache.get(key);
  if (!entry) {
    entry = {
      data: undefined,
      error: null,
      status: "idle",
      promise: null,
      requested: false,
    };
    queryCache.set(key, entry);
  }
  return entry;
}

function subscribe(key, listener) {
  const set = listeners.get(key) || new Set();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(key);
  };
}

function makeError(payload) {
  const error = new Error(payload?.message || "Falha na API de teste");
  error.data = payload?.data || { code: payload?.code || "UNKNOWN" };
  error.code = payload?.code || error.data.code;
  return error;
}

async function rpc(procedure, input, method = "POST") {
  const ordinal = ++requestOrdinal;
  const headers = {
    "x-foundation-context-id": contextId(),
    "x-foundation-request-ordinal": String(ordinal),
    "x-foundation-case": window.__FOUNDATION_CASE__ || "unknown",
    "x-foundation-profile": window.__FOUNDATION_PROFILE__ || "P0",
  };
  let url = `${origin()}/__autosave_rpc?procedure=${encodeURIComponent(procedure)}`;
  const init = { method, headers };
  if (method === "GET") {
    url += `&input=${encodeURIComponent(JSON.stringify(input || {}))}`;
  } else {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify({
      procedure,
      input: input || {},
      requestId: `${contextId()}-${ordinal}`,
    });
  }
  const response = await fetch(url, init);
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw makeError({ code: "INVALID_JSON", message: "Resposta não JSON" });
  }
  if (!response.ok || payload?.ok === false) throw makeError(payload?.error);
  return payload.result;
}

async function fetchQuery(procedure, input, key, { force = false } = {}) {
  const entry = entryFor(key);
  if (entry.promise && !force) return entry.promise;
  entry.requested = true;
  entry.status = "loading";
  entry.error = null;
  notify(key);
  entry.promise = rpc(procedure, input, "GET")
    .then(data => {
      entry.data = data;
      entry.status = "success";
      entry.error = null;
      entry.promise = null;
      notify(key);
      return data;
    })
    .catch(error => {
      entry.status = "error";
      entry.error = error;
      entry.promise = null;
      notify(key);
      throw error;
    });
  return entry.promise;
}

function useFixtureQuery(procedure, input, options = {}) {
  const key = keyFor(procedure, input);
  const [, render] = useState(0);
  const enabled = options.enabled !== false;
  useEffect(() => {
    if (!enabled) return undefined;
    const unsubscribe = subscribe(key, () => render(value => value + 1));
    const entry = entryFor(key);
    if (!entry.requested || entry.status === "error")
      void fetchQuery(procedure, input, key).catch(() => undefined);
    return unsubscribe;
  }, [key, enabled]);
  const entry = entryFor(key);
  const refetch = useCallback(
    () => fetchQuery(procedure, input, key, { force: true }),
    [key]
  );
  return {
    data: entry.data,
    error: entry.error,
    isLoading:
      enabled && (entry.status === "idle" || entry.status === "loading"),
    isFetching: enabled && entry.status === "loading",
    refetch,
  };
}

function useFixtureMutation(procedure, options = {}) {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [variables, setVariables] = useState(undefined);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutateAsync = useCallback(
    async input => {
      setPending(true);
      setError(null);
      setVariables(input);
      try {
        const result = await rpc(procedure, input, "POST");
        setPending(false);
        optionsRef.current?.onSuccess?.(result, input);
        optionsRef.current?.onSettled?.(result, null, input);
        return result;
      } catch (caught) {
        const nextError =
          caught instanceof Error ? caught : new Error(String(caught));
        setPending(false);
        setError(nextError);
        optionsRef.current?.onError?.(nextError, input);
        optionsRef.current?.onSettled?.(undefined, nextError, input);
        throw nextError;
      }
    },
    [procedure]
  );

  const mutate = useCallback(
    input => {
      void mutateAsync(input).catch(() => undefined);
    },
    [mutateAsync]
  );
  return { mutate, mutateAsync, isPending, error, variables };
}

function setQueryData(procedure, input, updater) {
  const key = keyFor(procedure, input);
  const entry = entryFor(key);
  entry.data = typeof updater === "function" ? updater(entry.data) : updater;
  entry.status = "success";
  entry.error = null;
  entry.requested = true;
  notify(key);
  return entry.data;
}

function invalidateQuery(procedure, input) {
  const key = keyFor(procedure, input);
  const entry = entryFor(key);
  entry.requested = false;
  return fetchQuery(procedure, input, key, { force: true }).catch(
    () => undefined
  );
}

const procedureUtils = new Proxy(
  {},
  {
    get: (_, procedure) => ({
      setData: (input, updater) => setQueryData(procedure, input, updater),
      invalidate: input => invalidateQuery(procedure, input),
      fetch: input =>
        fetchQuery(procedure, input, keyFor(procedure, input), { force: true }),
      getData: input => entryFor(keyFor(procedure, input)).data,
    }),
  }
);

export const trpc = {
  useUtils: () => ({ escolaFundamentos: procedureUtils }),
  escolaFundamentos: new Proxy(
    {},
    {
      get: (_, procedure) => ({
        useQuery: (input, options) =>
          useFixtureQuery(procedure, input, options),
        useMutation: options => useFixtureMutation(procedure, options),
      }),
    }
  ),
};

window.__foundationAutosaveDebug = {
  contextId,
  rpc,
  cache: queryCache,
  applySession: data => {
    for (const [key, entry] of queryCache) {
      if (!key.startsWith("studySession:")) continue;
      entry.data = data;
      entry.status = "success";
      notify(key);
    }
  },
  clear: () => {
    queryCache.clear();
    listeners.clear();
  },
};
