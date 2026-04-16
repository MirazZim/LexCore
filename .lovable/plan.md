

# LexCore — Updated Plan with Corrections

## Corrections Applied

1. **SM-2 Algorithm** (`/lib/sm2.ts`) — exact logic as specified, pure function with quality 0–5 input, easeFactor min 1.3, interval reset on quality < 3.

2. **Generation Lab** — user sentences saved to `word_contexts` table with `source_label = "My sentence"`.

3. **Review Session** — 4 sequential phases: Battle Mode → Context Theater → Generation Lab → Session Summary (full page, not modal).

4. **Native Pulse seed data** — exact words specified for Informal (8 words) and Formal (10 words) sections.

## Implementation Order

### Phase 1: Foundation
- Dark theme design system (colors, cards, typography in Tailwind config)
- SM-2 utility function in `/lib/sm2.ts`
- Supabase schema: all 6 tables with RLS policies
- Auth page (`/auth`)
- Bottom nav component, layout wrapper

### Phase 2: Core Data Pages
- Add Word page (`/add`)
- Word Library page (`/library`) with search, filters, slide-over detail panel
- Dashboard (`/`) with stats, streak, recent words, CTAs

### Phase 3: Review Engine
- Review session page (`/review`) with 4 phases:
  - Phase 1: Battle Mode — show word, reveal definition, rate quality (Again/Hard/Good/Easy), SM-2 update
  - Phase 2: Context Theater — cloze deletion, typed input, correct/incorrect feedback
  - Phase 3: Generation Lab — write sentence, save to `word_contexts` (source_label: "My sentence")
  - Phase 4: Session Summary — full page with stats, Recharts bar chart, streak
- Sleep prep mode (`?mode=sleep_prep`) — passive, dark, no scoring

### Phase 4: Analytics & Discovery
- Progress page (`/progress`) — streak calendar, line/pie/bar charts, hardest words
- Native Pulse page (`/native-pulse`) — 3 sections with exact seed words, "+ Add to my bank" buttons

### Phase 5: Seed Data & Polish
- Insert 8 demo words with contexts, collocations, stats
- Loading skeletons, empty states, Framer Motion animations
- Mobile-responsive bottom nav

## Key Technical Details

### SM-2 Function (exact)
```text
calculateNextReview(easeFactor, interval, repetitions, quality):
  if quality < 3 → rep=0, interval=1
  if quality >= 3:
    rep 0 → interval=1
    rep 1 → interval=6
    rep 2+ → interval=round(interval * easeFactor)
    ef = ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
    ef = max(ef, 1.3)
  return { newEaseFactor, newInterval, newRepetitions, nextReviewAt }
```

### Generation Lab Save
```text
INSERT INTO word_contexts (word_id, sentence, source_label)
VALUES (wordId, userSentence, 'My sentence')
```

### Native Pulse Seed
- Informal: lowkey, slay, situationship, rent-free, understood the assignment, spill the tea, no cap, main character
- Formal: meticulous, pragmatic, equanimity, sanguine, pernicious, obfuscate, ruminate, ephemeral, eloquent, tenacious
- Collocations: 10 common pairs (make an effort, reach a conclusion, etc.)

