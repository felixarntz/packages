import { styleText } from "node:util";

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5,
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

const DEFAULT_LOG_LEVEL = LogLevel.INFO;
let CURRENT_LOG_LEVEL: LogLevel = DEFAULT_LOG_LEVEL;
// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
if (
  process.env["NODE_ENV"] === "development" ||
  process.env["DEBUG"] === "true"
) {
  CURRENT_LOG_LEVEL = LogLevel.DEBUG;
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
} else if (process.env["SILENT"] === "true") {
  CURRENT_LOG_LEVEL = LogLevel.SILENT;
}

/**
 * Logger class for logging messages with different severity levels.
 */
class Logger {
  /**
   * Logs a debug message.
   *
   * @param text - The message to log.
   */
  debug(text: string): void {
    this.log(text, LogLevel.DEBUG);
  }

  /**
   * Logs an info message.
   *
   * @param text - The message to log.
   */
  info(text: string): void {
    this.log(text, LogLevel.INFO);
  }

  /**
   * Logs a success message.
   *
   * @param text - The message to log.
   */
  success(text: string): void {
    this.log(text, LogLevel.SUCCESS);
  }

  /**
   * Logs a warning message.
   *
   * @param text - The message to log.
   */
  warn(text: string): void {
    this.log(text, LogLevel.WARN);
  }

  /**
   * Logs an error message.
   *
   * @param text - The message to log.
   */
  error(text: string): void {
    this.log(text, LogLevel.ERROR);
  }

  /**
   * Logs a message with a log level.
   *
   * @param text - The message to log.
   * @param level - The log level. Defaults to LogLevel.INFO.
   */
  private log(text: string, level: LogLevel = LogLevel.INFO): void {
    if (level < CURRENT_LOG_LEVEL) {
      return;
    }
    process.stderr.write(`${formatLogMessage(text, level)}\n`);
  }
}

/**
 * Default logger instance.
 */
export const logger = new Logger();
