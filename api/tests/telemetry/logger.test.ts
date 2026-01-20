import { assertEquals, assertExists } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { initLogger, getLogger, type LogLevel } from "@src/telemetry/mod.ts";

describe("Logger", () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let logs: string[] = [];

  beforeEach(() => {
    logs = [];
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    console.log = (message: string) => logs.push(message);
    console.error = (message: string) => logs.push(message);
    console.warn = (message: string) => logs.push(message);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it("should initialize logger with default level", () => {
    const logger = initLogger();
    assertExists(logger);
  });

  it("should log info messages", () => {
    const logger = initLogger("info");
    logger.info("test message", { foo: "bar" });

    assertEquals(logs.length, 1);
    const logEntry = JSON.parse(logs[0]);
    assertEquals(logEntry.level, "info");
    assertEquals(logEntry.message, "test message");
    assertEquals(logEntry.context.foo, "bar");
    assertExists(logEntry.timestamp);
  });

  it("should log error messages", () => {
    const logger = initLogger("info");
    logger.error("error message", { code: 500 });

    assertEquals(logs.length, 1);
    const logEntry = JSON.parse(logs[0]);
    assertEquals(logEntry.level, "error");
    assertEquals(logEntry.message, "error message");
    assertEquals(logEntry.context.code, 500);
  });

  it("should respect log level filtering", () => {
    const logger = initLogger("warn");

    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");

    assertEquals(logs.length, 2); // Only warn and error should be logged
    assertEquals(JSON.parse(logs[0]).level, "warn");
    assertEquals(JSON.parse(logs[1]).level, "error");
  });

  it("should allow changing log level", () => {
    const logger = initLogger("error");
    logger.warn("this should not appear");
    assertEquals(logs.length, 0);

    logger.setMinLevel("warn");
    logger.warn("this should appear");
    assertEquals(logs.length, 1);
  });

  it("should work with getLogger after initialization", () => {
    initLogger("debug");
    const logger = getLogger();

    logger.debug("debug message");
    assertEquals(logs.length, 1);
    assertEquals(JSON.parse(logs[0]).level, "debug");
  });
});
