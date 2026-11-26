# DPIS — Digital Psychological Intervention System

A privacy-first, organizational mental health screening and clinical triage platform designed for universities and corporate institutions.

## Features

- **Privacy-First Architecture (Zero-PII for Admins):** Administrators only view aggregated statistical indicators and strictly anonymized assessment profiles (`anonymousId`). Personal identities and screening scores are completely separated.
- **Evidence-Based Clinical Screening Instruments:**
  - **PHQ-9** (Patient Health Questionnaire — Depression, 0–27)
  - **GAD-7** (Generalized Anxiety Disorder, 0–21)
  - **PSS-10** (Perceived Stress Scale, 0–40)
- **Role-Based Portals:**
  - **Member / Student / Employee:** Confidential self-check-ins, instantaneous risk-tier determination, crisis support resources, and personalized wellness suggestions.
  - **Administrator:** Longitudinal visual analytics, severity distribution donut charts, tri-axis radial clinical dial gauges, monthly trajectory stacked bars, co-morbidity scatter matrix, and triage care velocity funnels.
  - **Clinician / Doctor:** Confidential severity-sorted triage queue, crisis flags, clinical case notes, and care status management (Unreviewed, Contacted, In Care, Resolved).
- **Institution Domain Locking:** Organization enrollment automatically matches corporate/university email domains (e.g. `@iiitranchi.ac.in`) with invite-code verification.
- **Strict 1-to-1 Admin Association:** Each administrator creates and is permanently linked to exactly one organization.
- **Dark & Light Mode:** Modern theme system with obsidian-black dark mode accented with subtle olive and warm beige tones.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide / Material Symbols
- **Backend:** Node.js, Express.js (REST API)
- **Database:** MongoDB / Mongoose
- **Authentication:** JWT (JSON Web Tokens), bcryptjs password hashing
- **AI Analytics:** Google Gemini API (`@google/genai`) for optional qualitative executive synthesis

## Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (local or MongoDB Atlas)

### 2. Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in your configuration:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/dpis
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Installation
Install root (backend) and client (frontend) dependencies:
```bash
npm install
npm --prefix client install
```

### 4. Running the Application
Run backend and frontend:
```bash
# Terminal 1: Start backend server (port 5000)
npm run dev

# Terminal 2: Start frontend client (Vite on port 5173)
npm run client
```

### 5. Building for Production
```bash
npm --prefix client run build
```

## License
MIT
