import { test } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { freshApp } from "./setup";

test("health", async () => {
  const res = await request(freshApp()).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});
