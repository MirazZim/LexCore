<div align="center">

# 🧠 LexCore

**Neuroscience-based vocabulary acquisition engine powered by FSRS spaced repetition and AI.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 🔍 What is LexCore?

LexCore is a vocabulary learning app built on the principle that the **brain doesn't memorize — it reconstructs**. Instead of passive flashcards, LexCore forces active recall through a **6-phase review session**, then uses the **FSRS v6 spaced repetition algorithm** to schedule each word at the precise moment before you'd forget it.

The competitive edge: an **AI-powered sentence scoring pipeline** that evaluates your own generated sentences — making your review data trustworthy and pushing you toward real production of the word.

---

## ✨ Features

- ⚔️ **Battle Phase** — 4-choice cloze test before definition reveal. Forces recall, not recognition.
- 📖 **Context Phase** — Read real example sentences, fill in the blank.
- 🔗 **Collocation Phase** — Review natural word pairings and usage patterns.
- ✍️ **Generation Phase** — Write your own sentence; AI scores it on the spot.
- 🔄 **Synonyms Phase** — Review semantically related words to build a richer mental web.
- 🤖 **AI Auto-Scoring** — OpenRouter-powered sentence evaluation. No self-rating bias.
- 🔁 **FSRS v6 Spaced Repetition** — State-machine scheduling (New → Learning → Review → Relearning) driven by actual memory stability, not fixed intervals.
- 🌙 **Sleep Prep Mode** — Evening review session (8 PM–3 AM) that leverages sleep consolidation.
- 📚 **Word Library** — Add words with definitions, collocations, synonyms, and emotion anchors. Claude auto-generates content.
- 📊 **Progress Dashboard** — Streak tracking, 7-day velocity chart, mastered word count, and due-today count.
- 🔐 **Auth & RLS** — Row-level security so your data stays yours.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18.3, TypeScript, Vite |
| Routing | React Router v6 |
| Data Fetching | TanStack Query |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| AI Scoring | OpenRouter (`stepfun/step-3.5-flash`) |
| Algorithm | FSRS v6 (`ts-fsrs`) — 95% target retention |
| Build | Vite, Bun |

---

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    subgraph "Client Application"
        subgraph "Presentation Layer"
            AuthPage[Auth Page]
            IndexPage[Index/Dashboard]
            AddWordPage[Add Word Page]
            LibraryPage[Library Page]
            ReviewPage[Review Page]
            ProgressPage[Progress Page]
            GrammarPage[Grammar Rules Page]
        end

        subgraph "Component Layer"
            AppLayout[App Layout]
            BottomNav[Bottom Navigation]
            BattlePhase[Battle Phase]
            ContextPhase[Context Phase]
            CollocationsPhase[Collocations Phase]
            GenerationPhase[Generation Phase]
            SynonymsPhase[Synonyms Phase]
            SummaryPhase[Summary Phase]
            UIComponents[shadcn/ui Components]
        end

        subgraph "State Management"
            AuthContext[Auth Context]
            QueryClient[React Query Client]
            CustomHooks[Custom Hooks<br/>useWords, useDueWords, etc.]
        end

        subgraph "Business Logic"
            FSRS[FSRS v6 Algorithm<br/>ts-fsrs]
            Utils[Utilities]
        end

        subgraph "Data Access"
            SupabaseClient[Supabase Client]
            Types[TypeScript Types]
        end
    end

    subgraph "Backend Services"
        Auth[Authentication Service]
        Database[(PostgreSQL Database)]
        RLS[Row Level Security]
    end

    subgraph "AI Layer"
        OpenRouter[OpenRouter API<br/>stepfun/step-3.5-flash]
    end

    ReviewPage --> BattlePhase
    ReviewPage --> ContextPhase
    ReviewPage --> CollocationsPhase
    ReviewPage --> GenerationPhase
    ReviewPage --> SynonymsPhase
    ReviewPage --> SummaryPhase

    BattlePhase --> FSRS
    GenerationPhase --> OpenRouter

    CustomHooks --> QueryClient
    CustomHooks --> SupabaseClient
    AuthContext --> SupabaseClient

    SupabaseClient --> Auth
    SupabaseClient --> Database
    Database --> RLS

    style FSRS fill:#fff4e1
    style OpenRouter fill:#ffe1f5
    style Database fill:#f0f0f0
    style AuthContext fill:#e1f5ff
