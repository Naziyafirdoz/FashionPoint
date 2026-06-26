const isDev = process.env.NODE_ENV === "development";

export function devLog(...args: unknown[]): void {
  if (isDev) console.log(...args);
}

export function devInfo(...args: unknown[]): void {
  if (isDev) console.info(...args);
}

export function devWarn(...args: unknown[]): void {
  if (isDev) console.warn(...args);
}

export function devTime(label: string): void {
  if (isDev) console.time(label);
}

export function devTimeEnd(label: string): void {
  if (isDev) console.timeEnd(label);
}

export function isDevEnvironment(): boolean {
  return isDev;
}
