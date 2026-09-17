/**
 * Minimal ambient types for Node's built-in `node:sqlite` module —
 * `@types/node@^20` (this repo's pinned major) predates it; the module was
 * added to Node itself in v22 and DefinitelyTyped's types track Node's own
 * major version, not just what's physically installed. Scoped to exactly
 * the API surface `lib/backend/sqlite/db.ts` calls, verified against the
 * real runtime (`node --version` → v22.23.1, matching
 * `.github/workflows/ci.yml`'s pinned Node 22) rather than guessed — not a
 * general-purpose definition for the whole module.
 */
declare module "node:sqlite" {
  export type SQLInputValue = string | number | bigint | Buffer | null;

  export interface StatementResultingChanges {
    lastInsertRowid: number | bigint;
    changes: number | bigint;
  }

  export class StatementSync {
    run(...params: SQLInputValue[]): StatementResultingChanges;
    get(...params: SQLInputValue[]): Record<string, unknown> | undefined;
    all(...params: SQLInputValue[]): Record<string, unknown>[];
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