```

---

### Review Session Flow

```mermaid
sequenceDiagram
    participant User
    participant ReviewPage
    participant useDueWords
    participant FSRSAlgorithm
    participant useUpdateWordStats
    participant Database

    ReviewPage->>useDueWords: Fetch due words (max 20)
    useDueWords->>Database: SELECT words WHERE next_review_at <= NOW()
    Database-->>useDueWords: Return due words
    useDueWords-->>ReviewPage: Display words

    loop For each word
        User->>ReviewPage: Battle → Context → Collocations → Generation → Synonyms
        ReviewPage->>FSRSAlgorithm: schedule(card, rating)
        FSRSAlgorithm->>FSRSAlgorithm: Compute stability, difficulty, next interval
        FSRSAlgorithm-->>ReviewPage: New card state
        ReviewPage->>useUpdateWordStats: Persist updated stats
        useUpdateWordStats->>Database: UPDATE word_stats
    end

    ReviewPage->>Database: INSERT INTO review_sessions
    ReviewPage-->>User: Summary phase (streak, accuracy, words reviewed)
```

---

### FSRS v6 State Machine

```mermaid
flowchart TD
    New([New Word Added]) --> FirstReview[First Review]
    FirstReview --> Learning[State: Learning]

    Learning --> RateAgain{Rating?}

    RateAgain -->|Again| Relearning[State: Relearning<br/>Stability reset]
    RateAgain -->|Hard / Good / Easy| StabilityCalc[Compute new stability<br/>& difficulty]

    StabilityCalc --> CheckState{Stability >= threshold?}

    CheckState -->|No| Learning
    CheckState -->|Yes| Review[State: Review<br/>Long-term scheduling]

    Review --> RateLater{Next review rating?}
    RateLater -->|Again - Lapse| Relearning
    RateLater -->|Hard / Good / Easy| StabilityUpdate[Update stability<br/>& difficulty]
    StabilityUpdate --> Review

    Relearning --> Recovery[Short-interval recovery steps]
    Recovery --> Review

    style New fill:#e1ffe1
    style Learning fill:#fff4e1
    style Review fill:#e1f5ff
    style Relearning fill:#ffe1e1
