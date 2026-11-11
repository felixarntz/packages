import { logger } from "./logger";

/**
 * Runs an asynchronous action while logging a heartbeat message at regular intervals.
 *
 * @param opts.action - The asynchronous action to run.
 * @param opts.heartbeatMessage - The message to log at each interval. Defaults to 'Still working...'.
 * @param opts.intervalMs - The interval in milliseconds between heartbeat messages. Defaults to 5000 ms.
 * @returns A promise that resolves with the result of the action.
 */
export function runWithHeartbeat<T>(opts: {
  action: () => Promise<T>;
  heartbeatMessage?: string;
  intervalMs?: number;
}): Promise<T> {
  const {
    action,
    heartbeatMessage = "Still working...",
    intervalMs = 5000,
  } = opts;
  const intervalId = setInterval(() => {
    logger.info(heartbeatMessage);
  }, intervalMs);

  return action().finally(() => {
    clearInterval(intervalId);
  });
}
