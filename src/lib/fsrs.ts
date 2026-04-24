import {
    fsrs,
    generatorParameters,
    Rating,
    State,
    createEmptyCard,
    type Card,
    type Grade,
} from 'ts-fsrs';

export function createScheduler(params: { request_retention: number; maximum_interval: number }) {
    return fsrs(generatorParameters({ ...params, enable_fuzz: true }));
}

const f = createScheduler({ request_retention: 0.90, maximum_interval: 365 });

// DB row shape (subset of WordStats — the FSRS-relevant fields)
export interface FsrsDbState {
    stability: number;
    difficulty: number;
    state: number;
    elapsed_days: number;
    scheduled_days: number;
    repetitions: number;
    lapses: number;
    last_reviewed_at: string | null;
    next_review_at: string;
}

// Convert DB row -> ts-fsrs Card
export function dbStateToCard(db: FsrsDbState): Card {
    // Brand-new card: use ts-fsrs empty card (avoids stability=0 edge cases)
    if (db.state === State.New) {
        return createEmptyCard(new Date(db.next_review_at));
    }
    return {
        due: new Date(db.next_review_at),
        stability: db.stability,
        difficulty: db.difficulty,
        elapsed_days: db.elapsed_days,
        scheduled_days: db.scheduled_days,
        reps: db.repetitions,
        lapses: db.lapses,
        state: db.state as State,
        last_review: db.last_reviewed_at ? new Date(db.last_reviewed_at) : undefined,
    };
}

// Current recall probability (0..1). Useful for UI displays.
export function currentRetrievability(card: Card, now: Date = new Date()): number {
    // ts-fsrs returns 0..1 when format flag is false/omitted
    return f.get_retrievability(card, now, false) as unknown as number;
}

// Run the scheduler. Pass a custom scheduler (from createScheduler) to use per-user params.
export function schedule(
    cardBefore: Card,
    rating: Rating,
    now: Date = new Date(),
    scheduler = f,
) {
    const result = scheduler.next(cardBefore, now, rating as Grade);
    return { card: result.card, log: result.log };
}

export { Rating, State };
export type { Card };