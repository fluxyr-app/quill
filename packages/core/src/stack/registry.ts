/**
 * Stack adapter registry. Core owns the registry; concrete stacks (e.g.
 * @fluxyr/quill-stack-flask) register themselves and the CLI wires them in. This keeps
 * the dependency arrow pointing stacks -> core, never the reverse.
 */
import { StackAdapter } from "../types";

const registry = new Map<string, StackAdapter>();

export function registerStack(adapter: StackAdapter): void {
  registry.set(adapter.name, adapter);
}

export function getStack(name: string): StackAdapter {
  const s = registry.get(name);
  if (!s) {
    const known = [...registry.keys()].join(", ") || "(none registered)";
    throw new Error(`Unknown stack '${name}'. Registered stacks: ${known}`);
  }
  return s;
}

export function listStacks(): string[] {
  return [...registry.keys()];
}
