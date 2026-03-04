/**
 * Registers OrderCloud resources with the MCP server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OrderCloudClient } from "./client.js";
import { getAuditLog } from "./helpers/audit.js";

const PRODUCT_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OrderCloud Product",
  "type": "object",
  "properties": {
    "ID": { "type": "string", "description": "Unique identifier (max 100 chars)" },
    "Name": { "type": "string", "description": "Product name (max 200 chars)" },
    "Description": { "type": "string", "description": "Product description (max 2000 chars)" },
    "Active": { "type": "boolean", "description": "Whether product is active" },
    "InventoryEnabled": { "type": "string", "enum": ["NoInventory", "QuantityAvailable", "QuantityAvailable2"], "description": "Inventory tracking mode" },
    "InventoryQuantity": { "type": "integer", "description": "Current inventory quantity" },
    "PriceSchedule": { "type": "object", "description": "Associated price schedule" },
    "DefaultPriceScheduleID": { "type": "string", "description": "Default price schedule ID" },
    "SpecCount": { "type": "integer", "description": "Number of specs" },
    "VariantCount": { "type": "integer", "description": "Number of variants" },
    "ShipWeight": { "type": "number", "description": "Shipping weight" },
    "ShipHeight": { "type": "number", "description": "Shipping height" },
    "ShipWidth": { "type": "number", "description": "Shipping width" },
    "ShipLength": { "type": "number", "description": "Shipping length" },
    "xp": { "type": "object", "description": "Extended properties (max 64KB)" },
    "DateCreated": { "type": "string", "format": "date-time" },
    "Updated": { "type": "string", "format": "date-time" }
  },
  "required": ["ID", "Name"]
};

const ORDER_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OrderCloud Order",
  "type": "object",
  "properties": {
    "ID": { "type": "string", "description": "Unique order ID" },
    "Name": { "type": "string", "description": "Order name (for submitted orders)" },
    "FromUserID": { "type": "string", "description": "User who placed the order" },
    "FromCompanyID": { "type": "string", "description": "Buyer company ID" },
    "ToCompanyID": { "type": "string", "description": "Supplier company ID (for orders)" },
    "LineItemCount": { "type": "integer", "description": "Number of line items" },
    "Status": { "type": "string", "enum": ["Unsubmitted", "AwaitingApproval", "Pending", "Processing", "Complete", "Canceled"], "description": "Order status" },
    "Total": { "type": "number", "description": "Order total" },
    "Subtotal": { "type": "number", "description": "Subtotal before shipping/tax" },
    "ShippingCost": { "type": "number", "description": "Shipping cost" },
    "TaxCost": { "type": "number", "description": "Tax cost" },
    "Currency": { "type": "string", "description": "Currency code (USD, EUR, etc.)" },
    "BillingAddressID": { "type": "string", "description": "Billing address ID" },
    "BillingAddress": { "type": "object", "description": "Billing address object" },
    "ShippingAddressID": { "type": "string", "description": "Shipping address ID" },
    "ShippingAddress": { "type": "object", "description": "Shipping address object" },
    "ShipMethod": { "type": "string", "description": "Shipping method name" },
    "Comments": { "type": "string", "description": "Order comments" },
    "InternalComments": { "type": "string", "description": "Internal comments" },
    "xp": { "type": "object", "description": "Extended properties (max 64KB)" },
    "DateCreated": { "type": "string", "format": "date-time" },
    "DateSubmitted": { "type": "string", "format": "date-time" },
    "DateApproved": { "type": "string", "format": "date-time" },
    "DateCanceled": { "type": "string", "format": "date-time" },
    "DateCompleted": { "type": "string", "format": "date-time" }
  },
  "required": ["ID", "FromUserID", "FromCompanyID"]
};

const USER_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OrderCloud User",
  "type": "object",
  "properties": {
    "ID": { "type": "string", "description": "Unique user ID" },
    "Username": { "type": "string", "description": "Username (unique within buyer)" },
    "FirstName": { "type": "string", "description": "First name" },
    "LastName": { "type": "string", "description": "Last name" },
    "Email": { "type": "string", "format": "email", "description": "Email address" },
    "Phone": { "type": "string", "description": "Phone number" },
    "Active": { "type": "boolean", "description": "Whether user is active" },
    "BuyerID": { "type": "string", "description": "Associated buyer ID" },
    "SupplierID": { "type": "string", "description": "Associated supplier ID" },
    "SecurityProfileID": { "type": "string", "description": "Security profile ID" },
    "AvailableRoles": { "type": "array", "items": { "type": "string" }, "description": "Available roles" },
    "DefaultCatalogID": { "type": "string", "description": "Default catalog ID" },
    "AllowOutOfOrder": { "type": "boolean", "description": "Allow ordering when out of stock" },
    "ViewAllOrders": { "type": "boolean", "description": "Can view all orders in organization" },
    "ManageAllOrders": { "type": "boolean", "description": "Can manage all orders" },
    "xp": { "type": "object", "description": "Extended properties (max 64KB)" },
    "DateCreated": { "type": "string", "format": "date-time" },
    "LastLogin": { "type": "string", "format": "date-time" }
  },
  "required": ["ID", "Username"]
};

const LINE_ITEM_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OrderCloud LineItem",
  "type": "object",
  "properties": {
    "ID": { "type": "string", "description": "Unique line item ID" },
    "OrderID": { "type": "string", "description": "Parent order ID" },
    "ProductID": { "type": "string", "description": "Product ID" },
    "ProductName": { "type": "string", "description": "Product name" },
    "Quantity": { "type": "integer", "description": "Quantity ordered" },
    "UnitPrice": { "type": "number", "description": "Unit price" },
    "LineTotal": { "type": "number", "description": "Line total (Quantity * UnitPrice)" },
    "CostCenter": { "type": "string", "description": "Cost center" },
    "DateAdded": { "type": "string", "format": "date-time" },
    "Status": { "type": "string", "enum": ["Unsubmitted", "Submitted", "Canceled", "Returned"], "description": "Line item status" },
    "ShipQuantity": { "type": "integer", "description": "Quantity shipped" },
    "InvoicedQuantity": { "type": "integer", "description": "Quantity invoiced" },
    "Specs": { "type": "array", "items": { "type": "object" }, "description": "Selected spec options" },
    "Variant": { "type": "object", "description": "Product variant details" },
    "xp": { "type": "object", "description": "Extended properties (max 64KB)" }
  },
  "required": ["ID", "OrderID", "ProductID", "Quantity"]
};

const ADDRESS_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OrderCloud Address",
  "type": "object",
  "properties": {
    "ID": { "type": "string", "description": "Unique address ID" },
    "CompanyName": { "type": "string", "description": "Company name" },
    "FirstName": { "type": "string", "description": "First name" },
    "LastName": { "type": "string", "description": "Last name" },
    "Street1": { "type": "string", "description": "Address line 1" },
    "Street2": { "type": "string", "description": "Address line 2" },
    "Street3": { "type": "string", "description": "Address line 3" },
    "City": { "type": "string", "description": "City" },
    "State": { "type": "string", "description": "State/province" },
    "Zip": { "type": "string", "description": "Postal code" },
    "Country": { "type": "string", "description": "Country code (ISO 2-char)" },
    "Phone": { "type": "string", "description": "Phone number" },
    "AddressName": { "type": "string", "description": "Address nickname" },
    "BuyerID": { "type": "string", "description": "Associated buyer ID" },
    "SupplierID": { "type": "string", "description": "Associated supplier ID" },
    "IsDefault": { "type": "boolean", "description": "Is default address" },
    "IsBillingAddress": { "type": "boolean", "description": "Can be used for billing" },
    "IsShippingAddress": { "type": "boolean", "description": "Can be used for shipping" },
    "xp": { "type": "object", "description": "Extended properties (max 64KB)" }
  },
  "required": ["ID", "Street1", "City", "State", "Country"]
};

const API_OVERVIEW = {
  "title": "OrderCloud API Overview",
  "version": "v1",
  "baseUrl": "https://sandboxapi.ordercloud.io (sandbox) | https://api.ordercloud.io (production)",
  "authentication": {
    "clientCredentials": {
      "endpoint": "https://auth.ordercloud.io/oauth/token",
      "grantType": "client_credentials",
      "required": ["client_id", "client_secret", "scope"]
    },
    "bearerToken": {
      "endpoint": "Use existing access token",
      "header": "Authorization: Bearer {token}"
    }
  },
  "commonHeaders": {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  "commonQueryParams": {
    "page": "Page number (1-indexed)",
    "pageSize": "Items per page (default 20, max 100)",
    "sortBy": "Field to sort by (e.g., 'ID', 'DateCreated')",
    "search": "Full-text search across specified fields",
    "searchOn": "Comma-separated fields to search",
    "filters": "Field-specific filters (field=value)"
  }
};

const RATE_LIMITS = {
  "title": "OrderCloud Rate Limits",
  "general": {
    "requestsPerSecond": 10,
    "burstLimit": 20,
    "description": "General API rate limit"
  },
  "endpoints": {
    "/v1/orders": {
      "POST": "6 requests per second",
      "GET": "10 requests per second"
    },
    "/v1/orders/{id}/submit": {
      "POST": "4 requests per second"
    },
    "/v1/products": {
      "all": "10 requests per second"
    }
  },
  "handling": {
    "responseCode": 429,
    "headers": {
      "RetryAfter": "Seconds to wait before retrying",
      "XRateLimitLimit": "Requests allowed in window",
      "XRateLimitRemaining": "Requests remaining in window",
      "XRateLimitReset": "Unix timestamp when limit resets"
    },
    "strategy": "Exponential backoff recommended"
  }
};

const ERROR_CODES = {
  "title": "OrderCloud Error Codes",
  "httpErrors": {
    "400": {
      "name": "Bad Request",
      "description": "Invalid request body or parameters",
      "commonCauses": ["Missing required fields", "Invalid field format", "XP size exceeds 64KB"]
    },
    "401": {
      "name": "Unauthorized",
      "description": "Missing or invalid authentication",
      "commonCauses": ["Expired token", "Invalid token", "Missing Authorization header"]
    },
    "403": {
      "name": "Forbidden",
      "description": "Insufficient permissions",
      "commonCauses": ["User lacks required role", "Security profile restrictions"]
    },
    "404": {
      "name": "Not Found",
      "description": "Resource does not exist",
      "commonCauses": ["Invalid ID", "Resource deleted", "Wrong environment (sandbox vs prod)"]
    },
    "409": {
      "name": "Conflict",
      "description": "Resource conflict",
      "commonCauses": ["Duplicate ID", "Concurrent modification"]
    },
    "422": {
      "name": "Unprocessable Entity",
      "description": "Validation error",
      "commonCauses": ["Invalid field value", "Business rule violation"]
    },
    "429": {
      "name": "Too Many Requests",
      "description": "Rate limit exceeded",
      "commonCauses": "Too many requests per second"
    },
    "500": {
      "name": "Internal Server Error",
      "description": "OrderCloud service error",
      "commonCauses": "Temporary service issues"
    }
  },
  "ocErrors": {
    "ExistingID": "Resource with this ID already exists",
    "NotFound": "Requested resource not found",
    "ValidationError": "One or more validation errors occurred",
    "InsufficientPermissions": "User lacks required permissions",
    "InvalidToken": "Authentication token is invalid or expired",
    "MissingToken": "Authentication token is required",
    "InvalidScope": "Requested scope not granted",
    "Locked": "Resource is locked and cannot be modified",
    "Canceled": "Operation not allowed on canceled resource"
  }
};

const BEST_PRACTICES = {
  "title": "OrderCloud Best Practices",
  "authentication": [
    "Use client credentials for server-to-server integration",
    "Implement token caching with 60s expiry buffer",
    "Handle 401 errors by re-authenticating"
  ],
  "errorHandling": [
    "Implement exponential backoff for 429 and 5xx errors",
    "Parse error responses for specific error codes",
    "Log errors with context for debugging"
  ],
  "performance": [
    "Use list endpoints with pagination (pageSize ≤ 100)",
    "Apply filters to reduce response size",
    "Use search for full-text queries",
    "Batch operations when possible"
  ],
  "dataIntegrity": [
    "Validate XP size before sending (< 64KB)",
    "Sanitize XP keys (no dots or $ prefixes)",
    "Use deep merge for XP patching"
  ],
  "commonPatterns": {
    "listResources": "GET /v1/{resource}?page=1&pageSize=20",
    "getResource": "GET /v1/{resource}/{id}",
    "createResource": "POST /v1/{resource}",
    "updateResource": "PATCH /v1/{resource}/{id}",
    "deleteResource": "DELETE /v1/{resource}/{id}",
    "search": "GET /v1/{resource}?search={term}&searchOn=Name,Description"
  }
};

export function registerMcpResources(server: McpServer, client: OrderCloudClient): void {
  server.registerResource(
    "ordercloud://schema/product",
    "ordercloud://schema/product",
    { description: "OrderCloud Product entity schema with all properties and types" },
    async () => ({
      contents: [{
        uri: "ordercloud://schema/product",
        mimeType: "application/json",
        text: JSON.stringify(PRODUCT_SCHEMA, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://schema/order",
    "ordercloud://schema/order",
    { description: "OrderCloud Order entity schema with all properties and types" },
    async () => ({
      contents: [{
        uri: "ordercloud://schema/order",
        mimeType: "application/json",
        text: JSON.stringify(ORDER_SCHEMA, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://schema/user",
    "ordercloud://schema/user",
    { description: "OrderCloud User entity schema with all properties and types" },
    async () => ({
      contents: [{
        uri: "ordercloud://schema/user",
        mimeType: "application/json",
        text: JSON.stringify(USER_SCHEMA, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://schema/lineitem",
    "ordercloud://schema/lineitem",
    { description: "OrderCloud LineItem entity schema with all properties and types" },
    async () => ({
      contents: [{
        uri: "ordercloud://schema/lineitem",
        mimeType: "application/json",
        text: JSON.stringify(LINE_ITEM_SCHEMA, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://schema/address",
    "ordercloud://schema/address",
    { description: "OrderCloud Address entity schema with all properties and types" },
    async () => ({
      contents: [{
        uri: "ordercloud://schema/address",
        mimeType: "application/json",
        text: JSON.stringify(ADDRESS_SCHEMA, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://docs/api-overview",
    "ordercloud://docs/api-overview",
    { description: "OrderCloud API overview including base URLs, authentication, and common headers" },
    async () => ({
      contents: [{
        uri: "ordercloud://docs/api-overview",
        mimeType: "application/json",
        text: JSON.stringify(API_OVERVIEW, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://docs/rate-limits",
    "ordercloud://docs/rate-limits",
    { description: "OrderCloud API rate limits and handling recommendations" },
    async () => ({
      contents: [{
        uri: "ordercloud://docs/rate-limits",
        mimeType: "application/json",
        text: JSON.stringify(RATE_LIMITS, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://docs/error-codes",
    "ordercloud://docs/error-codes",
    { description: "OrderCloud HTTP and OrderCloud-specific error codes" },
    async () => ({
      contents: [{
        uri: "ordercloud://docs/error-codes",
        mimeType: "application/json",
        text: JSON.stringify(ERROR_CODES, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://docs/best-practices",
    "ordercloud://docs/best-practices",
    { description: "OrderCloud API best practices and common patterns" },
    async () => ({
      contents: [{
        uri: "ordercloud://docs/best-practices",
        mimeType: "application/json",
        text: JSON.stringify(BEST_PRACTICES, null, 2)
      }]
    })
  );

  server.registerResource(
    "ordercloud://connection/status",
    "ordercloud://connection/status",
    { description: "Current connection status including auth mode, token expiry, and connectivity" },
    async () => {
      const status = {
        connected: client.isConnected,
        authMode: client.currentAuthMode,
        baseUrl: client.baseUrl,
        tokenExpiresIn: client.tokenExpiresIn,
        environment: client.baseUrl.includes("sandbox") ? "sandbox" : "production"
      };

      return {
        contents: [{
          uri: "ordercloud://connection/status",
          mimeType: "application/json",
          text: JSON.stringify(status, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://connection/config",
    "ordercloud://connection/config",
    { description: "Current API configuration including URLs and environment" },
    async () => {
      const config = {
        baseUrl: client.baseUrl,
        authUrl: client.authUrl,
        environment: client.baseUrl.includes("sandbox") ? "sandbox" : "production",
        clientId: client.clientId ? `${client.clientId.slice(0, 8)}...` : undefined,
        scope: client.scope
      };

      return {
        contents: [{
          uri: "ordercloud://connection/config",
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://xp-schemas/product",
    "ordercloud://xp-schemas/product",
    { description: "Template for Product extended properties (XP) - customize for your implementation" },
    async () => {
      const xpSchema = {
        "description": "Custom product extended properties - modify to match your implementation",
        "template": {
          "Category": "Product category string",
          "Tags": ["array", "of", "tags"],
          "Images": [{ "url": "string", "type": "thumbnail|detail" }],
          "CustomFields": { "fieldName": "value" },
          "Metadata": { "createdBy": "string", "lastModified": "ISO date" }
        },
        "constraints": {
          "maxSize": "64KB (65,536 bytes)",
          "keyRules": "No dots (.) or dollar signs ($) at start of keys",
          "valueTypes": "JSON-serializable values only"
        },
        "usage": "PATCH to update, retrieve full XP object on GET"
      };

      return {
        contents: [{
          uri: "ordercloud://xp-schemas/product",
          mimeType: "application/json",
          text: JSON.stringify(xpSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://xp-schemas/order",
    "ordercloud://xp-schemas/order",
    { description: "Template for Order extended properties (XP) - customize for your implementation" },
    async () => {
      const xpSchema = {
        "description": "Custom order extended properties - modify to match your implementation",
        "template": {
          "PurchaseOrderNumber": "string",
          "RequestedDeliveryDate": "ISO date string",
          "Department": "string",
          "ApprovalChain": [{ "approver": "string", "status": "pending|approved|rejected", "date": "ISO date" }],
          "Notes": "string",
          "Source": "web|api|mobile",
          "Metadata": { "createdBy": "string", "lastModified": "ISO date" }
        },
        "constraints": {
          "maxSize": "64KB (65,536 bytes)",
          "keyRules": "No dots (.) or dollar signs ($) at start of keys",
          "valueTypes": "JSON-serializable values only"
        },
        "commonUseCases": [
          "Purchase order reference numbers",
          "Custom delivery instructions",
          "Approval workflow tracking",
          "Source channel tracking"
        ]
      };

      return {
        contents: [{
          uri: "ordercloud://xp-schemas/order",
          mimeType: "application/json",
          text: JSON.stringify(xpSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/catalog",
    "ordercloud://schema/catalog",
    { description: "OrderCloud Catalog entity schema" },
    async () => {
      const catalogSchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Catalog",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique catalog ID" },
          "Name": { "type": "string", "description": "Catalog name" },
          "Description": { "type": "string", "description": "Catalog description" },
          "Active": { "type": "boolean", "description": "Whether catalog is active" },
          "CategoryCount": { "type": "integer", "description": "Number of categories" },
          "ProductCount": { "type": "integer", "description": "Number of products" },
          "xp": { "type": "object", "description": "Extended properties" }
        },
        "required": ["ID", "Name"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/catalog",
          mimeType: "application/json",
          text: JSON.stringify(catalogSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/category",
    "ordercloud://schema/category",
    { description: "OrderCloud Category entity schema" },
    async () => {
      const categorySchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Category",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique category ID" },
          "Name": { "type": "string", "description": "Category name" },
          "Description": { "type": "string", "description": "Category description" },
          "ParentID": { "type": "string", "description": "Parent category ID for nesting" },
          "CatalogID": { "type": "string", "description": "Parent catalog ID" },
          "Active": { "type": "boolean", "description": "Whether category is active" },
          "ProductCount": { "type": "integer", "description": "Number of products" },
          "xp": { "type": "object", "description": "Extended properties" }
        },
        "required": ["ID", "Name", "CatalogID"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/category",
          mimeType: "application/json",
          text: JSON.stringify(categorySchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/buyer",
    "ordercloud://schema/buyer",
    { description: "OrderCloud Buyer organization schema" },
    async () => {
      const buyerSchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Buyer",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique buyer ID" },
          "Name": { "type": "string", "description": "Buyer organization name" },
          "Active": { "type": "boolean", "description": "Whether buyer is active" },
          "DefaultCatalogID": { "type": "string", "description": "Default catalog ID" },
          "AddressCount": { "type": "integer", "description": "Number of addresses" },
          "UserCount": { "type": "integer", "description": "Number of users" },
          "xp": { "type": "object", "description": "Extended properties" },
          "DateCreated": { "type": "string", "format": "date-time" }
        },
        "required": ["ID", "Name"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/buyer",
          mimeType: "application/json",
          text: JSON.stringify(buyerSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/supplier",
    "ordercloud://schema/supplier",
    { description: "OrderCloud Supplier organization schema" },
    async () => {
      const supplierSchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Supplier",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique supplier ID" },
          "Name": { "type": "string", "description": "Supplier organization name" },
          "Active": { "type": "boolean", "description": "Whether supplier is active" },
          "AddressCount": { "type": "integer", "description": "Number of addresses" },
          "UserCount": { "type": "integer", "description": "Number of users" },
          "xp": { "type": "object", "description": "Extended properties" },
          "DateCreated": { "type": "string", "format": "date-time" }
        },
        "required": ["ID", "Name"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/supplier",
          mimeType: "application/json",
          text: JSON.stringify(supplierSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/spec",
    "ordercloud://schema/spec",
    { description: "OrderCloud Product Spec entity schema" },
    async () => {
      const specSchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Spec",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique spec ID" },
          "Name": { "type": "string", "description": "Spec name" },
          "Description": { "type": "string", "description": "Spec description" },
          "Required": { "type": "boolean", "description": "Whether spec is required" },
          "AllowOpenText": { "type": "boolean", "description": "Allow custom text input" },
          "DefaultValue": { "type": "string", "description": "Default option ID" },
          "Options": {
            "type": "array",
            "items": {
              "ID": "string",
              "Name": "string",
              "PriceMarkup": "number",
              "Description": "string"
            },
            "description": "Available spec options"
          },
          "xp": { "type": "object", "description": "Extended properties" }
        },
        "required": ["ID", "Name"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/spec",
          mimeType: "application/json",
          text: JSON.stringify(specSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/promotion",
    "ordercloud://schema/promotion",
    { description: "OrderCloud Promotion entity schema" },
    async () => {
      const promotionSchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Promotion",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique promotion ID" },
          "Code": { "type": "string", "description": "Promo code (uppercase)" },
          "Name": { "type": "string", "description": "Promotion name" },
          "Description": { "type": "string", "description": "Promotion description" },
          "Active": { "type": "boolean", "description": "Whether promotion is active" },
          "StartDate": { "type": "string", "format": "date-time", "description": "Start date" },
          "EndDate": { "type": "string", "format": "date-time", "description": "End date" },
          "UsageLimit": { "type": "integer", "description": "Max uses (null = unlimited)" },
          "UsageCount": { "type": "integer", "description": "Current usage" },
          "AutoApply": { "type": "boolean", "description": "Auto-apply to orders" },
          "Priority": { "type": "integer", "description": "Priority (higher = applied first)" },
          "xp": { "type": "object", "description": "Extended properties" }
        },
        "required": ["ID", "Code", "Name"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/promotion",
          mimeType: "application/json",
          text: JSON.stringify(promotionSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/shipment",
    "ordercloud://schema/shipment",
    { description: "OrderCloud Shipment entity schema" },
    async () => {
      const shipmentSchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Shipment",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique shipment ID" },
          "OrderID": { "type": "string", "description": "Associated order ID" },
          "BuyerID": { "type": "string", "description": "Buyer ID" },
          "SupplierID": { "type": "string", "description": "Supplier ID" },
          "Shipper": { "type": "string", "description": "Shipper name" },
          "TrackingNumber": { "type": "string", "description": "Tracking number" },
          "TrackingURL": { "type": "string", "format": "uri", "description": "Tracking URL" },
          "Status": { "type": "string", "enum": ["Unpacked", "Packed", "Shipped", "Delivered", "Cancelled"], "description": "Shipment status" },
          "DateShipped": { "type": "string", "format": "date-time", "description": "Ship date" },
          "DateDelivered": { "type": "string", "format": "date-time", "description": "Delivery date" },
          "LineItems": {
            "type": "array",
            "items": {
              "LineItemID": "string",
              "Quantity": "integer"
            },
            "description": "Shipped line items"
          },
          "xp": { "type": "object", "description": "Extended properties" }
        },
        "required": ["ID", "OrderID"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/shipment",
          mimeType: "application/json",
          text: JSON.stringify(shipmentSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://schema/payment",
    "ordercloud://schema/payment",
    { description: "OrderCloud Payment entity schema" },
    async () => {
      const paymentSchema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderCloud Payment",
        "type": "object",
        "properties": {
          "ID": { "type": "string", "description": "Unique payment ID" },
          "OrderID": { "type": "string", "description": "Associated order ID" },
          "Type": { "type": "string", "enum": ["CreditCard", "PurchaseOrder", "PayPal", "Check", "SpendingAccount"], "description": "Payment type" },
          "Status": { "type": "string", "enum": ["Pending", "Authorized", "Captured", "Voided", "Failed"], "description": "Payment status" },
          "Amount": { "type": "number", "description": "Payment amount" },
          "Currency": { "type": "string", "description": "Currency code" },
          "AcceptedDate": { "type": "string", "format": "date-time", "description": "When payment was accepted" },
          "Transactions": {
            "type": "array",
            "items": {
              "ID": "string",
              "Type": "string",
              "Status": "string",
              "Amount": "number",
              "DateExecuted": "string"
            },
            "description": "Payment transactions"
          },
          "xp": { "type": "object", "description": "Extended properties" }
        },
        "required": ["ID", "OrderID", "Type", "Amount"]
      };

      return {
        contents: [{
          uri: "ordercloud://schema/payment",
          mimeType: "application/json",
          text: JSON.stringify(paymentSchema, null, 2)
        }]
      };
    }
  );

  server.registerResource(
    "ordercloud://audit/log",
    "ordercloud://audit/log",
    { description: "Audit log of all mutations (create/update/delete) for compliance and debugging" },
    async () => {
      const log = getAuditLog();
      const payload = { count: log.length, entries: log, exportedAt: new Date().toISOString() };
      return {
        contents: [{
          uri: "ordercloud://audit/log",
          mimeType: "application/json",
          text: JSON.stringify(payload, null, 2)
        }]
      };
    }
  );

  process.stderr.write("[ordercloud-mcp] MCP Resources registered\n");
}
