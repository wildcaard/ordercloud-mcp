# ordercloud-mcp

[![npm version](https://img.shields.io/npm/v/ordercloud-mcp.svg)](https://www.npmjs.com/package/ordercloud-mcp)
[![npm license](https://img.shields.io/npm/l/ordercloud-mcp.svg)](https://github.com/wildcaard/ordercloud-mcp/blob/main/LICENSE)
[![Node.js Version](https://img.shields.io/node/v/ordercloud-mcp.svg)](https://nodejs.org/)
[![Build Status](https://github.com/wildcaard/ordercloud-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/wildcaard/ordercloud-mcp/actions)

MCP Server for Sitecore OrderCloud exposes admin operations as typed MCP tools for Claude Code and other MCP clients.

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
- **ordercloud.products.create** — Create a new product
- **ordercloud.products.patch** — Partial update (merge patch)
- **ordercloud.products.delete** — Delete a product
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
