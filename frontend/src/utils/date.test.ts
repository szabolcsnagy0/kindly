import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isPastDate } from "./date";

describe("isPastDate", () => {
  const mockNow = new Date("2025-01-15T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("with valid dates", () => {
    it("should return true for dates in the past", () => {
      const pastDate = new Date("2025-01-01T12:00:00Z");
      expect(isPastDate(pastDate)).toBe(true);
    });

    it("should return true for ISO string dates in the past", () => {
      expect(isPastDate("2025-01-01T12:00:00Z")).toBe(true);
    });

    it("should return false for dates in the future", () => {
      const futureDate = new Date("2025-12-31T12:00:00Z");
      expect(isPastDate(futureDate)).toBe(false);
    });

    it("should return false for ISO string dates in the future", () => {
      expect(isPastDate("2025-12-31T12:00:00Z")).toBe(false);
    });

    it("should return true for dates just before current time", () => {
      const justPast = new Date(mockNow - 1000); // 1 second ago
      expect(isPastDate(justPast)).toBe(true);
    });

    it("should return false for dates just after current time", () => {
      const justFuture = new Date(mockNow + 1000); // 1 second in future
      expect(isPastDate(justFuture)).toBe(false);
    });
  });

  describe("with invalid dates", () => {
    it("should return false for invalid date strings", () => {
      expect(isPastDate("invalid-date")).toBe(false);
    });

    it("should return false for empty strings", () => {
      expect(isPastDate("")).toBe(false);
    });

    it("should return false for malformed ISO strings", () => {
      expect(isPastDate("2025-13-45")).toBe(false);
    });

    it("should return false for Invalid Date objects", () => {
      const invalidDate = new Date("not a date");
      expect(isPastDate(invalidDate)).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle dates at exact current time", () => {
      const exactNow = new Date(mockNow);
      // Date at exact current time should be considered past (not future)
      expect(isPastDate(exactNow)).toBe(false);
    });

    it("should handle very old dates", () => {
      expect(isPastDate("1970-01-01T00:00:00Z")).toBe(true);
    });

    it("should handle far future dates", () => {
      expect(isPastDate("2099-12-31T23:59:59Z")).toBe(false);
    });
  });

  describe("different date formats", () => {
    it("should handle Date objects", () => {
      const date = new Date("2024-01-01");
      expect(isPastDate(date)).toBe(true);
    });

    it("should handle ISO 8601 strings", () => {
      expect(isPastDate("2024-01-01T00:00:00.000Z")).toBe(true);
    });

    it("should handle date-only strings", () => {
      expect(isPastDate("2024-01-01")).toBe(true);
    });

    it("should handle datetime strings without timezone", () => {
      expect(isPastDate("2024-01-01T12:00:00")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle epoch time (timestamp 0)", () => {
      expect(isPastDate(new Date(0))).toBe(true);
    });

    it("should handle negative timestamps", () => {
      expect(isPastDate(new Date(-1000))).toBe(true);
    });
  });
});
