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
import { registerCompositeTools } from "./composite.js";
import { registerBulkTools } from "./resources/bulk.js";
import { getAuditLog } from "./helpers/audit.js";

// Tool Registration

export function registerTools(server: McpServer, client: OrderCloudClient): void {
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

  registerProductTools(server, client);

  registerCatalogTools(server, client);

  registerCategoryTools(server, client);

  registerBuyerTools(server, client);

  registerOrderTools(server, client);

  registerXpTools(server, client);

  registerSupplierTools(server, client);

  registerAddressTools(server, client);

  registerPriceScheduleTools(server, client);

  registerSpecTools(server, client);

  registerPromotionTools(server, client);

  registerShipmentTools(server, client);

  registerPaymentTools(server, client);

  registerLineItemTools(server, client);

  registerCostCenterTools(server, client);

  registerCompositeTools(server, client);

  registerBulkTools(server, client);

  server.registerTool(
    "ordercloud.audit.export",
    {
      description: "Export the audit log of all mutations (create/update/delete). Use for compliance and debugging.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const log = getAuditLog();
      return ok({
        count: log.length,
        entries: log,
        exportedAt: new Date().toISOString(),
      });
    }
  );
}
