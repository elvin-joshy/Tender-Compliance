import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";

type ProxyRequest = IncomingMessage & {
  method?: string;
  headers: IncomingHttpHeaders;
  query: Record<string, string | string[] | undefined>;
  url?: string;
  body?: unknown;
};

type ProxyResponse = ServerResponse & {
  status: (code: number) => ProxyResponse;
  json: (body: unknown) => void;
  send: (body: Buffer | string) => void;
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const getTargetBaseUrl = (): string => {
  const raw = process.env.BACKEND_API_URL || process.env.VITE_API_BASE_URL;
  if (!raw) {
    throw new Error("BACKEND_API_URL is not configured.");
  }

  return raw.replace(/\/+$/, "");
};

const readBody = async (req: ProxyRequest): Promise<Uint8Array | undefined> => {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      return new TextEncoder().encode(req.body);
    }

    if (Buffer.isBuffer(req.body)) {
      return new Uint8Array(req.body);
    }

    return new TextEncoder().encode(JSON.stringify(req.body));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return new Uint8Array(Buffer.concat(chunks));
};

const buildForwardHeaders = (req: ProxyRequest): Headers => {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else {
      headers.set(key, value);
    }
  }

  return headers;
};

const getPath = (req: ProxyRequest): string => {
  const pathParam = req.query.path;
  if (Array.isArray(pathParam)) {
    return pathParam.join("/");
  }

  if (typeof pathParam === "string") {
    return pathParam;
  }

  return "";
};

export default async function handler(req: ProxyRequest, res: ProxyResponse) {
  try {
    const baseUrl = getTargetBaseUrl();
    const routePath = getPath(req);
    const queryStringIndex = req.url?.indexOf("?") ?? -1;
    const query = queryStringIndex >= 0 && req.url ? req.url.slice(queryStringIndex) : "";
    const targetUrl = `${baseUrl}/${routePath}${query}`;

    const body = await readBody(req);
    const upstream: Response = await (fetch as any)(targetUrl, {
      method: req.method,
      headers: buildForwardHeaders(req),
      body,
    });

    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const responseBuffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(responseBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy failed.";
    res.status(500).json({ error: message });
  }
}
