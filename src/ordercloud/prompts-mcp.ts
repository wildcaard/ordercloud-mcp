/**
 * Registers OrderCloud MCP Prompts: pre-built workflow templates
 * that guide the AI through multi-step OrderCloud operations.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "./client.js";

function userMessage(text: string): { role: "user"; content: { type: "text"; text: string } } {
  return { role: "user", content: { type: "text", text } };
}

export function registerMcpPrompts(server: McpServer, _client: OrderCloudClient): void {
   server.registerPrompt(
    "ordercloud:product.create-full",
    {
      title: "Create product with specs, pricing, and categorization",
      description: "Create a complete product with default price, optional specs, and category assignments. Use OrderCloud tools to create product, price schedule, specs/options, and category assignments as needed.",
      argsSchema: {
        productId: z.string().describe("Unique product ID (max 100 chars)"),
        name: z.string().describe("Product name"),
        price: z.coerce.number().describe("Default unit price"),
        description: z.string().optional().describe("Product description"),
        specsJson: z.string().optional().describe("JSON array of { name, options: string[] } for specs"),
        categoryIds: z.string().optional().describe("Comma-separated category IDs to assign"),
      },
    },
    (args: { productId: string; name: string; price: number; description?: string; specsJson?: string; categoryIds?: string }) => ({
      messages: [
        userMessage(
          `Create a full product in OrderCloud with the following:\n` +
            `- Product ID: ${args.productId}\n` +
            `- Name: ${args.name}\n` +
            `- Default price: ${args.price}\n` +
            (args.description ? `- Description: ${args.description}\n` : "") +
            (args.specsJson ? `- Specs (create spec and options, then attach to product): ${args.specsJson}\n` : "") +
            (args.categoryIds ? `- Assign to categories (by ID): ${args.categoryIds}\n` : "") +
            `\nUse the OrderCloud tools in this order: create the product, create a default price schedule and set it on the product, create specs/options if provided, then assign the product to the given categories. Report what was created.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:product.bulk-import",
    {
      title: "Bulk product creation template",
      description: "Template for importing multiple products. Use OrderCloud product create tool per item; handle errors and summarize successes/failures.",
      argsSchema: {
        productsJson: z.string().describe("JSON array of { ID, Name, Description?, DefaultPrice? } objects"),
        catalogId: z.string().optional().describe("Catalog ID to assign products to (if applicable)"),
      },
    },
    (args: { productsJson: string; catalogId?: string }) => ({
      messages: [
        userMessage(
          `Import the following products into OrderCloud. Products (JSON):\n${args.productsJson}\n` +
            (args.catalogId ? `Assign them to catalog: ${args.catalogId}. ` : "") +
            `For each product: create the product (ordercloud.products.create), set default price if DefaultPrice is provided. If any step fails, note the error and continue with the rest. At the end, summarize how many succeeded and list any errors.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:product.update-pricing",
    {
      title: "Update pricing across multiple products",
      description: "Update default price or price schedule for multiple products. Use product get/patch and price schedule tools as needed.",
      argsSchema: {
        productIds: z.string().describe("Comma-separated product IDs to update"),
        priceScheduleId: z.string().optional().describe("Price schedule ID to set as default (if not using new price)"),
        newPrice: z.coerce.number().optional().describe("If set, create or use a price schedule with this price and set as default"),
      },
    },
    (args: { productIds: string; priceScheduleId?: string; newPrice?: number }) => ({
      messages: [
        userMessage(
          `Update pricing for these OrderCloud products: ${args.productIds}.\n` +
            (args.priceScheduleId
              ? `Set default price schedule to: ${args.priceScheduleId} for each product. `
              : args.newPrice != null
                ? `Use or create a price schedule with unit price ${args.newPrice} and set it as the default for each product. `
                : "") +
            `Use ordercloud.products.get and ordercloud.products.patch (or ordercloud.products.setDefaultPrice / price schedule tools) as needed. Confirm each update and report any failures.`
        ),
      ],
    })
  );

 server.registerPrompt(
    "ordercloud:order.fulfill",
    {
      title: "Step-by-step order fulfillment workflow",
      description: "Guide through validating an order, creating shipment(s), and updating order status. Uses getWorksheet, shipments, and order patch.",
      argsSchema: {
        orderId: z.string().describe("Order ID to fulfill"),
      },
    },
    (args: { orderId: string }) => ({
      messages: [
        userMessage(
          `Fulfill OrderCloud order ${args.orderId} step by step:\n` +
            `1. Get the order worksheet (ordercloud.orders.getWorksheet) to see line items and availability.\n` +
            `2. Validate that the order is in a fulfillable state (e.g. submitted, payment as needed).\n` +
            `3. Create shipment(s) (ordercloud.shipments.create) for the line items you are shipping.\n` +
            `4. Add line items to the shipment (ordercloud.shipments.addLineItem) as appropriate.\n` +
            `5. Update shipment status (ordercloud.shipments.patch) when packed/shipped.\n` +
            `6. If needed, update order status (ordercloud.orders.patch).\n` +
            `Report each step and any errors.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:order.approve",
    {
      title: "Order approval workflow",
      description: "Walk through approving an order: get order, check approval rules, and patch order status to approved.",
      argsSchema: {
        orderId: z.string().describe("Order ID to approve"),
      },
    },
    (args: { orderId: string }) => ({
      messages: [
        userMessage(
          `Run the approval workflow for OrderCloud order ${args.orderId}:\n` +
            `1. Get the order (ordercloud.orders.get) and confirm it is AwaitingApproval or in an approvable state.\n` +
            `2. If your environment uses approval rules, consider checking ordercloud.approvalRules or order worksheet.\n` +
            `3. Update the order status to reflect approval (ordercloud.orders.patch, e.g. Status: Pending or as your process requires).\n` +
            `Report the result and any issues.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:order.analyze",
    {
      title: "Analyze order for issues",
      description: "Analyze an order for missing payment, invalid address, or other common issues. Uses order get, payments, addresses as needed.",
      argsSchema: {
        orderId: z.string().describe("Order ID to analyze"),
      },
    },
    (args: { orderId: string }) => ({
      messages: [
        userMessage(
          `Analyze OrderCloud order ${args.orderId} for issues:\n` +
            `1. Get the order (ordercloud.orders.get) and order worksheet if helpful (ordercloud.orders.getWorksheet).\n` +
            `2. Check payments: use ordercloud.payments.listForOrder to see if payment is present and sufficient (Amount vs Order Total).\n` +
            `3. Check addresses: if BillingAddressID or ShippingAddressID are set, fetch those addresses (ordercloud.addresses.get) and validate they have required fields (Street1, City, State, Country).\n` +
            `4. Check line items and status. Summarize any issues (missing payment, invalid address, low inventory, etc.) and recommend actions.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:analyze.order-trends",
    {
      title: "Analyze recent order trends",
      description: "Search orders in a date range and summarize counts, totals, and status breakdown.",
      argsSchema: {
        fromDate: z.string().optional().describe("Start date (ISO or YYYY-MM-DD)"),
        toDate: z.string().optional().describe("End date (ISO or YYYY-MM-DD)"),
        pageSize: z.coerce.number().optional().describe("Max orders to fetch (default 100)"),
      },
    },
    (args: { fromDate?: string; toDate?: string; pageSize?: number }) => ({
      messages: [
        userMessage(
          `Analyze OrderCloud order trends:\n` +
            (args.fromDate || args.toDate
              ? `Filter orders by date range: from ${args.fromDate ?? "earliest"} to ${args.toDate ?? "now"}.\n`
              : "Use a recent date range (e.g. last 30 days) if not specified.\n") +
            `1. Use ordercloud.orders.search with filters for DateCreated and pageSize ${args.pageSize ?? 100}.\n` +
            `2. Aggregate: total order count, sum of Total, breakdown by Status (Unsubmitted, AwaitingApproval, Pending, Processing, Complete, Canceled).\n` +
            `3. Summarize trends and any notable patterns.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:analyze.product-performance",
    {
      title: "Product performance analysis",
      description: "Analyze which products appear in orders and how they perform (quantity sold, revenue). Uses orders and line items.",
      argsSchema: {
        fromDate: z.string().optional().describe("Start date for order search"),
        toDate: z.string().optional().describe("End date for order search"),
        topN: z.coerce.number().optional().describe("Number of top products to report (default 10)"),
      },
    },
    (args: { fromDate?: string; toDate?: string; topN?: number }) => ({
      messages: [
        userMessage(
          `Analyze product performance in OrderCloud:\n` +
            `1. Search submitted/complete orders in the given date range (ordercloud.orders.search).\n` +
            (args.fromDate || args.toDate ? `Date range: ${args.fromDate ?? "start"} to ${args.toDate ?? "end"}.\n` : "") +
            `2. For each order, list line items (ordercloud.lineItems.list) to get ProductID and Quantity/LineTotal.\n` +
            `3. Aggregate by product: total quantity sold, total revenue. Sort and report top ${args.topN ?? 10} products.\n` +
            `Summarize findings.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:analyze.customer-activity",
    {
      title: "Customer ordering patterns",
      description: "Analyze ordering behavior by buyer/user: order count, total spend, recent activity.",
      argsSchema: {
        buyerId: z.string().optional().describe("Limit to this buyer ID"),
        fromDate: z.string().optional().describe("Start date for orders"),
        toDate: z.string().optional().describe("End date for orders"),
      },
    },
    (args: { buyerId?: string; fromDate?: string; toDate?: string }) => ({
      messages: [
        userMessage(
          `Analyze customer ordering activity in OrderCloud:\n` +
            (args.buyerId ? `Limit to buyer: ${args.buyerId}.\n` : "Consider top buyers by order volume or spend.\n") +
            `1. Search orders in the date range (ordercloud.orders.search). Use FromCompanyID (buyer) and FromUserID (user) from results.\n` +
            `2. Group by FromCompanyID or FromUserID: order count, sum of Total, last order date.\n` +
            `3. Summarize customer activity and any notable patterns.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:bulk.activate-products",
    {
      title: "Activate multiple products",
      description: "Set Active=true for a list of products. Uses product patch in a loop or batch; report successes and failures.",
      argsSchema: {
        productIds: z.string().describe("Comma-separated product IDs to activate"),
      },
    },
    (args: { productIds: string }) => ({
      messages: [
        userMessage(
          `Activate the following OrderCloud products: ${args.productIds}.\n` +
            `For each product ID: call ordercloud.products.patch with { Active: true }. Track successes and failures, then report a summary.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:bulk.update-inventory",
    {
      title: "Update inventory levels",
      description: "Update InventoryQuantity for multiple products. Use product patch per product; summarize results.",
      argsSchema: {
        updatesJson: z.string().describe("JSON array of { productId, quantity } objects"),
      },
    },
    (args: { updatesJson: string }) => ({
      messages: [
        userMessage(
          `Update inventory in OrderCloud for the following (JSON): ${args.updatesJson}\n` +
            `For each item: get the product (ordercloud.products.get), then ordercloud.products.patch with InventoryQuantity set to the given quantity (ensure InventoryEnabled is set appropriately). Report successes and failures.`
        ),
      ],
    })
  );

  server.registerPrompt(
    "ordercloud:bulk.assign-categories",
    {
      title: "Assign products to categories",
      description: "Assign multiple products to a category (or categories). Use category product assignment or product patch as per API.",
      argsSchema: {
        productIds: z.string().describe("Comma-separated product IDs"),
        categoryIds: z.string().describe("Comma-separated category IDs to assign"),
        catalogId: z.string().optional().describe("Catalog ID if required for category context"),
      },
    },
    (args: { productIds: string; categoryIds: string; catalogId?: string }) => ({
      messages: [
        userMessage(
          `Assign OrderCloud products to categories.\n` +
            `Products: ${args.productIds}.\n` +
            `Categories: ${args.categoryIds}.\n` +
            (args.catalogId ? `Catalog: ${args.catalogId}.\n` : "") +
            `Use OrderCloud category product assignment (e.g. assign products to categories via the appropriate API/tools). For each assignment, report success or failure and summarize.`
        ),
      ],
    })
  );

  process.stderr.write("[ordercloud-mcp] MCP Prompts registered \n");
}