```

**Key FSRS parameters** (configured in `src/lib/fsrs.ts`):
- `request_retention: 0.95` — target 95% recall probability at review time
- `maximum_interval: 365` days — cap on scheduling gap
- `enable_fuzz: true` — jitter to prevent review clustering

---

### Database Schema

```mermaid
erDiagram
    users ||--o{ words : creates
    users ||--o{ word_stats : has
    users ||--o{ review_sessions : completes

    words ||--o{ word_stats : tracks
    words ||--o{ word_contexts : has
    words ||--o{ word_collocations : has
    words ||--o{ semantic_connections : has

    users {
        uuid id PK
        string email
        timestamp created_at
    }

    words {
        uuid id PK
        uuid user_id FK
        string word
        text definition
        text example_sentence
        string source
        string register
        int frequency_band
        timestamp created_at
    }

    word_stats {
        uuid id PK
        uuid user_id FK
        uuid word_id FK
        int state
        float stability
        float difficulty
        int repetitions
        timestamp next_review_at
        timestamp last_reviewed_at
        int times_correct
        int times_incorrect
    }

    word_contexts {
        uuid id PK
        uuid word_id FK
        text sentence
        string source_label
        timestamp created_at
    }

    word_collocations {
        uuid id PK
        uuid word_id FK
        string collocation
        timestamp created_at
    }

    semantic_connections {
        uuid id PK
        uuid word_id FK
        string connected_word
        string connection_type
    }

    review_sessions {
        uuid id PK
        uuid user_id FK
        timestamp started_at
        timestamp ended_at
        int words_reviewed
        int words_correct
        string session_type
    }
```

---

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant AuthPage
    participant AuthContext
    participant Supabase
    participant App

    User->>AuthPage: Enter credentials
    AuthPage->>AuthContext: signIn(email, password)
    AuthContext->>Supabase: auth.signInWithPassword()
    Supabase-->>AuthContext: Session + JWT Token
    AuthContext-->>App: Update user state
    App->>App: Redirect to protected routes
    App-->>User: Show dashboard
```

---

### Component Hierarchy

```mermaid
graph TD
    App[App.tsx] --> QueryProvider[QueryClientProvider]
    QueryProvider --> AuthProvider[AuthProvider]
    AuthProvider --> Router[BrowserRouter]
    Router --> Routes[Routes]

    Routes --> Public[Public: AuthPage]
    Routes --> Protected1[Protected: Dashboard]
    Routes --> Protected2[Protected: AddWordPage]
    Routes --> Protected3[Protected: LibraryPage]
    Routes --> Protected4[Protected: ReviewPage]
    Routes --> Protected5[Protected: ProgressPage]
    Routes --> Protected6[Protected: GrammarRulesPage]

    Protected4 --> BattlePhase[BattlePhase]
    Protected4 --> ContextPhase[ContextPhase]
    Protected4 --> CollocationsPhase[CollocationsPhase]
    Protected4 --> GenerationPhase[GenerationPhase]
    Protected4 --> SynonymsPhase[SynonymsPhase]
    Protected4 --> SummaryPhase[SummaryPhase]

    Protected1 --> AppLayout[AppLayout]
    Protected2 --> AppLayout
    Protected3 --> AppLayout
    Protected4 --> AppLayout
    Protected5 --> AppLayout
    Protected6 --> AppLayout

    AppLayout --> BottomNav[BottomNav]

    style App fill:#e1f5ff
    style AuthProvider fill:#ffe1e1
    style Protected4 fill:#fff4e1
    style AppLayout fill:#e1ffe1
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project
- An OpenRouter API key

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/lexcore.git
cd lexcore

# Install dependencies
bun install
# or
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

### Run Locally

```bash
bun dev
# or
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗺️ Roadmap

- [x] FSRS v6 spaced repetition engine (`ts-fsrs`)
- [x] Battle phase — 4-choice cloze quiz
- [x] Context phase — example sentence cloze
- [x] Collocation phase — natural word pairings
- [x] Generation phase — write your own sentence
- [x] Synonyms phase — semantic network review
- [x] AI sentence scoring via OpenRouter
- [x] Word library with collocations, synonyms, emotion anchors
- [x] Claude-powered auto-generation of definitions and examples
- [x] Review session tracking and streak system
- [x] Sleep Prep mode (evening consolidation sessions)
- [ ] User settings UI (retention target, new cards/day, max interval)
- [ ] Offline support (PWA)
- [ ] Export/import vocabulary sets
- [ ] Native mobile app (React Native)

---

## 📁 Project Structure

```
lexcore/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── review/        # BattlePhase, ContextPhase, CollocationsPhase, etc.
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks (useWords, useDueWords, etc.)
│   ├── lib/               # FSRS algorithm (ts-fsrs), Supabase client, utilities
│   ├── pages/             # Route-level page components
│   ├── context/           # AuthContext
│   └── types/             # TypeScript types
├── public/
├── .env.example
├── vite.config.ts
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'add: your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Built by [Miraz](https://github.com/your-username) · Powered by neuroscience, not repetition.

</div>
