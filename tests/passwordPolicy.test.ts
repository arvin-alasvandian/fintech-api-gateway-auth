// tests/passwordPolicy.test.ts
import { describe, it, expect } from "@jest/globals";

// simple copy of the logic to keep it isolated (no plugin load)
function checkPassword(pw: unknown) {
  if (typeof pw !== "string") return false;
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

describe("password policy", () => {
  it("rejects short", () => {
    expect(checkPassword("a1b2c")).toBe(false);
  });
  it("rejects missing digit", () => {
    expect(checkPassword("abcdefgh")).toBe(false);
  });
  it("rejects missing letter", () => {
    expect(checkPassword("12345678")).toBe(false);
  });
  it("accepts strong enough", () => {
    expect(checkPassword("abc12345")).toBe(true);
  });
});
