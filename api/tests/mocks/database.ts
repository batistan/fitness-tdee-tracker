import type { Database } from "@src/db/client.ts";

export interface MockDbOptions {
  returnValue?: unknown[];
  shouldFail?: boolean;
  error?: Error;
  onInsert?: (values: unknown) => void;
  onUpdate?: (values: unknown) => void;
  onDelete?: () => void;
  onExecute?: (query: unknown) => void;
}

export function createMockDb(options: MockDbOptions = {}): Database {
  const {
    returnValue = [],
    shouldFail = false,
    error = new Error("Database error"),
  } = options;

  const getResult = () => {
    if (shouldFail) throw error;
    return returnValue;
  };

  return {
    execute: async (query: unknown) => {
      options.onExecute?.(query);
      return getResult();
    },

    insert: () => ({
      values: (data: unknown) => {
        options.onInsert?.(data);
        return {
          returning: async () => getResult(),
        };
      },
    }),

    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: async () => getResult(),
              then: (resolve: (v: unknown[]) => void) => resolve(getResult()),
            }),
            then: (resolve: (v: unknown[]) => void) => resolve(getResult()),
          }),
          then: (resolve: (v: unknown[]) => void) => resolve(getResult()),
        }),
        orderBy: () => ({
          limit: () => ({
            offset: async () => getResult(),
            then: (resolve: (v: unknown[]) => void) => resolve(getResult()),
          }),
          then: (resolve: (v: unknown[]) => void) => resolve(getResult()),
        }),
        then: (resolve: (v: unknown[]) => void) => resolve(getResult()),
      }),
    }),

    update: () => ({
      set: (data: unknown) => {
        options.onUpdate?.(data);
        return {
          where: () => ({
            returning: async () => getResult(),
          }),
        };
      },
    }),

    delete: () => ({
      where: () => {
        options.onDelete?.();
        return {
          returning: async () => getResult(),
        };
      },
    }),
  } as unknown as Database;
}
