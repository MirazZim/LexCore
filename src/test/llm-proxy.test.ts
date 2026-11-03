import { describe, it, expect } from "vitest";
import { TASKS, validateParams, assemblePrompt, pickNewWord } from "../../supabase/functions/llm-proxy/tasks.ts";
import { emptyRows, renderLearner, knownWordSet, type LearnerRows } from "../../supabase/functions/llm-proxy/learner.ts";
import { extractNote, buildCompactionPrompt, parseSummary } from "../../supabase/functions/llm-proxy/memory.ts";

const sampleParams: Record<string, Record<string, unknown>> = {
  suggest_word: { hint: "", style: "daily", exclude: ["errand"] },
  score_sentence: { word: "errand", definition: "a short trip", sentence: "I ran an errand.", roast: false },
  example_sentence: { word: "errand", definition: "a short trip", style: "casual" },
  collocations: { word: "errand", definition: "a short trip", style: "daily", exclude: [] },
  synonyms: { word: "errand", definition: "a short trip", style: "formal" },
  pos_tips: { pos: null, cefr: "B2" },
  cloze_dialogue: { word: "errand", definition: "a short trip" },
  memory_trick: { word: "errand", definition: "a short trip" },
  definition: { word: "errand", style: "ielts" },
  word_bundle: { word: "errand", style: "daily" },
  score_writing: { prompt: "Some say X. Discuss.", question_type: "opinion", user_text: "Government must invest in parks." },
  writing_tip: { prompt: "Some say X. Discuss.", question_type: "opinion", domain: "society" },
};

const rows = (over: Partial<LearnerRows> = {}): LearnerRows => ({ ...emptyRows(), ...over });

describe("llm-proxy tasks", () => {
  it("every task builds a prompt from valid params", () => {
    for (const [name, def] of Object.entries(TASKS)) {
      const checked = validateParams(def, sampleParams[name]);
      expect("params" in checked, `${name}: ${"error" in checked ? checked.error : ""}`).toBe(true);
      if (!("params" in checked)) continue;
      const prompt = assemblePrompt(def, checked.params, "", "seed01");
      expect(prompt.system.length).toBeGreaterThan(50);
      expect(prompt.user).not.toContain("<learner>");
    }
  });

  it("rejects unknown shapes and oversized input", () => {
    const def = TASKS.score_sentence;
    expect(validateParams(def, null)).toEqual({ error: "params must be an object" });
    expect(validateParams(def, { definition: "x", sentence: "y" })).toEqual({ error: "params.word is required" });
    expect("error" in validateParams(def, { word: "a".repeat(61), definition: "x", sentence: "y" })).toBe(true);
    expect("error" in validateParams(TASKS.definition, { word: "x", style: "pirate" })).toBe(true);
    expect("error" in validateParams(def, { word: "x", definition: "y", sentence: "z", roast: "yes" })).toBe(true);
  });

  it("trims over-long lists instead of failing", () => {
    const checked = validateParams(TASKS.suggest_word, { style: "daily", exclude: Array.from({ length: 80 }, (_, i) => `w${i}`) });
    expect("params" in checked && (checked.params.exclude as string[]).length).toBe(50);
  });

  it("puts the learner block first in the user turn and explains it in the system turn", () => {
    const def = TASKS.score_sentence;
    const checked = validateParams(def, sampleParams.score_sentence);
    if (!("params" in checked)) throw new Error("bad params");
    const prompt = assemblePrompt(def, checked.params, "Recurring writing issues: missing_article ×3.", "s");
    expect(prompt.user.startsWith("<learner>\nRecurring writing issues")).toBe(true);
    expect(prompt.system).toContain("LEARNER CONTEXT");
    expect(prompt.system).toContain("learner_note");
  });

  it("scoring tasks ask for a learner note; generators do not", () => {
    expect(TASKS.score_sentence.note).toBe("sentence");
    expect(TASKS.score_writing.note).toBe("writing");
    expect(TASKS.word_bundle.note).toBeUndefined();
  });
});

describe("pickNewWord", () => {
  it("skips words already in the library or shown this session", () => {
    const content = JSON.stringify({ words: ["Errand", "candid", "lucid"] });
    expect(pickNewWord(content, new Set(["errand"]), ["Candid"])).toBe("lucid");
  });

  it("falls back to the first candidate when every one is known", () => {
    expect(pickNewWord(JSON.stringify({ words: ["errand"] }), new Set(["errand"]), [])).toBe("errand");
  });

  it("accepts a single-word reply and rejects garbage", () => {
    expect(pickNewWord(JSON.stringify({ word: "lucid" }), new Set(), [])).toBe("lucid");
    expect(pickNewWord("not json", new Set(), [])).toBeNull();
  });
});

