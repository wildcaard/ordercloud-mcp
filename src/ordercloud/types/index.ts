/**
 * Shared TypeScript types for OrderCloud MCP.
 */

// Re-export helpers types
export type { OcList } from "../helpers/index.js";
export { normalizePagination, buildListQuery, resolveResourcePath, ResourceType } from "../helpers/index.js";

// ─── API Configuration ───────────────────────────────────────────────────────

/**
 * OrderCloud API configuration.
 */
export interface OcConfig {
  baseUrl: string;
  authUrl: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  accessToken?: string;
}

/**
 * Authentication mode.
 */
export type AuthMode = "client_credentials" | "token";

// ─── API Error Types ─────────────────────────────────────────────────────────

/**
 * OrderCloud error response body.
 */
export interface OcErrorBody {
  Errors?: Array<{ ErrorCode: string; Message: string; Data?: unknown }>;
}

// ─── Common API Entities ─────────────────────────────────────────────────────

/**
 * Product entity.
 */
export interface Product {
  ID: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  QuantityMultiplier?: number;
  ShipWeight?: number;
  ShipHeight?: number;
  ShipWidth?: number;
  ShipLength?: number;
  DefaultPriceScheduleID?: string;
  xp?: Record<string, unknown>;
  DateCreated?: string;
  LastUpdated?: string;
}

/**
 * Category entity.
 */
export interface Category {
  ID: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  ParentID?: string;
  xp?: Record<string, unknown>;
}

/**
 * Catalog entity.
 */
export interface Catalog {
  ID: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  xp?: Record<string, unknown>;
}

/**
 * Buyer entity.
 */
export interface Buyer {
  ID: string;
  Name: string;
  Active?: boolean;
  xp?: Record<string, unknown>;
}

/**
 * User entity.
 */
export interface User {
  ID: string;
  Username?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  Active?: boolean;
  BuyerID?: string;
  xp?: Record<string, unknown>;
}

/**
 * Order entity.
 */
export interface Order {
  ID: string;
  Name?: string;
  Direction: "Incoming" | "Outgoing";
  Status?: string;
  CustomerID?: string;
  BuyerID?: string;
  Total?: number;
  Subtotal?: number;
  Tax?: number;
  Shipping?: number;
  DateCreated?: string;
  DateSubmitted?: string;
  xp?: Record<string, unknown>;
}

/**
 * Line item entity.
 */
export interface LineItem {
  ID: string;
  ProductID?: string;
  Quantity?: number;
  UnitPrice?: number;
  LineTotal?: number;
  Product?: Product;
  xp?: Record<string, unknown>;
}
