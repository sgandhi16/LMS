import { describe, it, expect } from "vitest";

describe("Progress Calculation Engine", () => {
  it("calculates sport percentage based on completed modules over total modules", () => {
    const totalModules = 13;
    const completedModules = 3;
    const percent = Math.round((completedModules / totalModules) * 100);

    expect(percent).toBe(23);
  });

  it("handles 0 total modules gracefully without NaN", () => {
    const totalModules = 0;
    const completedModules = 0;
    const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    expect(percent).toBe(0);
  });

  it("identifies sequential unlock rules", () => {
    // Module 1 is always unlocked
    const isUnlocked = (order: number, seqUnlock: boolean, prevCompleted: boolean) => {
      if (!seqUnlock) return true;
      if (order === 1) return true;
      return prevCompleted;
    };

    expect(isUnlocked(1, true, false)).toBe(true);
    expect(isUnlocked(2, true, false)).toBe(false);
    expect(isUnlocked(2, true, true)).toBe(true);
    expect(isUnlocked(5, false, false)).toBe(true);
  });

  it("validates 90% watch threshold rule", () => {
    const isWatched = (percent: number) => percent >= 0.9;

    expect(isWatched(0.89)).toBe(false);
    expect(isWatched(0.90)).toBe(true);
    expect(isWatched(0.95)).toBe(true);
    expect(isWatched(1.0)).toBe(true);
  });

  it("evaluates module completion based on configurable rules", () => {
    const evaluateCompletion = ({
      requireVideo,
      videoWatched,
      requireTest,
      testPassed,
    }: {
      requireVideo: boolean;
      videoWatched: boolean;
      requireTest: boolean;
      testPassed: boolean;
    }) => {
      const vOk = !requireVideo || videoWatched;
      const tOk = !requireTest || testPassed;
      return vOk && tOk;
    };

    // Both required: video watched but test not passed -> incomplete
    expect(
      evaluateCompletion({
        requireVideo: true,
        videoWatched: true,
        requireTest: true,
        testPassed: false,
      })
    ).toBe(false);

    // Both required: both done -> complete
    expect(
      evaluateCompletion({
        requireVideo: true,
        videoWatched: true,
        requireTest: true,
        testPassed: true,
      })
    ).toBe(true);

    // Video only required (no test required)
    expect(
      evaluateCompletion({
        requireVideo: true,
        videoWatched: true,
        requireTest: false,
        testPassed: false,
      })
    ).toBe(true);
  });
});