describe("renderLearner", () => {
  const words = [
    { id: "1", word: "errand", register: "casual", memory_technique: "micro_story" },
    { id: "2", word: "mitigate", register: "formal", memory_technique: "micro_story" },
    { id: "3", word: "candid", register: "formal", memory_technique: "micro_story" },
    { id: "4", word: "lucid", register: "formal", memory_technique: "phonetic_split" },
    { id: "5", word: "arid", register: "formal", memory_technique: "phonetic_split" },
    { id: "6", word: "frugal", register: "formal", memory_technique: "phonetic_split" },
  ];
  const stats = [
    { word_id: "1", lapses: 0 }, { word_id: "2", lapses: 4 }, { word_id: "3", lapses: 0 },
    { word_id: "4", lapses: 3 }, { word_id: "5", lapses: 2 }, { word_id: "6", lapses: 1 },
  ];

  it("returns nothing when there is no data", () => {
    expect(renderLearner(rows(), ["writing", "notes", "confusions", "techniques"])).toBe("");
  });

  it("summarises level, struggling words and technique retention", () => {
    const out = renderLearner(rows({ words, stats }), ["level", "struggling", "techniques"]);
    expect(out).toContain("Library: 6 words (formal 83%, casual 17%)");
    expect(out).toContain("Keeps forgetting: mitigate (4×), lucid (3×), arid (2×)");
    expect(out).toContain("stick best: micro_story");
    expect(out).toContain("weakest: phonetic_split");
  });

  it("counts recurring writing issues and orders bands oldest first", () => {
    const writing = [
      { flagged_issues: ["missing_article", "sv_agreement"], band_overall: 6.5 },
      { flagged_issues: ["missing_article"], band_overall: 6 },
      { flagged_issues: ["missing_article", "other"], band_overall: 5.5 },
    ];
    const out = renderLearner(rows({ writing }), ["writing"]);
    expect(out).toContain("bands (oldest → newest): 5.5, 6, 6.5");
    expect(out).toContain("missing_article ×3, sv_agreement ×1");
    expect(out).not.toContain("other");
  });

  it("describes confusions using the learner's words", () => {
    const out = renderLearner(rows({
      words,
      collocationMisses: [{ wrong_pick: "do an errand", word_id: "1" }],
      clozeMisses: [{ user_answer: "clear", word_id: "4" }],
    }), ["confusions"]);
    expect(out).toContain('picked "do an errand" as a pairing for "errand"');
    expect(out).toContain('wrote "clear" where "lucid" belonged');
  });

  it("samples known words without the target word", () => {
    const out = renderLearner(rows({ words }), ["known_words"], { word: "errand", random: () => 0 });
    expect(out.startsWith("Already knows:")).toBe(true);
    expect(out).not.toContain("errand");
  });

  it("includes the coach summary, recent notes and notes on the target word", () => {
    const out = renderLearner(rows({
      profile: "- Drops articles before institutions",
      notes: [{ note: "Uses 'for that' as a connector", word: null }],
      wordNotes: [{ note: "Used errand as a verb" }],
    }), ["notes", "word_notes"], { word: "errand" });
    expect(out).toContain("Coach's summary of this learner:\n- Drops articles");
    expect(out).toContain("- Uses 'for that' as a connector");
    expect(out).toContain('Earlier notes on "errand": Used errand as a verb');
  });

  it("builds the known-word set case-insensitively", () => {
    expect(knownWordSet(rows({ words: [{ id: "1", word: " Errand ", register: null, memory_technique: null }] })).has("errand")).toBe(true);
  });
});

describe("learner memory", () => {
  it("extracts a real note and ignores empty ones", () => {
    expect(extractNote(JSON.stringify({ score: 6, learner_note: "Drops 'the' before 'government'" }))).toBe("Drops 'the' before 'government'");
    expect(extractNote(JSON.stringify({ learner_note: null }))).toBeNull();
    expect(extractNote(JSON.stringify({ learner_note: "null" }))).toBeNull();
    expect(extractNote("not json")).toBeNull();
    expect(extractNote(JSON.stringify({ learner_note: "x".repeat(500) }))!.length).toBe(200);
  });

  it("feeds the current profile and new notes into compaction", () => {
    const p = buildCompactionPrompt("- Drops articles", ["Misuses 'where'", "Drops 'the' again"]);
    expect(p.user).toContain("- Drops articles");
    expect(p.user).toContain("- Misuses 'where'\n- Drops 'the' again");
    expect(buildCompactionPrompt(null, ["x"]).user).toContain("(empty — first profile)");
  });

  it("parses the merged summary", () => {
    expect(parseSummary(JSON.stringify({ summary: "- a\n- b" }))).toBe("- a\n- b");
    expect(parseSummary(JSON.stringify({ summary: "" }))).toBeNull();
  });
});
