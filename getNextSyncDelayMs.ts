/**
 * @fileoverview Scheduling helper for recurring sync jitter.
 */

const BASE_DELAY_MS = 60 * 60 * 1000;
const MAX_JITTER_MS = 12 * 60 * 1000;

/**
 * Returns the next sync delay with jitter to avoid a rigid hourly pattern.
 *
 * @returns Delay in milliseconds.
 */
export function getNextSyncDelayMs(): number {
  const jitterMs = Math.floor(Math.random() * (MAX_JITTER_MS * 2 + 1)) - MAX_JITTER_MS;
  return BASE_DELAY_MS + jitterMs;
}
