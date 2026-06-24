# ⏳ Chronos — Your AI Time Guardian

> **The Last-Minute Life Saver** — An AI-powered productivity companion that doesn't just remind you about deadlines — it rescues you from missing them.

[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%202.5-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
[![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)

---

## 🎯 Problem Statement

Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, and important commitments. Existing productivity tools rely on **passive reminders** that are easy to ignore and do little to help users actually **complete** their tasks.

**Chronos solves this** by being a **proactive, autonomous AI agent** that detects when you're about to miss a deadline and intervenes with real help — not just another notification.

---

## 🚀 Key Features

### 🚨 Rescue Mode
When a deadline approaches and you're behind, Chronos auto-generates a **compressed action plan** with exact time blocks, identifies what can be skipped, and guides you step-by-step through completion.

### 👻 Ghost Worker
AI autonomously **drafts emails, documents, presentations, and code boilerplate** while you focus on other tasks. Review, edit, and approve — or let it handle the grunt work.

### 🔮 Time Warp
Analyzes your **past behavior patterns** and **predicts future bottlenecks** before they happen. See your high-risk days coming a week in advance.

### 🎭 Accountability Partner
Adapts its communication style based on your personality — from gentle encouragement to drill-sergeant urgency to data-driven analysis. It escalates as deadlines approach.

### 🧩 Smart Decomposition
Break any goal into **AI-generated micro-tasks** with realistic time estimates, dependencies, and calendar integration.

### 🎤 Voice & Camera
Talk to Chronos or **scan whiteboards, notes, and documents** with your camera — it extracts tasks and deadlines automatically.

### 🎮 Gamification
XP, levels, streaks, and achievement badges — toggleable per user preference. Stay motivated without the gimmick.

### 📊 AI-Powered Analytics
Real-time dashboards with productivity trends, AI-generated weekly insights, and exportable reports.

---

## 🏗️ Architecture

```
Next.js 14 (App Router) → API Routes → Gemini 2.5 AI Agents → Firebase (Firestore/Auth/FCM)
                                                              → Google Calendar/Gmail/Tasks APIs
                                                              → Deployed on Google Cloud Run
```

### AI Agent System (5 Specialized Agents)

| Agent | Model | Purpose |
|-------|-------|---------|
| **Core Agent** | Gemini 2.5 Flash | Main conversational AI with 14 function-calling tools |
| **Rescue Agent** | Gemini 2.5 Pro | Generates compressed action plans under time pressure |
| **Ghost Worker** | Gemini 2.5 Pro | Autonomously drafts deliverables |
| **Time Warp** | Gemini 2.5 Flash | Predictive bottleneck analysis |
| **Accountability** | Gemini 2.5 Flash | Personality-adaptive motivation |
| **Decomposer** | Gemini 2.5 Flash | Goal → micro-task breakdown |

---

## 🛠️ Google Technologies Used (15)

| # | Technology | Usage |
|---|-----------|-------|
| 1 | **Gemini 2.5 Flash** | Core chat, quick analysis, camera vision |
| 2 | **Gemini 2.5 Pro** | Rescue Mode planning, Ghost Worker |
| 3 | **Gemini Function Calling** | 14 tools for autonomous agent behavior |
| 4 | **Gemini Structured Output** | Type-safe AI responses via Zod schemas |
| 5 | **Gemini Vision** | Camera-based document/whiteboard scanning |
| 6 | **Google AI Studio** | API key management, prompt prototyping |
| 7 | **Firebase Auth** | Google OAuth sign-in |
| 8 | **Cloud Firestore** | NoSQL database for all application data |
| 9 | **Firebase Cloud Messaging** | Push notifications |
| 10 | **Google Calendar API** | Calendar integration & sync |
| 11 | **Gmail API** | Email reminders & Ghost Worker drafts |
| 12 | **Google Tasks API** | Task synchronization |
| 13 | **Google Cloud Run** | Container deployment |
| 14 | **Google Cloud Build** | CI/CD pipeline |
| 15 | **Web Speech API** | Voice-enabled assistance |

---

## 🎨 Design

**Dark Cyberpunk Aesthetic** with neon accents (cyan/purple/pink), glassmorphism, and micro-animations. Three user modes with tailored experiences:

- 🎓 **Student Mode** — Exams, assignments, campus placements
- 💼 **Professional Mode** — Projects, meetings, deliverables
- 🚀 **Entrepreneur Mode** — Pitches, launches, fundraising

---

## 🏃 Getting Started

### Prerequisites
- Node.js 20+
- Google Cloud Platform project with billing enabled
- Firebase project
- Gemini API key (from Google AI Studio)

### Local Development
```bash
git clone <repo-url>
cd chronos
npm install
cp .env.example .env.local   # Fill in your API keys
npm run dev                   # http://localhost:3000
```

### Deployment (Google Cloud Run)
```bash
gcloud builds submit --config cloudbuild.yaml
```

---

## 📁 Project Structure

```
chronos/
├── docs/
│   ├── TECHNICAL_DESIGN.md      # Architecture & product specification
│   └── CODE_SPECIFICATION.md    # Implementation-level code spec
├── src/
│   ├── app/                     # Next.js App Router pages & API routes
│   ├── components/              # React components (UI, chat, tasks, etc.)
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Firebase, AI agents, utilities
│   │   ├── ai/agents/           # 6 specialized Gemini AI agents
│   │   └── demo/                # Demo mode with 3 user personas
│   └── types/                   # TypeScript type definitions
├── public/                      # PWA manifest, service worker, icons
├── Dockerfile                   # Cloud Run container
├── cloudbuild.yaml              # CI/CD for GCP
└── README.md
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) | Complete architecture, AI agent system, Firestore schema, deployment strategy, team work distribution, and evaluation matrix alignment |
| [CODE_SPECIFICATION.md](docs/CODE_SPECIFICATION.md) | Implementation-level specification for every file — CSS design tokens, TypeScript types, component props/state, API contracts, agent system prompts, demo data |

---

## 👥 Team

Built for the **BlockseBlock Hackathon 2026** — The Last-Minute Life Saver challenge.

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.
