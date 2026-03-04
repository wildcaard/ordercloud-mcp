/**
 * OrderCloud API client with token caching, retry, and rate-limit handling.
 */

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

interface OcConfig {
  baseUrl: string;
  authUrl: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  accessToken?: string;
}

interface OcErrorBody {
  Errors?: Array<{ ErrorCode: string; Message: string; Data?: unknown }>;
}

export class OrderCloudError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "OrderCloudError";
  }
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;
const TOKEN_BUFFER_MS = 60_000; // refresh 60s before expiry

function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return token.slice(0, 4) + "..." + token.slice(-4);
}

export class OrderCloudClient {
  private config: OcConfig;
  private tokenCache: TokenCache | null = null;
  private authMode: "client_credentials" | "token";

  constructor() {
    this.config = {
      baseUrl: (process.env.ORDERCLOUD_BASE_URL || "https://sandboxapi.ordercloud.io").replace(/\/+$/, ""),
      authUrl: process.env.ORDERCLOUD_AUTH_URL || "https://auth.ordercloud.io/oauth/token",
      clientId: process.env.ORDERCLOUD_CLIENT_ID,
      clientSecret: process.env.ORDERCLOUD_CLIENT_SECRET,
      scope: process.env.ORDERCLOUD_SCOPE || "FullAccess",
      accessToken: process.env.ORDERCLOUD_ACCESS_TOKEN,
    };

    if (this.config.accessToken) {
      this.authMode = "token";
      this.tokenCache = { accessToken: this.config.accessToken, expiresAt: Infinity };
    } else if (this.config.clientId && this.config.clientSecret) {
      this.authMode = "client_credentials";
    } else {
      throw new Error(
        "OrderCloud auth not configured. Provide ORDERCLOUD_ACCESS_TOKEN or both ORDERCLOUD_CLIENT_ID and ORDERCLOUD_CLIENT_SECRET."
      );
    }
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  get authUrl(): string {
    return this.config.authUrl;
  }

  get clientId(): string | undefined {
    return this.config.clientId;
  }

  get scope(): string | undefined {
    return this.config.scope;
  }

  get currentAuthMode(): string {
    return this.authMode;
  }

  get tokenExpiresIn(): number | null {
    if (!this.tokenCache) return null;
    if (this.tokenCache.expiresAt === Infinity) return null;
    return Math.max(0, Math.round((this.tokenCache.expiresAt - Date.now()) / 1000));
  }

  async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - TOKEN_BUFFER_MS) {
      return this.tokenCache.accessToken;
    }

    if (this.authMode === "token") {
      return this.tokenCache!.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId!,
      client_secret: this.config.clientSecret!,
      scope: this.config.scope!,
    });

    const res = await fetch(this.config.authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new OrderCloudError(`Auth failed: ${res.status}`, res.status, text);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    process.stderr.write(`[ordercloud-mcp] Token acquired, expires in ${data.expires_in}s (token: ${maskToken(data.access_token)})\n`);
    return this.tokenCache.accessToken;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    body?: unknown
  ): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${this.config.baseUrl}${path}`);

    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }

      const res = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      }

      // Retry on 429 or 5xx
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfter = res.headers.get("Retry-After");
        if (retryAfter) {
          const waitSec = parseInt(retryAfter, 10);
          if (!isNaN(waitSec)) {
            await new Promise((r) => setTimeout(r, waitSec * 1000));
          }
        }
        lastError = new OrderCloudError(`HTTP ${res.status}`, res.status);
        continue;
      }

      // Non-retryable error
      let errBody: OcErrorBody | string;
      try {
        errBody = (await res.json()) as OcErrorBody;
      } catch {
        errBody = await res.text();
      }

      const msg =
        typeof errBody === "object" && errBody.Errors?.[0]
          ? errBody.Errors[0].Message
          : `OrderCloud API error ${res.status}`;

      throw new OrderCloudError(msg, res.status, errBody);
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  /** Verify connectivity by fetching the authenticated user. */
  async ping(): Promise<{ ok: boolean; user?: string }> {
    try {
      const me = await this.request<{ Username?: string; ID?: string }>("GET", "/v1/me");
      return { ok: true, user: me.Username || me.ID };
    } catch (e) {
      return { ok: false };
    }
  }

  /** Check if currently connected (can get a valid token) */
  get isConnected(): boolean {
    return this.tokenCache !== null && Date.now() < this.tokenCache.expiresAt - TOKEN_BUFFER_MS;
  }
}
