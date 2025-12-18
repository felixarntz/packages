import { logger } from './logger';

/**
 * Runs an asynchronous action while logging a heartbeat message at regular intervals.
 *
 * @param action - The asynchronous action to run.
 * @param heartbeatMessage - The message to log at each interval. Defaults to 'Still working...'.
 * @param intervalMs - The interval in milliseconds between heartbeat messages. Defaults to 5000 ms.
 * @returns A promise that resolves with the result of the action.
 */
export async function runWithHeartbeat<T>(
  action: () => Promise<T>,
  heartbeatMessage: string = 'Still working...',
  intervalMs: number = 5000,
): Promise<T> {
  const intervalID = setInterval(() => {
    logger.info(heartbeatMessage);
  }, intervalMs);

  return action().finally(() => {
    clearInterval(intervalID);
  });
}
