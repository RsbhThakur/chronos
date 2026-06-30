# Chronos — End-to-End Testing & Deployment Guide

Welcome to the **Chronos End-to-End Testing and Deployment Guide**. This document outlines step-by-step procedures for testing every feature, behavior, and edge case of Chronos both in the isolated sandbox **Demo Mode** and the live authenticated **Production Mode**.

At the end of this document, you'll find the comprehensive guide to deploying Chronos on **Google Cloud Run** using your existing GCP project and connecting it with **Firebase Services**.

---

## Table of Contents
1. [Prerequisites & Environments](#1-prerequisites--environments)
2. [E2E Testing: Sandbox Demo Mode (No Setup Required)](#2-e2e-testing-sandbox-demo-mode-no-setup-required)
3. [E2E Testing: Live Production Mode (Real Credentials)](#3-e2e-testing-live-production-mode-real-credentials)
4. [Edge Cases & Error Handling Checklist](#4-edge-cases--error-handling-checklist)

---

## 1. Prerequisites & Environments

Chronos operates in two distinct runtime paradigms to accommodate both hackathon evaluation judges and actual users:

*   **Demo Mode (Hermetic Sandbox)**: Enabled via the `[DEMO MODE]` switcher in the top navigation bar. It intercept all network, database, and API interactions, replacing them with stateful simulated contexts in React state. No external credentials, billing, or accounts are required.
*   **Production Mode (Real Cloud)**: Connected directly to Vertex AI, Firebase Firestore, Google Calendar, Google Tasks, and Firebase Cloud Messaging (FCM). Requires actual OAuth sign-in.

---

## 2. E2E Testing: Sandbox Demo Mode (No Setup Required)

This walkthrough is optimized for quick, end-to-end user experience audits. No credentials are required.

### Step 2.1: Initial Onboarding & Quiz
* **Status: VERIFIED ✅ (Passed in Playwright E2E: `e2e/chronos-e2e.spec.ts`)**
1. ~~Run the server locally: `npm run dev` and navigate to `http://localhost:3000`.~~
2. ~~Hit the **"Get Started"** button to start the immersive **Onboarding Flow**.~~
3. ~~Select a Persona Mode:~~
   *   ~~**Student** (Focuses on assignments, exams, and classes)~~
   *   ~~**Professional** (Focuses on sprints, meetings, and reviews)~~
   *   ~~**Entrepreneur** (Focuses on pitch decks, launches, and recruiting)~~
4. ~~Take the **Personality Quiz**: Toggle preferences and selection styles (e.g. choose *Marathoner* work style, *Drill Sergeant* accountability mode, *Casual* communication, and peak morning hours).~~
5. ~~Complete onboarding. The application will automatically redirect you to the main dashboard.~~

### Step 2.2: Demo Mode Switch & Persona Loading
* **Status: VERIFIED ✅ (Passed in Playwright E2E: `e2e/chronos-e2e.spec.ts`)**
1. ~~Locate the blinking neon **`[DEMO MODE]`** toggle button in the TopBar.~~
2. ~~Toggle it **ON**.~~
3. ~~Verify that the system instantly populates the dashboard with a full set of 15+ highly specific persona tasks matching your chosen mode (e.g., *Machine Learning Assignment* with an active crimson **Rescue Alert** badge if you chose the Student mode).~~
4. ~~Navigate to the Sidebar, toggle the Persona selection, and switch modes (e.g., from *Student* to *Professional*). Watch the entire dashboard, tasks board, and analytics instantly adapt with matching mock logs.~~

### Step 2.3: Immersive Rescue Mode Action Center
* **Status: VERIFIED ✅ (Passed in Playwright E2E: `e2e/chronos-e2e.spec.ts`)**
1. ~~On the Dashboard, find the task highlighted with a pulsing red banner (e.g., *"ML Assignment"* with the text *"🚨 URGENT: DUE IN 45 MINS"*).~~
2. ~~Click the **"Rescue Mode"** action button.~~
3. ~~Review the terminal-themed generation transition overlay screen showing AI-guardian activity.~~
4. ~~Once loaded, verify the full-screen interactive **Rescue Action Center**:~~
   *   ~~**Adaptive Countdown**: Check the running neon-tinted countdown clock. Watch it tick downwards.~~
   *   ~~**Milestone Step Checklist**: Review the broken-down checklist of steps (e.g., *"Read prompt"*, *"Draft math formula"*, etc.).~~
   *   ~~**Expert Strategy Tips**: Click to expand and read expert context-aware AI strategy guidelines.~~
   *   ~~**Commitments & Sacrifices**: Check the trade-offs tracker (e.g. *"Skip dinner"*, *"Decline phone call"*).~~
5. ~~**Clutch Completion Flow**:~~
   *   ~~Click and check off each step inside the Milestone Checklist.~~
   *   ~~When the final step is checked, observe the beautiful **Glassmorphism Reward Modal** transition in.~~
   *   ~~Verify that your user level progression bar fills up, awarding **+50 Base XP** with a **1.5x Clutch Multiplier** (+75 XP total).~~
   *   ~~Click *"Back to Dashboard"* to exit.~~

### Step 2.4: Premium Ghost Worker Studio
* **Status: VERIFIED ✅ (Passed in Playwright E2E: `e2e/chronos-e2e.spec.ts`)**
1. ~~Navigate to the **Tasks Board** (Kanban card grid) via the sidebar.~~
2. ~~Hover over any task card and click the translucent **"Ghost Worker (Ghost icon)"** action icon.~~
3. ~~Observe the right-aligned **Ghost Worker Studio Drawer** slide out.~~
4. ~~Toggle the **Segmented Deliverable Selector** between:~~
   *   ~~**Email Draft** (for emails to professors/clients)~~
   *   ~~**Markdown Document** (for guides or technical specifications)~~
   *   ~~**Code Template** (for initial scripts or models)~~
5. ~~Enter additional custom instructions and click **"Generate Draft"**.~~
6. ~~Review the generated tabs:~~
   *   ~~**Preview Tab**: Renders structured Markdown output beautifully (headers, lists, bold text, codeblocks).~~
   *   ~~**Edit Raw Tab**: A custom text area allowing manual editing of the output string.~~
7. ~~Click **"Export"**. Since we are in Demo Mode, a `.md` Markdown file downloads directly to your device.~~

### Step 2.5: Voice Chat Sidebar
* **Status: VERIFIED ✅ (Passed in Playwright E2E: `e2e/chronos-e2e.spec.ts`)**
1. ~~Locate the AI Chat Sidebar on the right.~~
2. ~~Click the **"Microphone"** icon in the chat input.~~
3. ~~Verify the voice capture interface triggers:~~
   *   ~~Microphone icon pulses with a breathing cyan neon outline.~~
   *   ~~A glowing glassmorphism waveform HUD slides up showing animated visual equalizer bars.~~
4. ~~Speak clearly: *"Create high priority task to review deployment scripts due tomorrow at noon."*~~
5. ~~Verify that your voice is transcribed instantly in real-time in the text box.~~
6. ~~Press Enter. The Core Agent processes your instruction, uses Gemini Function Calling to execute the creation, and returns a streaming chat message: *"I've created the task: Review deployment scripts. Priority: High, Deadline: Tomorrow 12:00 PM."*~~
7. ~~Check your dashboard list to verify the task was added.~~

### Step 2.6: OCR Camera Scanner
* **Status: VERIFIED ✅ (Passed in Playwright E2E: `e2e/chronos-e2e.spec.ts`)**
1. ~~Click the **"Camera"** icon in the chat sidebar input box.~~
2. ~~Grant camera permissions. The live media video stream opens inside a glassmorphic container.~~
3. ~~Click the **"Capture Snapshot"** camera button.~~
4. ~~Verify that the image is frozen, a loading HUD starts, and the Gemini OCR document parser streams back structured suggestions.~~
5. ~~In the confirmation screen:~~
   *   ~~Review parsed task suggestions (e.g. *"Review deployment scripts"* with inferred priority *High* and parsed deadline *July 1*).~~
   *   ~~Check/uncheck items.~~
   *   ~~Click **"Add Tasks"** to bulk-create all checked items instantly on your Kanban board.~~

### Step 2.7: Analytics & SVG Streak Heatmap
* **Status: VERIFIED ✅ (Passed in Playwright E2E: `e2e/chronos-e2e.spec.ts`)**
1. ~~Click **"Analytics"** in the sidebar to open the Analytics portal.~~
2. ~~Toggle range intervals: **"TODAY"**, **"THIS WEEK"**, **"THIS MONTH"**, and **"ALL"**.~~
3. ~~Verify the **Productivity Bar & Line Charts**:~~
   *   ~~Hover over bars to check active tooltips.~~
   *   ~~Verify bar coloring changes dynamically based on the focus time (e.g., *Pink* for focus periods $<60\text{m}$, *Amber* for $<120\text{m}$, *Neon Green* for $\ge 120\text{m}$).~~
4. ~~Verify the **365-Day SVG Streak Heatmap**:~~
   *   ~~A full year-view activity grid renders.~~
   *   ~~Hover your cursor over active grid cells; verify that a coordinates-pinned popover tracking card appears with the exact date, completed tasks count, and focus hours.~~
5. ~~Click **"EXPORT TELEMETRY"** to download raw daily JSON files.~~
6. ~~Click **"PRINT REPORT"**; verify that custom CSS stylesheets are applied to cleanly format page contents for PDF print exports, hiding sidebars and buttons.~~

---

## 3. E2E Testing: Live Production Mode (Real Credentials)

Once deployment is complete (see section 5), test the actual live cloud integration end-to-end.

### Step 3.1: Google OAuth Registration & Database Sync
1. Navigate to your production URL.
2. Click **"Sign In with Google"**.
3. Log in with a real Google Account.
4. Upon redirected onboarding completion, open the Firestore Console under the connected project.
5. Verify that a new document matching your Google User ID has been created inside the `/users` collection containing your personality profiles.

### Step 3.2: Real-time Firestore Task CRUD
1. On the main task list, add a task: *"Draft Presentation"* (Priority: *High*, Estimated Time: *45 mins*, Category: *Work*).
2. Look at Firestore: check that a document has appeared in `/users/{userId}/tasks/{taskId}` with matching fields.
3. Click the checkbox on the task card to complete it.
4. Verify that:
   *   The task state merges to `completed`.
   *   `completedAt` is stored as a real timestamp.
   *   XP is awarded and level-up calculations increment dynamically inside `/users/{userId}/gamification/stats`.

### Step 3.3: Live Google Calendar Synchronizer
1. Create a task and toggle the **"Add to Google Calendar"** switch.
2. Open your Google Calendar inside another tab.
3. Check that a calendar event matching your task's title, description, and deadline has been inserted correctly.
4. Modify the deadline in Chronos, or toggle the task as completed. Check that Google Calendar updates or marks the event accordingly.

### Step 3.4: Real-time FCM Notification Engine
1. Subscribe to push notifications when prompted by your browser.
2. Open your database console, navigate to `/users/{userId}`, and verify a valid **`fcmToken`** field is registered.
3. Trigger a deadline checking audit request using the cron URL or a cURL script (simulating a task due within the next hour).
4. Verify that:
   *   A visual system notification banner slides out on your desktop with the text *"🚨 URGENT: [Task Name] is due in less than 1 hour!"*
   *   The notifications bell dropdown in your Chronos top navigation bar increments its unread count.
   *   The alert displays in the notifications panel. Click **"Mark as Read"** and verify that it updates instantly in the database with `read: true`.

---

## 4. Edge Cases & Error Handling Checklist

Verify that Chronos handles extreme input configurations gracefully:

| Feature Area | Trigger / Scenario | Expected Safe Behavior | Verified |
|---|---|---|:---:|
| **Task Estimations** | Enter estimated minutes as `0` or negative. | System limits bounds to a minimum of 1 minute; displays validation errors. | [x] |
| **Deadlines** | Set task deadline to a historic date. | System marks task as immediately `overdue` and logs it in the corresponding calendar. | [x] |
| **Media Captures** | Revoke browser camera or microphone permissions, then click Voice or Scanner buttons. | Display a graceful warning banner: *"Camera access blocked. Please enable permissions in your site settings."* | [x] |
| **OCR Scanner Failures** | Upload/capture a blank white paper or highly blurry photo. | Gemini model returns an empty array; the scanner displays: *"No clear tasks detected. Try adjusting lighting or capture a distinct document."* | [x] |
| **Large Data Heatmaps** | Simulate $300+$ active daily logs in Firestore. | SVG Heatmap renders successfully; pagination is responsive without blocking browser UI cycles. | [x] |
| **OAuth Token Expiration** | Force-expire or revoke the Google OAuth session token. | NextAuth intercepts the expired session, triggers a silent refresh, or safely log out redirecting to `/login` with an informative banner. | [x] |