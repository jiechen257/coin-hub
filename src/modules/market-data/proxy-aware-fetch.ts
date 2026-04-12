import { fetch as undiciFetch, ProxyAgent } from "undici";

let cachedProxyFetch: typeof fetch | null = null;
let cachedProxyKey: string | null = null;

// 优先读取 HTTPS 代理；如果未设置，再回退到 HTTP 代理，保持与 curl 的环境变量约定一致。
function getProxyUrl() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    ""
  );
}

// Node 的原生 fetch 不会稳定遵循代理环境变量，这里显式接入 ProxyAgent，保证市场数据请求与 curl 走同一条出网链。
export function createProxyAwareFetch(fetchImpl?: typeof fetch): typeof fetch {
  if (fetchImpl) {
    return fetchImpl;
  }

  const proxyUrl = getProxyUrl();

  if (!proxyUrl) {
    return fetch;
  }

  if (cachedProxyFetch && cachedProxyKey === proxyUrl) {
    return cachedProxyFetch;
  }

  const dispatcher = new ProxyAgent(proxyUrl);

  cachedProxyFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const requestTarget = input instanceof Request ? input.url : input;
    const requestInit = {
      ...(init as Record<string, unknown> | undefined),
      dispatcher,
    };

    return (await undiciFetch(
      requestTarget as Parameters<typeof undiciFetch>[0],
      requestInit as Parameters<typeof undiciFetch>[1]
    )) as unknown as Response;
  }) as typeof fetch;
  cachedProxyKey = proxyUrl;

  return cachedProxyFetch;
}
