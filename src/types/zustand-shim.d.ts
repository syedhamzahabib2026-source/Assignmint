// Type shim so TypeScript can resolve zustand v5 (ESM-only .d.mts)
// Minimal declarations matching what AuthStore.ts uses.
declare module 'zustand' {
  type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  type GetState<T> = () => T;
  type StateCreator<T> = (set: SetState<T>, get: GetState<T>) => T;

  export function create<T>(): (creator: StateCreator<T>) => () => T;
  export function create<T>(creator: StateCreator<T>): () => T;
}

declare module 'zustand/middleware' {
  export interface PersistOptions<T> {
    name: string;
    storage?: any;
    onRehydrateStorage?: (options: PersistOptions<T>) => ((state: T | undefined) => void) | void;
  }

  export function persist<T>(
    creator: (set: any, get: any) => T,
    options: PersistOptions<T>,
  ): (set: any, get: any) => T;

  export function createJSONStorage(getStorage: () => any): any;
}
