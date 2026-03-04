/**
 * Phase 5.3: Audit logging for mutations.
 * In-memory log; export via ordercloud.audit.export tool or ordercloud://audit/log resource.
 */
export type AuditOperation = "create" | "update" | "delete";

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO 8601
  operation: AuditOperation;
  toolName: string;
  resourceType: string;
  resourceId?: string;
  paramsSanitized: Record<string, unknown>; // Params with secrets redacted
  success: boolean;
  errorMessage?: string;
}

const entries: AuditEntry[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `audit-${Date.now()}-${idCounter}`;
}

/**
 * Record a mutation for audit. Call after successful (or failed) create/update/delete.
 */
export function recordAudit(entry: Omit<AuditEntry, "id" | "timestamp">): void {
  entries.push({
    id: nextId(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

/**
 * Return all audit entries (for export).
 */
export function getAuditLog(): AuditEntry[] {
  return [...entries];
}

/**
 * Clear audit log (e.g. for tests). Not exposed by default.
 */
export function clearAuditLog(): void {
  entries.length = 0;
}

/**
 * Sanitize params for logging: redact known secret keys, limit size.
 */
export function sanitizeForAudit(params: Record<string, unknown>, maxKeys = 50): Record<string, unknown> {
  const redactKeys = ["client_secret", "clientSecret", "password", "accessToken", "access_token"];
  const out: Record<string, unknown> = {};
  let keys = 0;
  for (const [k, v] of Object.entries(params)) {
    if (keys >= maxKeys) break;
    const keyLower = k.toLowerCase();
    if (redactKeys.some((r) => keyLower.includes(r))) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = sanitizeForAudit(v as Record<string, unknown>, 10);
    } else {
      out[k] = v;
    }
    keys++;
  }
  return out;
}
