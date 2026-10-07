import { inspect } from 'node:util';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface LogEntry {
  readonly time: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: string;
  readonly requestId?: string;
  readonly stack?: string;
}

export interface LogInput {
  readonly level: LogLevel;
  readonly message: unknown;
  readonly params: ReadonlyArray<unknown>;
  readonly time: Date;
  readonly requestId: string | undefined;
}

function messageText(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }
  return message instanceof Error ? message.message : inspect(message, { breakLength: Infinity });
}

function stringsOf(params: ReadonlyArray<unknown>): ReadonlyArray<string> {
  return params.filter((param): param is string => typeof param === 'string');
}

// Convention de Nest : `Logger` ajoute son contexte en dernier paramètre, et `error(message, stack)`
// place la stack juste avant. Un paramètre unique est donc le contexte.
export function buildLogEntry(input: LogInput): LogEntry {
  const strings = stringsOf(input.params);
  const context = strings.at(-1);
  const isError = input.level === 'error' || input.level === 'fatal';
  const stack = isError && strings.length >= 2 ? strings.at(-2) : undefined;
  const errorStack = input.message instanceof Error ? input.message.stack : undefined;
  const resolvedStack = stack ?? errorStack;

  return {
    time: input.time.toISOString(),
    level: input.level,
    message: messageText(input.message),
    ...(context === undefined ? {} : { context }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(resolvedStack === undefined ? {} : { stack: resolvedStack }),
  };
}

// Une ligne JSON par événement : exploitable par n'importe quel agrégateur de logs.
export function serializeLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}
