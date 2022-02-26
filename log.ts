import * as log from "https://deno.land/std@0.127.0/log/mod.ts";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("NOTSET"),
    file: new log.handlers.RotatingFileHandler("DEBUG", {
      filename: "log.txt",
      maxBackupCount: 5,
      maxBytes: 1048576,
      formatter({ levelName, datetime, msg, loggerName }) {
        return `[${levelName}] ${datetime.toISOString()} (${loggerName}) ${msg}`;
      },
    }),
  },
  loggers: {
    default: {
      level: "NOTSET",
      handlers: ["console", "file"],
    },
    bot: {
      level: "DEBUG",
      handlers: ["console", "file"],
    },
    poll: {
      level: "DEBUG",
      handlers: ["console", "file"],
    },
  },
});

export default log.getLogger;
