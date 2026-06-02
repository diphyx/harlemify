// Logger

export interface Logger {
    info(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

// Base Definition

export interface BaseDefinition {
    key: string;
    logger?: Logger;
}
