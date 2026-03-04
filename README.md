# ordercloud-mcp

[![npm version](https://img.shields.io/npm/v/ordercloud-mcp.svg)](https://www.npmjs.com/package/ordercloud-mcp)
[![npm license](https://img.shields.io/npm/l/ordercloud-mcp.svg)](https://github.com/wildcaard/ordercloud-mcp/blob/main/LICENSE)
[![Node.js Version](https://img.shields.io/node/v/ordercloud-mcp.svg)](https://nodejs.org/)
[![Build Status](https://github.com/wildcaard/ordercloud-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/wildcaard/ordercloud-mcp/actions)

MCP Server for **Sitecore OrderCloud** that exposes admin operations as typed MCP tools, resources, and prompts for Claude Code and other MCP clients.

## Solution Capability

| Capability | Description |
|------------|-------------|
| **Tools** | 70+ tools across products, catalogs, categories, buyers, users, orders, suppliers, addresses, price schedules, specs, promotions, shipments, payments, line items, cost centers, spending accounts, XP, bulk product operations, composite workflows, and audit export |
| **MCP Resources** | Schema and docs (product, order, user, line item, address, catalog, category, buyer, supplier, spec, promotion, shipment, payment), API overview, rate limits, error codes, best practices, connection status/config, XP schema templates, and audit log |
| **MCP Prompts** | 12 workflow prompts for product creation, bulk import, pricing updates, order fulfillment/approval/analysis, order trends, product performance, customer activity, and bulk activate/update-inventory/assign-categories |
| **Composite Tools** | Multi-step operations: full product setup (product + price + specs + variants + categories), order fulfillment, customer onboarding, bulk product activate, and order analytics report |
| **Bulk Operations** | Create, patch, delete, or activate/deactivate multiple products in one call with configurable batch size and per-item success/failure summary |
| **Dry-Run** | Optional `dryRun: true` on product create/patch/delete to validate without persisting |
| **Audit Logging** | Every mutation (create/update/delete) across all tools is recorded; export via `ordercloud.audit.export` or `ordercloud://audit/log` resource for compliance and debugging |

## Quick Start

```bash
npm install
npm run build
npm start
```

## Testing

```bash
# Run tests
npm test
```

42 unit tests covering helper functions (ok, err, normalizePagination, buildListQuery, validateXp, deepMerge, resolveResourcePath).

## Configuration

Set environment variables (or use `mcp.json` env block):

### Client Credentials (recommended)

| Variable | Default | Description |
|---|---|---|
| `ORDERCLOUD_BASE_URL` | `https://sandboxapi.ordercloud.io` | API base URL |
| `ORDERCLOUD_CLIENT_ID` | — | OAuth client ID |
| `ORDERCLOUD_CLIENT_SECRET` | — | OAuth client secret |
| `ORDERCLOUD_AUTH_URL` | `https://auth.ordercloud.io/oauth/token` | Token endpoint |
| `ORDERCLOUD_SCOPE` | `FullAccess` | Requested scopes |

### Pre-provided Token (alternative)

| Variable | Description |
|---|---|
| `ORDERCLOUD_ACCESS_TOKEN` | A valid bearer token (skips client credentials flow) |

## Claude Code Setup

Copy `mcp.json` to your project or global Claude Code config, updating the `cwd` and `env` values:

```json
{
  "mcpServers": {
    "ordercloud": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/absolute/path/to/ordercloud-mcp",
      "env": {
        "ORDERCLOUD_CLIENT_ID": "your-id",
        "ORDERCLOUD_CLIENT_SECRET": "your-secret"
      }
    }
  }
}
```

## Available Tools

### Health & Auth
- **ordercloud.ping** — Check connectivity, auth mode, and token status

### Products
- **ordercloud.products.search** — List/search products with filters, pagination, sorting
- **ordercloud.products.get** — Get a product by ID
- **ordercloud.products.create** — Create a new product (optional `dryRun: true` to validate without persisting)
- **ordercloud.products.patch** — Partial update (merge patch); optional `dryRun: true`
- **ordercloud.products.delete** — Delete a product; optional `dryRun: true`
- **ordercloud.products.setDefaultPrice** — Set default price for product
- **ordercloud.products.generateVariants** — Generate variants from specs

### Catalogs
- **ordercloud.catalogs.list** — List catalogs
- **ordercloud.catalogs.get** — Get a catalog by ID
- **ordercloud.catalogs.create** — Create a new catalog
- **ordercloud.catalogs.patch** — Update a catalog
- **ordercloud.catalogs.delete** — Delete a catalog

### Categories
- **ordercloud.categories.search** — Search categories in a catalog
- **ordercloud.categories.get** — Get a category by ID
- **ordercloud.categories.create** — Create a new category
- **ordercloud.categories.patch** — Update a category
- **ordercloud.categories.delete** — Delete a category

### Buyers & Users
- **ordercloud.buyers.search** — Search buyer organizations
- **ordercloud.buyers.get** — Get a buyer by ID
- **ordercloud.buyers.create** — Create a new buyer
- **ordercloud.buyers.patch** — Update a buyer
- **ordercloud.buyers.delete** — Delete a buyer
- **ordercloud.users.search** — Search users in a buyer org
- **ordercloud.users.get** — Get a user by ID
- **ordercloud.users.create** — Create a new user
- **ordercloud.users.patch** — Update a user
- **ordercloud.users.delete** — Delete a user

### Suppliers
- **ordercloud.suppliers.search** — Search suppliers
- **ordercloud.suppliers.get** — Get a supplier by ID
- **ordercloud.suppliers.create** — Create a new supplier
- **ordercloud.suppliers.patch** — Update a supplier
- **ordercloud.suppliers.delete** — Delete a supplier

### Addresses
- **ordercloud.addresses.listForEntity** — List addresses for buyer/user/supplier
- **ordercloud.addresses.get** — Get an address by ID
- **ordercloud.addresses.create** — Create a new address
- **ordercloud.addresses.patch** — Update an address
- **ordercloud.addresses.delete** — Delete an address

### Orders
- **ordercloud.orders.search** — Search orders with direction, status, date range
- **ordercloud.orders.get** — Get an order by ID
- **ordercloud.orders.create** — Create a new order
- **ordercloud.orders.patch** — Update an order
- **ordercloud.orders.delete** — Delete an order
- **ordercloud.orders.getWorksheet** — Get full order worksheet (order + line items + payments)
- **ordercloud.orders.submit** — Submit an order

### Line Items
- **ordercloud.lineItems.list** — List line items for an order
- **ordercloud.lineItems.get** — Get a line item by ID
- **ordercloud.lineItems.create** — Create a new line item
- **ordercloud.lineItems.patch** — Update a line item
- **ordercloud.lineItems.delete** — Delete a line item

### Payments
- **ordercloud.payments.listForOrder** — List payments for an order
- **ordercloud.payments.get** — Get a payment by ID
- **ordercloud.payments.create** — Create a new payment
- **ordercloud.payments.patch** — Update a payment
- **ordercloud.payments.transactions.list** — List payment transactions

### Shipments
- **ordercloud.shipments.search** — Search shipments
- **ordercloud.shipments.get** — Get a shipment by ID
- **ordercloud.shipments.create** — Create a new shipment
- **ordercloud.shipments.patch** — Update a shipment
- **ordercloud.shipments.addLineItem** — Add line item to shipment
- **ordercloud.shipments.listForOrder** — List shipments for an order

### Promotions
- **ordercloud.promotions.search** — Search promotions
- **ordercloud.promotions.get** — Get a promotion by ID
- **ordercloud.promotions.create** — Create a new promotion
- **ordercloud.promotions.patch** — Update a promotion
- **ordercloud.promotions.delete** — Delete a promotion
- **ordercloud.promotions.assign** — Assign promotion to buyer

### Price Schedules
- **ordercloud.priceSchedules.list** — List price schedules
- **ordercloud.priceSchedules.get** — Get a price schedule by ID
- **ordercloud.priceSchedules.create** — Create a new price schedule
- **ordercloud.priceSchedules.patch** — Update a price schedule
- **ordercloud.priceSchedules.addPriceBreak** — Add price break to schedule

### Specs
- **ordercloud.specs.list** — List specs
- **ordercloud.specs.get** — Get a spec by ID
- **ordercloud.specs.create** — Create a new spec
- **ordercloud.specs.patch** — Update a spec
- **ordercloud.specs.delete** — Delete a spec
- **ordercloud.specs.options.list** — List spec options
- **ordercloud.specs.options.add** — Add spec option

### Cost Centers & Spending Accounts
- **ordercloud.costCenters.list** — List cost centers
- **ordercloud.costCenters.get** — Get a cost center by ID
- **ordercloud.costCenters.create** — Create a new cost center
- **ordercloud.costCenters.patch** — Update a cost center
- **ordercloud.costCenters.delete** — Delete a cost center
- **ordercloud.spendingAccounts.list** — List spending accounts
- **ordercloud.spendingAccounts.get** — Get a spending account by ID
- **ordercloud.spendingAccounts.create** — Create a new spending account
- **ordercloud.spendingAccounts.patch** — Update a spending account
- **ordercloud.spendingAccounts.delete** — Delete a spending account

### XP (Extended Properties)
- **ordercloud.xp.get** — Read xp from any resource
- **ordercloud.xp.patch** — Safely deep-merge xp updates (validates size and key names)

### Bulk Product Operations
- **ordercloud.bulk.products.create** — Create multiple products in batches with per-item success/failure
- **ordercloud.bulk.products.patch** — Patch multiple products in batches
- **ordercloud.bulk.products.delete** — Delete multiple products in batches
- **ordercloud.bulk.products.activate** — Activate or deactivate multiple products in batches

### Composite Tools
- **ordercloud.products.createFull** — Create product + default price schedule + specs + variants + category assignments in one flow
- **ordercloud.orders.fulfill** — Create shipment, add line items, and patch order status in one flow
- **ordercloud.customers.onboard** — Create buyer + admin user + address in one flow
- **ordercloud.products.bulkActivate** — Activate or deactivate multiple products by ID list
- **ordercloud.orders.generateReport** — Fetch orders in a date range and return analytics (counts, status breakdown, totals)

### Audit
- **ordercloud.audit.export** — Export audit log entries (filter by resource type, action, date range) for compliance and debugging

## MCP Resources

The server exposes read-only resources (URIs) that clients can load for schemas, docs, and runtime state:

| URI / Pattern | Description |
|---------------|-------------|
| `ordercloud://schema/product` | Product schema and field docs |
| `ordercloud://schema/order` | Order schema and field docs |
| `ordercloud://schema/user`, `lineItem`, `address`, `catalog`, `category`, `buyer`, `supplier`, `spec`, `promotion`, `shipment`, `payment` | Other entity schemas |
| `ordercloud://docs/api` | API overview, auth, and usage |
| `ordercloud://docs/rate-limits` | Rate limits and best practices |
| `ordercloud://docs/error-codes` | Error code reference |
| `ordercloud://docs/best-practices` | Best practices and patterns |
| `ordercloud://connection` | Connection status and config (auth mode, base URL) |
| `ordercloud://xp/schemas` | XP schema templates and examples |
| `ordercloud://audit/log` | Audit log entries (same data as `ordercloud.audit.export`) |

Use these in your MCP client to pull schema and docs without calling the OrderCloud API.

## MCP Prompts

Workflow prompts guide the assistant through multi-step tasks:

| Prompt | Purpose |
|--------|---------|
| **product-create** | Create a product with pricing and optional specs/variants/categories |
| **product-bulk-import** | Bulk import products from CSV/JSON with validation and error handling |
| **product-pricing-update** | Update pricing (price schedule / price breaks) for products |
| **order-fulfill** | Fulfill an order (shipment + line items + status) |
| **order-approve** | Approve/reject orders with optional notes |
| **order-analysis** | Analyze orders (filters, aggregates, trends) |
| **order-trends** | Order trends over time and by status |
| **product-performance** | Product performance metrics (quantity sold, revenue) |
| **customer-activity** | Customer (buyer/user) activity and order history |
| **bulk-activate-products** | Activate or deactivate many products |
| **bulk-update-inventory** | Bulk update product inventory |
| **bulk-assign-categories** | Assign products to categories in bulk |

## Composite Tools (multi-step flows)

Composite tools run several API steps in one call and return a combined result:

- **products.createFull** — Creates the product, default price schedule, specs (with options), generated variants, and category assignments. Use for full product setup in one step.
- **orders.fulfill** — Creates a shipment, adds line items to it, and patches the order status. Use for fulfillment workflows.
- **customers.onboard** — Creates a buyer, an admin user, and an address. Use for new customer onboarding.
- **products.bulkActivate** — Activates or deactivates a list of product IDs (no batching; use `bulk.products.activate` for large lists with batching).
- **orders.generateReport** — Fetches orders in a date range and returns counts, status breakdown, and totals for reporting.

## Bulk Operations

Bulk product tools process multiple items in configurable batches and return per-item success/failure:

- **bulk.products.create** — Create many products; optional `batchSize`; returns `created`, `errors` per item.
- **bulk.products.patch** — Patch many products by ID with a shared patch payload.
- **bulk.products.delete** — Delete many products by ID.
- **bulk.products.activate** — Activate or deactivate many products by ID.

Use for imports, mass updates, or cleanup. All mutations are recorded in the audit log.

## Dry-Run Mode

Product create, patch, and delete support optional **dry-run** to validate without persisting:

- **ordercloud.products.create** — Pass `dryRun: true` to validate payload and return what would be created.
- **ordercloud.products.patch** — Pass `dryRun: true` to validate merge and return what would be updated.
- **ordercloud.products.delete** — Pass `dryRun: true` to check existence and return what would be deleted.

No OrderCloud API write is performed when `dryRun` is true.

## Audit Logging

Every mutation (create, patch, delete, setDefaultPrice, etc.) across all resource modules, bulk tools, and composite tools is recorded in an in-memory audit log. Use it for compliance and debugging.

- **ordercloud.audit.export** — Export entries with optional filters: `resourceType`, `action`, `from`, `to`, `limit`.
- **ordercloud://audit/log** — MCP resource that returns the same audit log data.

Entries include resource type, action, identifiers, timestamp, and optional details.

## Example Tool Calls

```
# Check connectivity
ordercloud.ping {}

# Search active products
ordercloud.products.search { "filters": { "Active": "true" }, "pageSize": 10 }

# Get order worksheet
ordercloud.orders.getWorksheet { "direction": "Incoming", "orderId": "ORD-001" }

# Update product xp
ordercloud.xp.patch {
  "resourceType": "Product",
  "identifiers": { "productId": "PROD-001" },
  "xpPatch": { "color": "blue", "metadata": { "source": "import" } }
}

# Bulk create products (batch of 5)
ordercloud.bulk.products.create { "products": [...], "batchSize": 5 }

# Full product setup (product + price + specs + variants + categories)
ordercloud.products.createFull { "product": {...}, "defaultPriceSchedule": {...}, "specs": [...], "categoryIds": [...] }

# Export audit log for compliance
ordercloud.audit.export { "resourceType": "Product", "action": "Create", "from": "2025-03-01", "to": "2025-03-04", "limit": 100 }
```

## Recommended OrderCloud Scopes

| Tool Group | Minimum Scopes |
|---|---|
| Products | `ProductAdmin` or `ProductReader` |
| Catalogs/Categories | `CatalogAdmin` or `CatalogReader` |
| Buyers/Users | `BuyerAdmin` or `BuyerReader` |
| Orders | `OrderAdmin` or `OrderReader` |
| Full access | `FullAccess` |

Use `ProductReader`, `CatalogReader`, etc. for read-only operations to follow least-privilege.

## Sandbox vs Production

- **Sandbox**: `ORDERCLOUD_BASE_URL=https://sandboxapi.ordercloud.io` (default)
- **Production**: `ORDERCLOUD_BASE_URL=https://api.ordercloud.io`

Always test in sandbox first. The `ordercloud.ping` tool confirms which environment you're connected to.

## Security Notes

- Secrets are never logged; tokens are masked in stderr output
- Token caching with automatic refresh before expiry
- Exponential backoff retry on 429/5xx responses
- XP patch validates payload size (64KB limit) and rejects `$`-prefixed keys
