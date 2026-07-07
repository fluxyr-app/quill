import { randomUUID } from "crypto";

/**
 * In-memory stores, one per model class (keyed by class name). Kept simple and
 * dependency-free so the app runs with zero external services.
 */
const STORES = new Map<string, Map<string, BaseModel>>();

function storeFor(cls: Function): Map<string, BaseModel> {
  let s = STORES.get(cls.name);
  if (!s) {
    s = new Map();
    STORES.set(cls.name, s);
  }
  return s;
}

/** Reset every in-memory store (used by tests between cases). */
export function resetStores(): void {
  STORES.clear();
}

/**
 * Base class for resources: a UUID `id`, `createdAt`/`updatedAt` timestamps, and
 * simple persistence helpers backed by the in-memory store. Extend it; do not
 * reimplement these. Ids are stored as full UUID strings; the short-ID layer
 * shortens them at the serialization boundary.
 */
export abstract class BaseModel {
  id: string = randomUUID();
  createdAt: string = new Date().toISOString();
  updatedAt: string = new Date().toISOString();

  /** Persist this instance. */
  save(): this {
    this.updatedAt = new Date().toISOString();
    storeFor(this.constructor).set(this.id, this);
    return this;
  }

  /** Remove this instance. */
  remove(): void {
    storeFor(this.constructor).delete(this.id);
  }

  static findById<T extends BaseModel>(
    this: new (...args: any[]) => T,
    id: string
  ): T | undefined {
    return storeFor(this).get(id) as T | undefined;
  }

  static all<T extends BaseModel>(this: new (...args: any[]) => T): T[] {
    return [...storeFor(this).values()] as T[];
  }
}
