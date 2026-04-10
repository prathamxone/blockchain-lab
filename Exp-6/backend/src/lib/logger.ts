type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  requestId?: string;
  [key: string]: unknown;
}

function serialize(level: LogLevel, message: string, meta: LogMeta = {}): string {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  return JSON.stringify(payload);
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(serialize("debug", message, meta));
    }
  },
  info(message: string, meta?: LogMeta): void {
    console.info(serialize("info", message, meta));
  },
  warn(message: string, meta?: LogMeta): void {
    console.warn(serialize("warn", message, meta));
  },
  error(message: string, meta?: LogMeta): void {
    console.error(serialize("error", message, meta));
  }
};
