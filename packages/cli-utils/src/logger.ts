import { styleText } from "node:util";

export const LOG_LEVEL_SILENT = 5;
export const LOG_LEVEL_ERROR = 4;
export const LOG_LEVEL_WARN = 3;
export const LOG_LEVEL_SUCCESS = 2;
export const LOG_LEVEL_INFO = 1;
export const LOG_LEVEL_DEBUG = 0;

export type LogLevel =
  | typeof LOG_LEVEL_SILENT
  | typeof LOG_LEVEL_ERROR
  | typeof LOG_LEVEL_WARN
  | typeof LOG_LEVEL_SUCCESS
  | typeof LOG_LEVEL_INFO
  | typeof LOG_LEVEL_DEBUG;

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

const formatLogMessage = (opts: { level: LogLevel; text: string }): string => {
  const { level, text } = opts;
  switch (level) {
    case LOG_LEVEL_ERROR:
      return formatBold(colorError(`❌ ${text}`));
    case LOG_LEVEL_WARN:
      return formatBold(colorWarning(`⚠️ ${text}`));
    case LOG_LEVEL_SUCCESS:
      return formatBold(colorSuccess(`✅ ${text}`));
    case LOG_LEVEL_INFO:
      return colorInfo(text);
    case LOG_LEVEL_DEBUG:
      return colorDebug(text);
    default:
      return text;
  }
};

const writeLog = (opts: { text: string; level?: LogLevel }): void => {
  const level = opts.level ?? LOG_LEVEL_INFO;
  if (level < CurrentLogLevel) {
    return;
  }
  process.stderr.write(`${formatLogMessage({ level, text: opts.text })}\n`);
};

const DEFAULT_LOG_LEVEL = LOG_LEVEL_INFO;
let CurrentLogLevel: LogLevel = DEFAULT_LOG_LEVEL;
if (
  process.env["NODE_ENV"] === "development" ||
  process.env["DEBUG"] === "true"
) {
  CurrentLogLevel = LOG_LEVEL_DEBUG;
} else if (process.env["SILENT"] === "true") {
  CurrentLogLevel = LOG_LEVEL_SILENT;
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
    writeLog({ level: LOG_LEVEL_DEBUG, text });
  },
  /**
   * Logs an error message.
   *
   * @param text - The message to log.
   */
  error(text: string): void {
    writeLog({ level: LOG_LEVEL_ERROR, text });
  },

  /**
   * Logs an info message.
   *
   * @param text - The message to log.
   */
  info(text: string): void {
    writeLog({ level: LOG_LEVEL_INFO, text });
  },

  /**
   * Logs a success message.
   *
   * @param text - The message to log.
   */
  success(text: string): void {
    writeLog({ level: LOG_LEVEL_SUCCESS, text });
  },

  /**
   * Logs a warning message.
   *
   * @param text - The message to log.
   */
  warn(text: string): void {
    writeLog({ level: LOG_LEVEL_WARN, text });
  },
};
