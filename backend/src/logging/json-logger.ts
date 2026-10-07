import type { LoggerService } from '@nestjs/common';

import { requestContext } from '../http/index.js';

import { buildLogEntry, serializeLogEntry, type LogLevel } from './log-entry.pure.js';

const STDERR_LEVELS: ReadonlyArray<LogLevel> = ['fatal', 'error'];

export class JsonLogger implements LoggerService {
  log(message: unknown, ...params: unknown[]): void {
    this.write('info', message, params);
  }

  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.write('verbose', message, params);
  }

  fatal(message: unknown, ...params: unknown[]): void {
    this.write('fatal', message, params);
  }

  private write(level: LogLevel, message: unknown, params: ReadonlyArray<unknown>): void {
    const entry = buildLogEntry({
      level,
      message,
      params,
      time: new Date(),
      requestId: requestContext.getStore()?.requestId,
    });
    const stream = STDERR_LEVELS.includes(level) ? process.stderr : process.stdout;
    stream.write(`${serializeLogEntry(entry)}\n`);
  }
}
