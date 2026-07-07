import { createApp } from "../src/app";
import { resetStores } from "../src/models/base";

/** Build a fresh app with empty in-memory stores. Call at the start of each test. */
export function freshApp() {
  resetStores();
  return createApp();
}
