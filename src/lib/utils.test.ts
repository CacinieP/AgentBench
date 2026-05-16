import { describe, it, expect } from "vitest";
import { formatRelativeTime, scoreColor, scoreBg, passRateColor } from "./utils";

describe("formatRelativeTime", () => {
  it('returns "刚刚" for recent timestamps', () => {
    const recent = new Date(Date.now() - 30000).toISOString();
    expect(formatRelativeTime(recent)).toBe("刚刚");
  });

  it("returns minutes ago for timestamps within an hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5分钟前");
  });

  it("returns hours ago for timestamps within a day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe("3小时前");
  });

  it("returns days ago for timestamps within a week", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe("2天前");
  });

  it("returns locale date for old timestamps", () => {
    const old = new Date("2020-01-15").toISOString();
    const result = formatRelativeTime(old);
    // toLocaleDateString varies by platform; just verify it's not a relative string
    expect(result).not.toBe("刚刚");
    expect(result).not.toMatch(/^\d+(分钟前|小时前|天前)$/);
  });
});

describe("scoreColor", () => {
  it("returns green for high scores", () => {
    expect(scoreColor(1.0)).toBe("var(--green)");
    expect(scoreColor(0.85)).toBe("var(--green)");
    expect(scoreColor(0.8)).toBe("var(--green)");
  });

  it("returns yellow for medium scores", () => {
    expect(scoreColor(0.79)).toBe("var(--yellow)");
    expect(scoreColor(0.6)).toBe("var(--yellow)");
    expect(scoreColor(0.5)).toBe("var(--yellow)");
  });

  it("returns red for low scores", () => {
    expect(scoreColor(0.49)).toBe("var(--red)");
    expect(scoreColor(0.0)).toBe("var(--red)");
  });
});

describe("scoreBg", () => {
  it("returns green-bg for high scores", () => {
    expect(scoreBg(1.0)).toBe("var(--green-bg)");
    expect(scoreBg(0.8)).toBe("var(--green-bg)");
  });

  it("returns yellow-bg for medium scores", () => {
    expect(scoreBg(0.6)).toBe("var(--yellow-bg)");
  });

  it("returns red-bg for low scores", () => {
    expect(scoreBg(0.3)).toBe("var(--red-bg)");
  });
});

describe("passRateColor", () => {
  it("returns green for 80%+", () => {
    expect(passRateColor(100)).toBe("var(--green)");
    expect(passRateColor(80)).toBe("var(--green)");
  });

  it("returns yellow for 50-79%", () => {
    expect(passRateColor(60)).toBe("var(--yellow)");
    expect(passRateColor(50)).toBe("var(--yellow)");
  });

  it("returns red for below 50%", () => {
    expect(passRateColor(30)).toBe("var(--red)");
    expect(passRateColor(0)).toBe("var(--red)");
  });
});
