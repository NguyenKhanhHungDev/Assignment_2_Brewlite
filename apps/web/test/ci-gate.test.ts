import { expect, it } from "vitest";

it("CI proof: an intentionally failing test must block the quality gate", () => {
  expect(1).toBe(2);
});
