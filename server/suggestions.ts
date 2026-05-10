export type Suggestion = { category: string; message: string };

function num(input: Record<string, unknown>, key: string): number | null {
  const v = input[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Generic tips using whatever feature keys exist (from dataset-driven form). */
export function buildSuggestions(
  level: "Low" | "Medium" | "High",
  input: Record<string, unknown>,
): Suggestion[] {
  const out: Suggestion[] = [];

  // Level-specific base recommendations
  if (level === "Low") {
    out.push({
      category: "Maintenance",
      message: "Maintain current routine and balanced lifestyle.",
    });
    out.push({
      category: "Sleep",
      message: "Keep consistent sleep schedule for optimal performance.",
    });
    out.push({
      category: "Health",
      message: "Continue healthy habits and regular exercise.",
    });
    out.push({
      category: "Study",
      message: "Stay consistent with current study plan.",
    });
    out.push({
      category: "Monitoring",
      message: "Monitor stress levels and take breaks when needed.",
    });
  } else if (level === "Medium") {
    out.push({
      category: "Sleep",
      message: "Improve sleep quality - aim for 7-9 hours nightly.",
    });
    out.push({
      category: "Screen Time",
      message: "Reduce screen time, especially before bed.",
    });
    out.push({
      category: "Breaks",
      message: "Take regular breaks using Pomodoro technique.",
    });
    out.push({
      category: "Relaxation",
      message: "Practice relaxation techniques like deep breathing.",
    });
    out.push({
      category: "Workload",
      message: "Manage study workload - prioritize important tasks.",
    });
  } else if (level === "High") {
    out.push({
      category: "Rest",
      message: "Prioritize rest and recovery immediately.",
    });
    out.push({
      category: "Academic Pressure",
      message: "Reduce academic pressure temporarily.",
    });
    out.push({
      category: "Support",
      message: "Seek support from friends, family, or mentors.",
    });
    out.push({
      category: "Digital Detox",
      message: "Limit social media and overall screen time.",
    });
    out.push({
      category: "Mental Wellness",
      message: "Practice mental wellness activities daily.",
    });
  }

  // Add specific input-based suggestions
  const sleep = num(input, "sleep_hours");
  if (sleep !== null && sleep < 7) {
    out.push({
      category: "Sleep",
      message:
        "Prioritize 7–9 hours when possible; sleep debt amplifies stress and hurts focus.",
    });
  }
  const mh = num(input, "mental_health_score");
  if (mh !== null && mh <= 5) {
    out.push({
      category: "Mental health",
      message:
        "Short breaks, peer support, or professional help can reduce overwhelm.",
    });
  }
  const study = num(input, "study_hours");
  const selfStudy = num(input, "self_study_hours");
  const online = num(input, "online_classes_hours");
  if (
    study !== null &&
    selfStudy !== null &&
    online !== null &&
    study + selfStudy + online >= 9
  ) {
    out.push({
      category: "Study load",
      message:
        "Long study blocks need recovery — try Pomodoro and one clear day off weekly.",
    });
  }
  const screen = num(input, "screen_time_hours");
  if (screen !== null && screen >= 10) {
    out.push({
      category: "Screen time",
      message:
        "Reduce late-night screens; swap 20 minutes for a walk or stretch.",
    });
  }

  return out.slice(0, 8);
}
