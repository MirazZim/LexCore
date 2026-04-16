<div align="center">

# 🧠 LexCore

**Neuroscience-based vocabulary acquisition engine powered by spaced repetition and AI.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 🔍 What is LexCore?

LexCore is a vocabulary learning app built on the principle that the **brain doesn't memorize — it reconstructs**. Instead of passive flashcards, LexCore forces active recall through a **battle mode** quiz system, then uses the **SM-2 spaced repetition algorithm** to schedule each word at the precise moment before you'd forget it.

The competitive edge: an **AI-powered auto-scoring pipeline** that evaluates your responses on a 0–5 scale — eliminating self-rating bias and making your review data actually trustworthy.

---

## ✨ Features

- ⚔️ **Battle Mode** — 4-choice quiz before definition reveal. Forces recall, not recognition.
- 🤖 **AI Auto-Scoring** — OpenRouter-powered response evaluation. No self-rating.
- 🔁 **SM-2 Spaced Repetition** — Intervals calculated from your actual performance.
- 📚 **Word Library** — Add words with definitions, collocations, and example sentences.
- 📊 **Progress Dashboard** — Streak tracking, accuracy rates, and review history.
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
| Algorithm | SM-2 Spaced Repetition (FSRS migration planned) |
| Testing | Vitest, Playwright, Testing Library |
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
            GenerationPhase[Generation Phase]
            SummaryPhase[Summary Phase]
            UIComponents[shadcn/ui Components]
        end

        subgraph "State Management"
            AuthContext[Auth Context]
            QueryClient[React Query Client]
            CustomHooks[Custom Hooks<br/>useWords, useDueWords, etc.]
        end

        subgraph "Business Logic"
            SM2[SM-2 Algorithm]
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
    ReviewPage --> GenerationPhase
    ReviewPage --> SummaryPhase

    BattlePhase --> SM2
    ContextPhase --> SM2
    GenerationPhase --> OpenRouter

    CustomHooks --> QueryClient
    CustomHooks --> SupabaseClient
    AuthContext --> SupabaseClient

    SupabaseClient --> Auth
    SupabaseClient --> Database
    Database --> RLS

    style SM2 fill:#fff4e1
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
    participant SM2Algorithm
    participant useUpdateWordStats
    participant Database

    ReviewPage->>useDueWords: Fetch due words
    useDueWords->>Database: SELECT words WHERE next_review_at <= NOW()
    Database-->>useDueWords: Return due words
    useDueWords-->>ReviewPage: Display words

    User->>ReviewPage: Review word & rate quality (0-5)
    ReviewPage->>SM2Algorithm: Calculate next review
    SM2Algorithm->>SM2Algorithm: Compute ease factor, interval, repetitions
    SM2Algorithm-->>ReviewPage: Return new values

    ReviewPage->>useUpdateWordStats: Update stats
    useUpdateWordStats->>Database: UPDATE word_stats
    Database-->>useUpdateWordStats: Success

    ReviewPage->>ReviewPage: Next word or finish

    alt Session complete
        ReviewPage->>Database: INSERT INTO review_sessions
    end
```

---

### SM-2 Spaced Repetition Algorithm

```mermaid
flowchart TD
    Start([User Reviews Word]) --> Rate[User Rates Quality 0-5]
    Rate --> Check{Quality >= 3?}

    Check -->|No - Failed| Reset[Reset Progress<br/>repetitions = 0<br/>interval = 1 day]
    Check -->|Yes - Success| CheckRep{Check Repetitions}

    CheckRep -->|repetitions = 0| First[interval = 1 day]
    CheckRep -->|repetitions = 1| Second[interval = 6 days]
    CheckRep -->|repetitions >= 2| Calculate[interval = previous × ease_factor]

    First --> UpdateEase
    Second --> UpdateEase
    Calculate --> UpdateEase
    Reset --> Schedule

    UpdateEase["Update Ease Factor
    EF = EF + 0.1 - (5-q) × 0.08 + (5-q)² × 0.02
    Min EF = 1.3"] --> Increment[repetitions += 1]

    Increment --> Schedule[Schedule Next Review<br/>next_review_at = today + interval]
    Schedule --> Save[Save to Database]
    Save --> End([Word Rescheduled])

    style Check fill:#ffe1e1
    style UpdateEase fill:#e1f5ff
    style Schedule fill:#e1ffe1
```

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
        float ease_factor
        int interval_days
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
    Protected4 --> GenerationPhase[GenerationPhase]
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

- [x] SM-2 spaced repetition engine
- [x] Battle mode 4-choice quiz
- [x] AI auto-scoring via OpenRouter
- [x] Word library with collocations
- [x] Review session tracking
- [ ] FSRS algorithm migration (shadow mode → full)
- [ ] Sentence generation phase
- [ ] Offline support (PWA)
- [ ] Export/import vocabulary sets
- [ ] Native mobile app (React Native)

---

## 🧪 Running Tests

```bash
# Unit tests
bun test

# E2E tests
bun playwright test
```

---

## 📁 Project Structure

```
lexcore/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── review/        # BattlePhase, ContextPhase, etc.
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks (useWords, useDueWords, etc.)
│   ├── lib/               # SM-2 algorithm, Supabase client, utilities
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
