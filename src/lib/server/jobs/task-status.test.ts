import { describe, expect, it } from "vitest";

import { batchStatus } from "./task-status";

describe("batchStatus", () => {
  it("keeps a partial batch active until all its tracks settle", () => {
    expect(batchStatus({ running: 1, queued: 5, failed: 2, done: 10 })).toBe("running");
    expect(batchStatus({ running: 0, queued: 5, failed: 2, done: 11 })).toBe("queued");
  });

  it("marks finished partial failure and success", () => {
    expect(batchStatus({ running: 0, queued: 0, failed: 2, done: 18 })).toBe("failed");
    expect(batchStatus({ running: 0, queued: 0, failed: 0, done: 20 })).toBe("done");
  });
});
