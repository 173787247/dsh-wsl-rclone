import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertRemote } from "../lib/rclone.js";
describe("rclone", () => {
  it("ok", () => assert.equal(assertRemote("s3"), "s3"));
  it("bad", () => assert.throws(() => assertRemote("a;b"), /invalid/));
});
