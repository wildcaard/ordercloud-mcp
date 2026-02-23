/**
 * MCP tool registrations for OrderCloud operations.
 * 
 * This file serves as the main registration point, importing specialized
 * modules for each resource type. See /resources/ for individual modules.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "./client.js";
import { ok, err } from "./helpers/index.js";

// Import resource modules
import { registerProductTools } from "./resources/products.js";
import { registerCatalogTools } from "./resources/catalogs.js";
import { registerCategoryTools } from "./resources/categories.js";
import { registerBuyerTools } from "./resources/buyers.js";
import { registerOrderTools } from "./resources/orders.js";
import { registerXpTools } from "./resources/xp.js";
import { registerSupplierTools } from "./resources/suppliers.js";
import { registerAddressTools } from "./resources/addresses.js";
import { registerPriceScheduleTools } from "./resources/priceSchedules.js";
import { registerSpecTools } from "./resources/specs.js";
import { registerPromotionTools } from "./resources/promotions.js";
import { registerShipmentTools } from "./resources/shipments.js";
import { registerPaymentTools } from "./resources/payments.js";
import { registerLineItemTools } from "./resources/lineItems.js";
import { registerCostCenterTools } from "./resources/costCenters.js";

// ─── Tool Registration ──────────────────────────────────────────────────────

export function registerTools(server: McpServer, client: OrderCloudClient): void {
  // ── A) Health & Auth ──
  // Keep ping inline as it's a simple tool

  server.registerTool(
    "ordercloud.ping",
    {
      description: "Check OrderCloud connectivity, auth mode, and token status",
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const ping = await client.ping();
        return ok({
          baseUrl: client.baseUrl,
          authMode: client.currentAuthMode,
          tokenExpiresIn: client.tokenExpiresIn,
          connected: ping.ok,
          user: ping.user,
        });
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── B) Products ──
  registerProductTools(server, client);

  // ── C) Catalogs ──
  registerCatalogTools(server, client);

  // ── D) Categories ──
  registerCategoryTools(server, client);

  // ── E) Buyers & Users ──
  registerBuyerTools(server, client);

  // ── F) Orders ──
  registerOrderTools(server, client);

  // ── G) XP Helpers ──
  registerXpTools(server, client);

  // ── H) Suppliers ──
  registerSupplierTools(server, client);

  // ── I) Addresses ──
  registerAddressTools(server, client);

  // ── J) Price Schedules ──
  registerPriceScheduleTools(server, client);

  // ── K) Specs & Variants ──
  registerSpecTools(server, client);

  // ── L) Promotions ──
  registerPromotionTools(server, client);

  // ── M) Shipments ──
  registerShipmentTools(server, client);

  // ── N) Payments ──
  registerPaymentTools(server, client);

  // ── O) Line Items ──
  registerLineItemTools(server, client);

  // ── P) Cost Centers & Spending Accounts ──
  registerCostCenterTools(server, client);
}
