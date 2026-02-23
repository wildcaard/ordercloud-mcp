/**
 * Shared helper functions for OrderCloud MCP tools.
 */
import { OrderCloudError } from "../client.js";

// ─── Response Formatters ────────────────────────────────────────────────────

/**
 * Format a successful tool response.
 */
export function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, data }, null, 2) }] };
}

/**
 * Format an error tool response.
 */
export function err(e: unknown) {
  if (e instanceof OrderCloudError) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ ok: false, error: { message: e.message, status: e.status, details: e.details } }, null, 2),
        },
      ],
      isError: true,
    };
  }
  const message = e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: { message } }, null, 2) }], isError: true };
}

// ─── Pagination Helpers ──────────────────────────────────────────────────────

/**
 * OrderCloud paginated list response structure.
 */
export interface OcList<T = unknown> {
  Items: T[];
  Meta: { Page: number; PageSize: number; TotalCount: number; TotalPages: number };
}

/**
 * Normalize OrderCloud pagination to a cleaner format.
 */
export function normalizePagination<T>(raw: OcList<T>) {
  return {
    items: raw.Items,
    meta: {
      page: raw.Meta.Page,
      pageSize: raw.Meta.PageSize,
      totalCount: raw.Meta.TotalCount,
      totalPages: raw.Meta.TotalPages,
    },
  };
}

/**
 * Build query parameters for list/search endpoints.
 */
export function buildListQuery(params: {
  search?: string;
  filters?: Record<string, string>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
}): Record<string, string | number | undefined> {
  const q: Record<string, string | number | undefined> = {};
  if (params.search) q["search"] = params.search;
  if (params.page) q["page"] = params.page;
  if (params.pageSize) q["pageSize"] = params.pageSize;
  if (params.sortBy) q["sortBy"] = params.sortBy;
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      q[k] = v;
    }
  }
  return q;
}

// ─── XP Helpers ──────────────────────────────────────────────────────────────

const MAX_XP_SIZE = 65536; // 64KB

/**
 * Validate XP payload for size and dangerous keys.
 * @throws Error if validation fails
 */
export function validateXp(xp: unknown): void {
  const json = JSON.stringify(xp);
  if (json.length > MAX_XP_SIZE) {
    throw new Error(`xpPatch exceeds maximum size of ${MAX_XP_SIZE} bytes`);
  }
  if (typeof xp === "object" && xp !== null) {
    for (const key of Object.keys(xp)) {
      if (key.startsWith("$")) {
        throw new Error(`xp keys starting with "$" are not allowed: "${key}"`);
      }
    }
  }
}

/**
 * Deep merge two objects (for XP patching).
 */
export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof result[key] === "object" && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Resource Path Resolver ──────────────────────────────────────────────────

/**
 * Supported resource types for XP operations.
 */
export type ResourceType = "Product" | "Category" | "Order" | "User" | "Buyer";

/**
 * Resolve the API path for a resource type.
 */
export function resolveResourcePath(type: ResourceType, ids: Record<string, string>): string {
  switch (type) {
    case "Product":
      return `/v1/products/${ids.productId}`;
    case "Category":
      return `/v1/catalogs/${ids.catalogId}/categories/${ids.categoryId}`;
    case "Order": {
      const dir = ids.direction || "Incoming";
      return `/v1/orders/${dir}/${ids.orderId}`;
    }
    case "User":
      return `/v1/buyers/${ids.buyerId}/users/${ids.userId}`;
    case "Buyer":
      return `/v1/buyers/${ids.buyerId}`;
    default:
      throw new Error(`Unknown resource type: ${type}`);
  }
}
