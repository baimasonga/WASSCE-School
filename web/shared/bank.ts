// The built-in mathematics bank (same questions and IDs as the Android app).
import core from "./core.json";
import type { Pack, Question } from "./questions";

export const CORE_PACK_ID = "wassce-mathematics-core";
export const coreQuestions: Question[] = (core.questions as Question[]).map(q => ({
  ...q, pack_id: "builtin", subject_id: "mathematics", countries: ["SL", "LR", "GM"], exam_year: null, exam_series: "both",
}));
export const corePack: Pack = {
  format_version: 2, pack_id: CORE_PACK_ID, title: "WASSCE Mathematics · Core", version: "1.1.0",
  subject_id: "mathematics", countries: ["SL", "LR", "GM"], exam_year: null, exam_series: "both",
  questions: core.questions as Question[],
};
