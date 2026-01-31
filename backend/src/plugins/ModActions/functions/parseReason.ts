import { z } from "zod";
import { zModActionsConfig } from "../types.js";

type TConfigSchema = z.infer<typeof zModActionsConfig>;

const MAX_REASON_LENGTH = 512;

/**
 * Parse and expand reason aliases from the config.
 * Also truncates very long reasons to MAX_REASON_LENGTH.
 */
export function parseReason(config: TConfigSchema, reason: string | undefined): string | undefined {
  if (!reason) return reason;
  if (config?.reason_aliases) {
    // Normalize lookup to lowercase for case-insensitive matching
    const lowerReason = reason.toLowerCase();
    for (const [key, value] of Object.entries(config.reason_aliases)) {
      if (key.toLowerCase() === lowerReason) {
        reason = value;
        break;
      }
    }
  }
  if (reason.length > MAX_REASON_LENGTH) {
    reason = reason.substring(0, MAX_REASON_LENGTH - 4) + " […]";
  }
  return reason;
}

