import { styleText } from "node:util";

export const LogLevel = {
  DEBUG: 0,
  ERROR: 4,
  INFO: 1,
  SILENT: 5,
  SUCCESS: 2,
  WARN: 3,
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

type TextStyles =
  | "bold"
  | "cyan"
  | "magenta"
  | "green"
  | "red"
  | "yellowBright";

const createStyledText =
  (style: TextStyles) =>
  (text: string): string =>
    styleText(style, text);

const formatBold = createStyledText("bold");
const colorError = createStyledText("red");
const colorWarning = createStyledText("yellowBright");
const colorSuccess = createStyledText("green");
const colorInfo = createStyledText("magenta");
const colorDebug = createStyledText("cyan");

const formatLogMessage = (text: string, level: LogLevel): string => {
  switch (level) {
    case LogLevel.DEBUG:
      return colorDebug(text);
    case LogLevel.INFO:
      return colorInfo(text);
    case LogLevel.SUCCESS:
      return formatBold(colorSuccess(`✅ ${text}`));
    case LogLevel.WARN:
      return formatBold(colorWarning(`⚠️ ${text}`));
    case LogLevel.ERROR:
      return formatBold(colorError(`❌ ${text}`));
    default:
      return text;
  }
};

const writeLog = (opts: { text: string; level?: LogLevel }): void => {
  const level = opts.level ?? LogLevel.INFO;
  if (level < CURRENT_LOG_LEVEL) {
    return;
  }
  process.stderr.write(`${formatLogMessage(opts.text, level)}\n`);
};

const DEFAULT_LOG_LEVEL = LogLevel.INFO;
let CURRENT_LOG_LEVEL: LogLevel = DEFAULT_LOG_LEVEL;
if (
  process.env["NODE_ENV"] === "development" ||
  process.env["DEBUG"] === "true"
) {
  CURRENT_LOG_LEVEL = LogLevel.DEBUG;
} else if (process.env["SILENT"] === "true") {
  CURRENT_LOG_LEVEL = LogLevel.SILENT;
}

/**
 * Default logger instance.
 */
export const logger = {
  /**
   * Logs a debug message.
   *
   * @param text - The message to log.
   */
  debug(text: string): void {
    writeLog({ level: LogLevel.DEBUG, text });
  },

  /**
   * Logs an error message.
   *
   * @param text - The message to log.
   */
  error(text: string): void {
    writeLog({ level: LogLevel.ERROR, text });
  },

  /**
   * Logs an info message.
   *
   * @param text - The message to log.
   */
  info(text: string): void {
    writeLog({ level: LogLevel.INFO, text });
  },

  /**
   * Logs a success message.
   *
   * @param text - The message to log.
   */
  success(text: string): void {
    writeLog({ level: LogLevel.SUCCESS, text });
  },

  /**
   * Logs a warning message.
   *
   * @param text - The message to log.
   */
  warn(text: string): void {
    writeLog({ level: LogLevel.WARN, text });
  },
};
