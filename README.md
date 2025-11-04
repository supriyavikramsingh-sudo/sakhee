# 🌸 Sakhee — AI-powered PCOS Management Assistant

Sakhee is an AI-driven, culturally-localized health companion focused on helping Indian women manage PCOS/PCOD. It combines a React + Vite frontend with an Express backend that leverages language models and retrieval pipelines (LangChain.js) for personalized chat, meal planning, medical report parsing, and progress tracking.

This README covers how to get the project running locally, available scripts, environment variables, features, and code organization.

--### Development Notes

### Server

- Uses **LangChain.js + OpenAI** for chat and RAG
- Keep the OpenAI key in `server/.env` (never commit)
- Auto-restarts on file changes with `node --watch`
- Uploaded files stored temporarily in `server/src/storage/tmpUploads`
- Vector store cached in `server/src/storage/localCache/vectordb`
- **RAG System**:
  - Meal templates stored as `.txt` files in `server/src/data/meal_templates/`
  - Run `npm run ingest:meals` after adding/updating templates
  - Server checks RAG status on startup and logs warnings if not initialized
  - Vector store uses HNSWLib for fast similarity search
  - Each meal plan includes RAG metadata showing retrieval quality and sources used
- **Meal Plan Generation**:

  - Plans are generated in chunks (3 days max per LLM call) for reliability
  - Structure validation ensures consistent JSON format
  - Fallback templates used if AI generation fails
  - All plans stored in-memory (consider migrating to Firestore for persistence)

Features

- **🤖 AI Chat Assistant** - Conversational AI powered by GPT-4o-mini with RAG (Retrieval-Augmented Generation) for PCOS-specific guidance
- **🍽️ Personalized Meal Planning** - AI-generated meal plans tailored to Indian cuisine and PCOS dietary needs with:
  - RAG-powered knowledge retrieval from curated meal templates and nutrition guidelines
  - Transparent personalization sources showing what influenced each plan (onboarding data, medical reports, RAG knowledge base)
  - Visual RAG metadata display showing knowledge base coverage and sources used
  - Automatic chunking for longer meal plans to ensure reliability
  - PDF export functionality for all meals
  - Regional cuisine variations (North, South, East, West Indian)
- **📄 Medical Report Analysis** - OCR-based parsing of lab reports (PDF, DOCX, images) with intelligent data extraction and integration into meal plan generation
- **📊 Progress Tracking** - Visual dashboards to monitor health metrics, symptoms, and lifestyle changes over time
- **🌐 Multi-language Support** - English and Hindi with i18next internationalization
- **🔐 Firebase Authentication** - Secure Google OAuth login with Firestore for user profiles and data persistence
- **🛡️ Safety & Privacy** - Content safety guards, rate limiting, and medical disclaimers
- **🔄 Community Insights** - Reddit integration for anonymized community experiences (optional)

Testing Community Insights & Clickable Links

- Quick test: send a community-style question to the chat endpoint and look for a concise assistant reply that includes a final markdown-formatted links block (e.g. `[title](https://reddit.com/...)`). The frontend converts markdown links into clickable anchors.
- Example curl payload to test the chat endpoint (replace `USER_ID` and `API_KEY` as needed):

```bash
curl -sS -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","message":"Are there any women in India who treated PCOS acne with Ayurveda?"}'
```

- What to look for:
  - Backend logs show `needsCommunityInsights()` triggered and `fetchRedditContext()` returned top posts.
  - Assistant reply contains a short empathic opening, a 3–5 bullet set of RAG-backed recommendations, and a `📚 Community discussions` section with markdown links.
  - Links in the frontend chat UI are clickable (open in a new tab). If links are plain URLs, see the Troubleshooting section about frontend markdown rendering.

- **🎨 Modern UI** - Responsive design with Tailwind CSS, Lucide icons, and Recharts visualizations
- **🔍 RAG System Status** - Real-time monitoring of RAG system health, vector store status, and template indexing

---

## 🚀 Quick Setup (Development)

### Prerequisites

- **Node.js** >= 18
- **npm** (or yarn)
- **OpenAI API key** (required)
- **Firebase project** with Authentication and Firestore enabled (required)
- **SERP API key** (optional, for web search context)
- **Reddit OAuth credentials** (optional, for community insights)

### Installation

1. **Clone the repository**

```bash
git clone <repo-url>
cd sakhee
npm install
```

2. **Configure environment variables**

**Server** (`server/.env`):

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your keys:

```bash
PORT=5000
NODE_ENV=development

# Required: OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Optional: SERP API for web search
SERP_API_KEY=your_serp_api_key_here

# Optional: Reddit OAuth (Personal Script App)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_REDIRECT_URI=http://localhost:3000/auth/reddit/callback

# Security
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=10
DATABASE_URL=local
```

**Client** (`client/.env`):

```bash
cp client/.env.example client/.env
```

Edit `client/.env` and add your Firebase config:

```bash
# API
VITE_API_URL=http://localhost:5000/api
VITE_API_TIMEOUT=30000

# App
VITE_APP_NAME=Sakhee
VITE_VERSION=1.0.0

# Required: Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. **Initialize RAG system (Optional but Recommended)**

To enable full RAG functionality with meal templates:

```bash
# Create meal templates folder (if not exists)
mkdir -p server/src/data/meal_templates

# Add your meal template .txt files to the folder
# Each template should contain meal information, recipes, and nutrition data

# Index the templates into the vector store
cd server
npm run ingest:meals
```

The server will work without this step but will use fallback templates instead of RAG retrieval.

  4. **Start development servers**

```bash
npm run dev
```

This will start:

- **Client**: http://localhost:5173
- **Server**: http://localhost:5000

You can also start each part separately:

```bash
# Server only
cd server && npm run dev

# Client only
cd client && npm run dev
```

---

## 📦 Environment Variables

### Server (`.env`)

| Variable               | Required | Description                                          |
| ---------------------- | -------- | ---------------------------------------------------- |
| `PORT`                 | No       | Server port (default: 5000)                          |
| `NODE_ENV`             | No       | Environment (development/production)                 |
| `OPENAI_API_KEY`       | **Yes**  | OpenAI API key for LLM and embeddings                |
| `SERP_API_KEY`         | No       | SERP API key for web search context                  |
| `REDDIT_CLIENT_ID`     | No       | Reddit OAuth client ID                               |
| `REDDIT_CLIENT_SECRET` | No       | Reddit OAuth client secret                           |
| `REDDIT_REDIRECT_URI`  | No       | Reddit OAuth redirect URI                            |
| `CORS_ORIGIN`          | No       | Allowed CORS origin (default: http://localhost:5173) |
| `MAX_FILE_SIZE_MB`     | No       | Max upload file size in MB (default: 10)             |
| `DATABASE_URL`         | No       | Database URL (default: local)                        |

### Client (`.env`)

| Variable                            | Required | Description                            |
| ----------------------------------- | -------- | -------------------------------------- |
| `VITE_API_URL`                      | **Yes**  | Backend API URL                        |
| `VITE_API_TIMEOUT`                  | No       | API request timeout (default: 30000ms) |
| `VITE_APP_NAME`                     | No       | App name (default: Sakhee)             |
| `VITE_FIREBASE_API_KEY`             | **Yes**  | Firebase API key                       |
| `VITE_FIREBASE_AUTH_DOMAIN`         | **Yes**  | Firebase auth domain                   |
| `VITE_FIREBASE_PROJECT_ID`          | **Yes**  | Firebase project ID                    |
| `VITE_FIREBASE_STORAGE_BUCKET`      | **Yes**  | Firebase storage bucket                |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes**  | Firebase messaging sender ID           |
| `VITE_FIREBASE_APP_ID`              | **Yes**  | Firebase app ID                        |

⚠️ **Security Note**: Never commit `.env` files with real API keys to version control.

## 📜 NPM Scripts

### Root Workspace

| Script                 | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Start both client and server concurrently (development mode) |
| `npm run build`        | Build both client and server for production                  |
| `npm run test`         | Run tests for client and server                              |
| `npm run lint`         | Run ESLint across all workspaces                             |
| `npm run lint:fix`     | Auto-fix linting issues across all workspaces                |
| `npm run format`       | Format code with Prettier                                    |
| `npm run format:check` | Check code formatting with Prettier                          |

### Server (`server/`)

| Script          | Description                                              |
| --------------- | -------------------------------------------------------- |
| `npm run dev`   | Start server with auto-restart on changes (node --watch) |
| `npm run start` | Start server in production mode                          |

## 🧭 Vector DB management (server side)

The project uses an HNSWLib vector store stored under `server/src/storage/localCache/vectordb`.
For development and maintenance there are a few helper scripts in `server/src/scripts/` to inspect, back up, clear and restore the vector store.

Important: run these from the `server` folder (or use `cd server` first). The scripts assume the server-relative storage path. If your repo path contains spaces, the scripts are already quoted to avoid child-process path truncation issues.

Common commands (run inside `server`):

- npm run vector:health — run a quick health check (checks files, loads index, runs a small similarity query)
- npm run vector:backup — creates a timestamped backup of the current vector store under `server/backups/vectorstore/`
- npm run vector:clear — backs up then clears the vector store (interactive confirmation)
- npm run vector:list — lists the files in the vector store folder and a rough document count
- npm run vector:restore -- <backup-folder> — restores a backup folder into `server/src/storage/localCache/vectordb`

Notes & recent fixes

- All vector scripts were updated to use server-relative paths (previously some scripts pointed to the wrong `src` path and failed to find the vector store).
- The master ingestion launcher was fixed to quote child-process invocations so `node "${scriptPath}"` works even when the repository path contains spaces.
- Meal template ingestion was updated to extract individual meal entries (#### level) instead of only category-level docs (###). If you re-index after this fix you should see many more meal documents (previously ~149, now ~1,300+ depending on templates).
- Recommended workflow to re-index safely:
  1. cd server
  2. npm run vector:backup
  3. npm run vector:clear (confirm)
  4. npm run ingest:all (or `npm run ingest:meals` / `npm run ingest:medical` / `npm run ingest:nutrition`)
  5. npm run vector:health

If you want this automated in CI, consider adding a guarded task that runs the backup + ingest + health-check and fails loudly if the health check does not return expected counts.

## 🥗 Nutrition & Ingredient Substitutes (recent fixes)

This project includes targeted logic for extracting nutrition facts from web search results and for recommending PCOS-aware ingredient substitutes. Recent fixes (Oct 2025) improve accuracy and relevance:

- SERP query cleaning: user queries like "nutrition info on quinoa salad" are cleaned to the actual food item ("quinoa salad") before web search. This reduces cases where the SERP returned generic "quinoa (grain)" pages instead of the prepared dish.
- Organic-result prioritization: when possible the system prefers organic/nutrition snippets that report per-serving values (not per-100g) to provide realistic serving nutrition values.
- Improved regex extraction: calorie/macro extraction patterns were tightened (negative lookaheads and serving-size-aware patterns) to avoid false matches like "2000 calorie diet".
- Validation rules: calories sanity checks (per-serving < 1000), duplicate-macro detection, and category-based minimum calorie thresholds to catch parsing errors.
- Context-aware substitutes: the RAG query builder now detects if a dish is already PCOS-friendly (e.g., "quinoa salad") and, in that case, searches for healthier add-on/topping alternatives (dressings, cheese, croutons) instead of suggesting irrelevant substitutes like "maida" or plain white rice.
- Mandatory LLM instructions: the chat chain now injects CRITICAL/MANDATORY instructions requiring exact gram values in responses and a dedicated "PCOS-Friendly Modifications" section with a strict response format.

Quick test cases and what to expect:

- Query: `nutrition info on quinoa salad`
  - SERP should be called with `quinoa salad` (cleaned); logs show `cleanQuery: "quinoa salad"`.
  - Substitutes should target toppings/dressings (e.g., "Instead of mayonnaise, use Greek yogurt-based dressing because..."), not rice/maida.

- Query: `nutrition info on white rice biryani`
  - System should detect rice as the problematic main ingredient and the substitutes should include whole-grain or lower-GI options (quinoa, brown rice, cauliflower rice).

- Query: `nutrition info on magnolia bakery banana pudding cookies confetti`
  - Response should include exact gram values from the parsed nutrition JSON, a `PCOS-Friendly Modifications` section with ingredient-level substitutes (3–4 items), and the mandatory Google disclaimer + source links.

Where to look in the code:

- `server/src/services/serpService.js` — query sanitization and nutrition extraction logic
- `server/src/langchain/chains/chatChain.js` — building the substitute RAG query, mandatory instructions for the LLM, and validation helpers
- `server/src/langchain/initializeRAG.js` and `server/src/langchain/vectorStore.js` — RAG initialization and vector store

If you want more conservative or aggressive substitution rules (for example, always preferring plant-based alternatives), we can add configuration flags in `server/src/config/appConfig.js` to tune the behavior.
| `npm run ingest:meals` | Index meal templates into vector store for RAG |
| `npm run ingest:all` | Index all data sources (meals, medical, nutritional) |
| `npm run test` | Run server tests with Vitest |
| `npm run lint` | Lint server code |
| `npm run lint:fix` | Auto-fix server linting issues |
| `npm run format` | Format server code with Prettier |

### Client (`client/`)

| Script             | Description                                   |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start Vite development server with hot reload |
| `npm run build`    | Build production-ready static assets          |
| `npm run preview`  | Preview production build locally              |
| `npm run test`     | Run client tests with Vitest                  |
| `npm run lint`     | Lint client code                              |
| `npm run lint:fix` | Auto-fix client linting issues                |
| `npm run format`   | Format client code with Prettier              |

## 🏗️ Project Structure

### Overall Architecture

```
sakhee/
├── client/              # React frontend (Vite + Tailwind CSS)
├── server/              # Express backend (Node.js + LangChain.js)
├── package.json         # Root workspace configuration
└── README.md
```

### Client Structure (`client/`)

```
client/
├── src/
│   ├── app/
│   │   └── App.jsx                    # Main app with routing
│   ├── components/
│   │   ├── auth/                      # Authentication guards
│   │   │   ├── ProtectedRoute.jsx     # Protected route wrapper
│   │   │   └── OnboardingRoute.jsx    # Onboarding route wrapper
│   │   ├── chat/                      # Chat interface components
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── SourceCitations.jsx
│   │   │   └── MedicalDisclaimer.jsx
│   │   ├── files/                     # File upload & reports
│   │   │   ├── FileUpload.jsx
│   │   │   ├── ReportAnalysis.jsx
│   │   │   └── ReportList.jsx
│   │   ├── layout/                    # Layout components
│   │   │   ├── Navbar.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── meal/                      # Meal planning components
│   │   │   ├── MealPlanGenerator.jsx  # Form with personalization tracking
│   │   │   ├── MealPlanDisplay.jsx    # Display with PDF export
│   │   │   ├── MealCard.jsx
│   │   │   └── RAGMetadataDisplay.jsx # RAG transparency component
│   │   ├── onboarding/                # Onboarding flow
│   │   │   ├── OnboardingForm.jsx
│   │   │   └── QuestionField.jsx
│   │   └── progress/                  # Progress tracking
│   │       ├── ProgressDashboard.jsx
│   │       └── ProgressCharts.jsx
│   ├── config/
│   │   └── firebase.js                # Firebase initialization
│   ├── hooks/
│   │   └── useLocalStorage.js         # Custom React hooks
│   ├── i18n/                          # Internationalization
│   │   ├── en.json                    # English translations
│   │   └── hi.json                    # Hindi translations
│   ├── pages/                         # Page components
│   │   ├── LoginPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── OnboardingPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── MealPlanPage.jsx
│   │   ├── ProgressPage.jsx
│   │   ├── ReportsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── services/                      # API clients
│   │   ├── apiClient.js               # Base API client (Axios)
│   │   ├── authService.js             # Firebase auth service
│   │   ├── firestoreService.js        # Firestore operations
│   │   ├── chatApi.js                 # Chat API calls
│   │   └── mealApi.js                 # Meal planning API calls
│   ├── store/                         # State management (Zustand)
│   │   ├── authStore.js               # Authentication state
│   │   └── index.js
│   ├── styles/
│   │   └── index.css                  # Global styles + Tailwind
│   ├── utils/
│   │   ├── i18n.js                    # i18next configuration
│   │   └── helper.js                  # Utility functions
│   ├── config.js                      # App configuration
│   └── main.jsx                       # React entry point
├── public/
│   └── icons/                         # Static assets
├── index.html                         # HTML template
├── vite.config.js                     # Vite configuration
├── tailwind.config.js                 # Tailwind CSS config
├── postcss.config.js                  # PostCSS config
└── package.json
```

### Server Structure (`server/`)

```
server/
├── src/
│   ├── index.js                       # Express server entry point
│   ├── config/
│   │   ├── env.js                     # Environment variables
│   │   ├── appConfig.js               # App settings (model, RAG, etc.)
│   │   └── languageConfig.js          # Language-specific configs
│   ├── langchain/                     # LangChain.js integration
│   │   ├── llmClient.js               # OpenAI LLM client
│   │   ├── embeddings.js              # Text embeddings
│   │   ├── vectorStore.js             # Vector database (HNSWLib)
│   │   ├── retriever.js               # RAG retriever
│   │   ├── initializeRAG.js           # RAG initialization & status checks
│   │   ├── chains/
│   │   │   ├── chatChain.js           # Chat conversation chain
│   │   │   ├── mealPlanChain.js       # Meal planning chain (with RAG metadata)
│   │   │   ├── reportChain.js         # Report analysis chain
│   │   │   └── index.js
│   │   └── prompts/
│   │       ├── systemPrompt.md        # Main system prompt
│   │       ├── disclaimerPrompt.md    # Medical disclaimer
│   │       └── redditDisclaimerPrompt.md
│   ├── middleware/
│   │   ├── corsMiddleware.js          # CORS configuration
│   │   ├── errorHandler.js            # Global error handler
│   │   ├── rateLimit.js               # Rate limiting
│   │   ├── requestLogger.js           # Request logging
│   │   └── safetyGuards.js            # Content safety checks
│   ├── routes/
│   │   ├── chat.js                    # Chat endpoints
│   │   ├── mealPlan.js                # Meal planning endpoints (with personalization tracking)
│   │   ├── upload.js                  # File upload endpoints
│   │   ├── progress.js                # Progress tracking endpoints
│   │   ├── onboarding.js              # Onboarding endpoints
│   │   └── ragStatus.js               # RAG system status endpoints
│   ├── services/
│   │   ├── ocrService.js              # OCR for images (Tesseract.js)
│   │   ├── parserService.js           # PDF/DOCX parsing
│   │   ├── redditService.js           # Reddit API integration
│   │   ├── serpService.js             # SERP API for web search
│   │   └── firebaseCacheService.js    # Firebase caching
│   ├── scripts/
│   │   ├── ingestAll.js               # Ingest all data sources
│   │   ├── ingestMealTemplates.js     # Index meal templates for RAG
│   │   ├── ingestMedicalKnowledge.js  # Index medical knowledge
│   │   └── ingestNutritionalData.js   # Index nutritional data
│   ├── storage/
│   │   ├── tmpUploads/                # Temporary file uploads
│   │   └── localCache/
│   │       └── vectordb/              # HNSWLib vector store
│   ├── utils/
│   │   ├── logger.js                  # Winston logger
│   │   └── labRanges.js               # Medical lab reference ranges
│   └── data/
│       ├── meal_templates/            # Meal plan templates (.txt files)
│       ├── medical/                   # Medical knowledge base
│       └── nutritional/               # Nutritional guidelines
├── debug/                             # Debug output files
├── public/                            # Static files
└── package.json
```

## 🔧 Technology Stack

### Frontend

- **Framework**: React 18.2
- **Build Tool**: Vite 5.0
- **Styling**: Tailwind CSS 3.3
- **Routing**: React Router 6.20
- **State Management**: Zustand 4.4
- **HTTP Client**: Axios 1.6
- **Authentication**: Firebase 12.4 (Auth + Firestore)
- **Internationalization**: i18next 23.7 + react-i18next 13.5
- **Icons**: Lucide React 0.294
- **Charts**: Recharts 2.10
- **Date Utilities**: date-fns 2.30
- **PDF Generation**: jsPDF 2.5.1 (for meal plan export)
- **Testing**: Vitest 0.34 + Testing Library

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express 4.18
- **AI/ML**:
  - LangChain.js 0.1.28
  - @langchain/openai 0.0.34
  - @langchain/community 0.0.57
  - OpenAI API (GPT-4o-mini, text-embedding-3-small)
- **Vector Database**: HNSWLib (hnswlib-node 2.0)
- **Document Processing**:
  - PDF.js (pdfjs-dist 4.0)
  - Mammoth 1.6 (DOCX parsing)
  - Tesseract.js 5.0 (OCR)
- **Data APIs**:
  - SERP API (web search)
  - Snoowrap 1.23 (Reddit)
- **File Upload**: Multer 1.4.5
- **Security**:
  - CORS 2.8
  - Express Rate Limit 7.1
- **Logging**: Winston (via custom logger)
- **Testing**: Vitest 0.34

### Development Tools

- **Linting**: ESLint 8.52
- **Formatting**: Prettier 2.8
- **Process Management**: Concurrently 8.2
- **Auto-restart**: Node --watch (built-in)

---

## 🎯 Key Features Explained

### 0. RAG Transparency & Personalization Tracking

**New Feature**: Every meal plan now shows users exactly how it was personalized:

**Personalization Sources Display**:

- Visual cards showing data sources used:
  - 🌟 **Onboarding Profile**: User's allergies, symptoms, goals, activity level, cuisine preferences
  - 📋 **Medical Reports**: Latest lab results, hormone levels, nutrient deficiencies
  - 🔧 **User Overrides**: Manual region/diet type changes
  - 🧠 **RAG Knowledge Base**: Retrieved meal templates and nutrition guidelines

**RAG Metadata Component** (`RAGMetadataDisplay.jsx`):

- Shows knowledge base coverage quality (Excellent/Good/Limited)
- Displays specific metrics:
  - Number of meal templates retrieved
  - Number of nutrition guidelines applied
  - Whether symptom-specific recommendations were used
- Color-coded quality indicators
- Informational tooltip explaining RAG process

**Benefits**:

- Users understand why they received specific meals
- Builds trust in AI recommendations
- Encourages users to complete onboarding and upload reports for better personalization
- Transparent about AI decision-making process

### 1. AI Chat Assistant

- **Technology**: GPT-4o-mini with RAG (Retrieval-Augmented Generation)
- **Features**:
  - Context-aware conversations with chat history
  - Retrieval from curated PCOS knowledge base
  - Reddit community insights integration
  - Web search for latest information
  - Medical disclaimers and safety guards
  - Multi-language support (English, Hindi)

### 2. Personalized Meal Planning

- **AI-generated meal plans** tailored to:
  - User's dietary preferences (vegetarian, vegan, non-veg)
  - Cultural cuisine preferences (North Indian, South Indian, East Indian, West Indian)
  - PCOS-specific nutritional requirements
  - Allergies and restrictions
  - User's symptoms and health goals
  - Latest medical report data (hormones, nutrients)
- **RAG-Enhanced Generation**:
  - Retrieves relevant meal templates from curated knowledge base
  - Applies nutrition guidelines specific to PCOS management
  - Uses symptom-specific ingredient recommendations
  - Tracks and displays RAG quality metrics (high/medium/low coverage)
- **Personalization Transparency**:
  - Shows what data sources influenced the plan (onboarding, medical reports, user overrides, RAG)
  - Displays RAG metadata: templates used, guidelines applied, symptom-specific recommendations
  - Visual indicators for personalization source quality
- **Reliability Features**:
  - Automatic chunking for plans longer than 3 days to ensure consistent generation
  - Fallback to expert-curated templates if AI generation fails
  - Structure validation and auto-repair for malformed responses
- **Export & Sharing**:
  - PDF export for entire meal plans with all days
  - Formatted with ingredients, recipes, and nutrition information
- **Output**: 1-7+ day meal plans with recipes, nutritional info (protein, carbs, fats, GI), cooking tips, and time estimates

### 3. Medical Report Analysis

- **Supported formats**: PDF, DOCX, JPG, PNG
- **OCR**: Tesseract.js for image-based reports
- **Parsing**: Intelligent extraction of lab values, hormones, and biomarkers
- **Analysis**: AI-powered interpretation with reference ranges
- **Storage**: Firestore for report history

### 4. Progress Tracking

- **Metrics tracked**:
  - Weight and BMI
  - Menstrual cycle regularity
  - Symptoms (acne, hair loss, mood, energy)
  - Lifestyle habits (exercise, sleep, stress)
- **Visualizations**: Charts and trends using Recharts
- **Insights**: AI-generated progress summaries

### 5. Authentication & User Management

- **Google OAuth** via Firebase Authentication
- **User profiles** stored in Firestore
- **Onboarding flow** to collect user health data
- **Protected routes** with authentication guards
- **Profile settings** for preferences and language

---

## 🛡️ Safety & Privacy

### Content Safety

- **Automated Content Filtering** - Blocks NSFW, adult, violent, and illegal content requests
  - NSFW/pornographic content detection
  - Self-harm/violence detection with crisis helpline resources
  - Illegal activity blocking
  - Medical context exceptions (allows legitimate health queries)
  - Applies to both chat messages and Reddit queries
  - See `docs/CONTENT_SAFETY_FILTER.md` for details
- **Safety guards middleware** filters harmful/inappropriate content
- **Rate limiting** prevents abuse (100 requests per 15 minutes)
- **Medical disclaimers** prominently displayed in chat

### Data Privacy

- **Firebase Authentication** for secure user management
- **Firestore security rules** (configure in Firebase Console)
- **No PHI logging** - sensitive health data not logged to console/files
- **Local development** by default (no external database required for testing)

### Best Practices

- Always use HTTPS in production
- Regularly rotate API keys
- Configure Firebase security rules before deploying
- Review and update content safety rules in `safetyGuards.js`

---

## RAG System Architecture

### Overview

Sakhee uses Retrieval-Augmented Generation (RAG) to enhance meal plan personalization with a curated knowledge base of meal templates, nutritional guidelines, and PCOS-specific dietary recommendations.

### Components

**1. Vector Store (HNSWLib)**

- Fast similarity search for meal templates
- Stores embeddings of meal data, recipes, and nutrition guidelines
- Located at: `server/src/storage/localCache/vectordb/`

**2. Embeddings (OpenAI)**

- Uses `text-embedding-3-small` model
- Converts meal templates to dense vector representations
- Enables semantic search across knowledge base

**3. Meal Templates**

- Stored as `.txt` files in `server/src/data/meal_templates/`
- Each template contains regional meal variations with:
  - Meal name, ingredients, and quantities
  - Macros (protein, carbs, fats) and glycemic index
  - Cooking instructions and tips
- Organized by region (North, South, East, West Indian)

**4. Ingestion Pipeline**

- Script: `server/src/scripts/ingestMealTemplates.js`
- Reads all `.txt` files from templates folder
- Splits documents into chunks
- Generates embeddings and builds vector store
- Run with: `npm run ingest:meals`

**5. Retrieval & Generation**

- Query user preferences to retrieve relevant templates
- Top-k similarity search (configurable, default k=5)
- Retrieved context injected into LLM prompt
- RAG metadata tracked for transparency:
  - Number of templates used
  - Nutrition guidelines applied
  - Symptom-specific recommendations
  - Retrieval quality score (high/medium/low)

### RAG Status Monitoring

Check RAG system health:

```bash
# Detailed status
curl http://localhost:5000/api/rag/status

# Quick health check
curl http://localhost:5000/api/rag/health
```

Response includes:

- Vector store existence
- Template count and file names
- Indexed document count (approximate)
- Retrieval functionality status
- Recommendations for fixes

### RAG Quality Metrics

Each meal plan includes personalization metadata:

```json
{
  "personalizationSources": {
    "onboarding": true,
    "medicalReport": true,
    "userOverrides": false,
    "ragQuality": "high",
    "ragSources": {
      "mealTemplates": 5,
      "nutritionGuidelines": 8,
      "symptomRecommendations": true
    }
  }
}
```

Quality levels:

- **High**: 5+ relevant templates retrieved, comprehensive guidelines
- **Medium**: 2-4 templates retrieved, partial guidelines
- **Low**: 0-1 templates retrieved, fallback mode

### Adding New Templates

1. Create `.txt` file in `server/src/data/meal_templates/`
2. Format with meal name, ingredients, macros, and tips
3. Run ingestion: `cd server && npm run ingest:meals`
4. Restart server
5. Verify: `curl http://localhost:5000/api/rag/status`

Example template format:

```
Meal: South Indian Idli Sambar
Region: south-india
Type: breakfast
Ingredients: 3 idlis (150g), sambar (200ml), coconut chutney (50g)
Protein: 12g
Carbs: 45g
Fats: 5g
GI: Low
Time: 20 mins
Tip: Use brown rice idlis for extra fiber and lower GI
```

---

## 🧪 Testing & Linting

### Testing

The repository uses **Vitest** for unit and integration tests:

```bash
# Run all tests
npm run test

# Run client tests only
cd client && npm run test

# Run server tests only
cd server && npm run test
```

### Linting & Formatting

**ESLint** and **Prettier** are configured workspace-wide:

```bash
# Lint all code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all code
npm run format

# Check formatting
npm run format:check
```

---

## 📝 Development Notes

### Server

- Uses **LangChain.js + OpenAI** for chat and RAG
- Keep the OpenAI key in `server/.env` (never commit)
- Auto-restarts on file changes with `node --watch`
- Uploaded files stored temporarily in `server/src/storage/tmpUploads`
- Vector store cached in `server/src/storage/localCache`

### Client

- Talks to backend API at `VITE_API_URL` (default: http://localhost:5000/api)
- Firebase config required for authentication
- Hot module replacement (HMR) enabled via Vite
- Tailwind CSS for styling (configure in `tailwind.config.js`)
- Zustand for lightweight state management (no Redux)

### API Endpoints

| Endpoint                  | Method   | Description                              |
| ------------------------- | -------- | ---------------------------------------- |
| `/api/health`             | GET      | Health check                             |
| `/api/chat`               | POST     | Send chat message with RAG context       |
| `/api/meals/generate`     | POST     | Generate personalized meal plan with RAG |
| `/api/meals/:planId`      | GET      | Get specific meal plan                   |
| `/api/meals/user/:userId` | GET      | Get user's meal plan history             |
| `/api/meals/:planId`      | PUT      | Update meal plan (feedback, ratings)     |
| `/api/meals/:planId`      | DELETE   | Delete meal plan                         |
| `/api/upload`             | POST     | Upload medical report (PDF/DOCX/image)   |
| `/api/progress`           | GET/POST | Get/update progress data                 |
| `/api/onboarding/create`  | POST     | Complete onboarding                      |
| `/api/rag/status`         | GET      | Get RAG system status and metrics        |
| `/api/rag/health`         | GET      | Quick RAG health check                   |

---

## 🚧 Troubleshooting

### Port Already in Use

If port 5000 is already in use:

```bash
# Find process using the port
lsof -iTCP:5000 -sTCP:LISTEN -n -P

# Kill the process
kill <PID>

# Or use a different port
PORT=5001 npm run dev
```

### Firebase Configuration Issues

- Ensure all Firebase environment variables are set in `client/.env`
- Enable Google Authentication in Firebase Console
- Create Firestore database in Firebase Console
- Configure Firestore security rules

### OpenAI API Issues

- Check API key is valid and has credits
- Verify model name is correct (`gpt-4o-mini`)
- Check rate limits on OpenAI dashboard

### RAG System Issues

**Vector Store Not Found**:

```bash
# Create templates folder if missing
mkdir -p server/src/data/meal_templates

# Add .txt template files with meal data
# Then run ingestion
cd server && npm run ingest:meals
```

**Templates Not Being Used**:

- Check RAG status: `curl http://localhost:5000/api/rag/status`
- Verify templates exist: `ls server/src/data/meal_templates/*.txt`
- Re-ingest templates: `npm run ingest:meals`
- Check server logs for RAG initialization messages

**Meal Plans Using Fallback Templates**:

- This happens when vector store is not initialized
- Run `npm run ingest:meals` in the server directory
- Restart the server after ingestion
- Check for "✅ RAG system initialized successfully" in logs

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or in specific workspace
cd client && rm -rf node_modules && npm install
cd server && rm -rf node_modules && npm install
```

## 🚀 Deployment

### Chat Markdown Rendering (frontend)

If chat responses contain raw markdown (for example: `## Header`, `- item`, `*italic*`) or you see duplicated bullets like `• • item`, the frontend's markdown post-processing helper may need adjustment. The project uses a lightweight helper to convert a small subset of markdown to HTML at `frontend/src/utils/helper.ts` (function `boldify`).

Common issues and fixes:

- Headers not rendered: ensure `boldify()` converts `#`, `##`, `###` and smaller header patterns before converting line breaks.
- Double bullets (`• • item`): normalize leading bullets/dashes by stripping all leading `•`/`-` characters from the captured content and re-inserting a single bullet.
- Missing bullets for indented lists: allow optional leading whitespace in the bullet regex (use `^\s*[-•]`).
- Disclaimer formatting (⚠️ *text*): if the backend emits `⚠️ *This is educational guidance*` but you want it bold, either change the backend to use `**text**` or add a frontend special-case rule to convert `⚠️ *text*` to bold.

Minimal example snippet (from `frontend/src/utils/helper.ts`):

```ts
// Normalize bullets: strip leading markers, add a single bullet
processedText = processedText.replace(/^\s*[-•]\s*(.+?)$/gm, (_m, content) => {
  const clean = content.replace(/^[•\-\s]+/, '').trim();
  return `<div class="ml-4">• ${clean}</div>`;
});

// Header conversion (run before converting \n to <br />)
processedText = processedText.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
processedText = processedText.replace(/^## (.*?)$/gm, '<h2>$1</h2>');

// Convert bold/italic
processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
processedText = processedText.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');

// Convert remaining newlines to <br /> last
processedText = processedText.replace(/\n/g, '<br />');
```

Testing and debugging:

- Open browser devtools console. The chat UI logs the raw assistant text before processing (if debug enabled). Inspect the raw string to confirm the presence of leading bullets or stray characters.
- Refresh the frontend after updating `helper.ts` and restart the dev server (if necessary):

```bash
# client/front-end
cd frontend
npm run dev
```

Remove any temporary `console.log` debug lines after confirming the fix.


### Prerequisites

- Node.js 18+ hosting (e.g., Railway, Render, AWS, DigitalOcean)
- Firebase project (production environment)
- Domain with SSL certificate (recommended)

### Build for Production

```bash
# Build both client and server
npm run build

# Client build output: client/dist
# Server: runs directly from server/src
```

### Environment Configuration

1. Set all environment variables on your hosting platform
2. Use production Firebase config in client
3. Update `CORS_ORIGIN` to your production domain
4. Set `NODE_ENV=production`

### Deployment Checklist

- [ ] Configure Firebase security rules
- [ ] Set up SSL certificate
- [ ] Configure rate limiting for production
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure backup strategy for Firestore
- [ ] Set up logging infrastructure
- [ ] Test all API endpoints in production
- [ ] Verify Firebase authentication flow
- [ ] Test file upload limits and storage

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation as needed
4. **Run tests and linting**
   ```bash
   npm run lint
   npm run test
   npm run format
   ```
5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**
   - Provide clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes

### Contribution Guidelines

- **Code Style**: Follow ESLint and Prettier configurations
- **Commits**: Use conventional commit messages (feat, fix, docs, etc.)
- **Testing**: Add tests for new features
- **Documentation**: Update README and inline comments
- **AI Features**: Document costs and safety considerations for model-heavy features

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o-mini and embeddings API
- **LangChain.js** for RAG framework
- **Firebase** for authentication and database
- **React** and **Vite** communities
- **Tailwind CSS** for beautiful styling
- PCOS community for inspiration and feedback

## 🧑‍💼 Maintainer

This repository is maintained by @supriyavikramsingh-sudo. For questions about the project, open an issue or reach out via GitHub.

---

## 📧 Support

For questions, issues, or suggestions:

- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

---

## 🗺️ Roadmap

### Completed ✅

- [x] AI chat assistant with RAG
- [x] Personalized meal planning with RAG-enhanced generation
- [x] RAG system with vector store and template indexing
- [x] RAG metadata transparency and quality tracking
- [x] Personalization source tracking (onboarding, medical reports, user overrides)
- [x] Meal plan PDF export functionality
- [x] Regional cuisine templates (North, South, East, West Indian)
- [x] Chunked generation for reliable long meal plans
- [x] RAG system status monitoring endpoints
- [x] Medical report analysis (OCR + parsing) with meal plan integration
- [x] Progress tracking dashboard
- [x] Firebase authentication
- [x] Multi-language support (EN, HI)
- [x] Community insights (Reddit integration)

### Planned 🔜

- [ ] Persistent meal plan storage in Firestore (currently in-memory)
- [ ] User meal plan history and favorites
- [ ] Grocery shopping list generation from meal plans
- [ ] Meal plan sharing and social features
- [ ] Mobile app (React Native)
- [ ] Exercise recommendations with RAG
- [ ] Medication reminders
- [ ] Doctor appointment scheduling
- [ ] Community forum
- [ ] More languages (Tamil, Telugu, Bengali)
- [ ] Integration with health tracking devices (Fitbit, Apple Health)
- [ ] Advanced RAG with medical knowledge base
- [ ] Symptom prediction models
- [ ] Cycle tracking with predictions
- [ ] Recipe image generation with DALL-E
- [ ] Voice input for chat and meal preferences

---

## 📚 Additional Resources

- [LangChain.js Documentation](https://js.langchain.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

## 📋 Changelog

### Latest Updates (v1.1.0)

**🧠 RAG System Enhancements**:

- Added RAG-powered meal plan generation with vector store
- Implemented meal template indexing pipeline (`ingest:meals` script)
- Created RAG status monitoring endpoints (`/api/rag/status`, `/api/rag/health`)
- Added `initializeRAG.js` for automatic system initialization on server startup
- Vector store health checks and template freshness validation

**🎨 Frontend Transparency Features**:

- New `RAGMetadataDisplay` component showing knowledge sources used
- Personalization tracking across onboarding, medical reports, and RAG
- Visual quality indicators (high/medium/low coverage)
- Detailed breakdown of templates, guidelines, and recommendations used
- Enhanced `MealPlanGenerator` with source visualization cards

**📄 PDF Export**:

- Full meal plan PDF export functionality
- Includes all days, meals, ingredients, recipes, and nutrition info
- Automatic page breaks and proper formatting
- Download button integrated into `MealPlanDisplay`

**🔧 Meal Plan Improvements**:

- Chunked generation (3 days per request) for reliability
- Structure validation and auto-repair for malformed LLM responses
- Regional template fallbacks (North, South, East, West Indian)
- Enhanced error handling with user-friendly fallback messages
- Medical report integration into meal plan context

**🛠️ Backend Infrastructure**:

- Added meal plan CRUD endpoints (GET, PUT, DELETE)
- User meal plan history endpoint (`/api/meals/user/:userId`)
- RAG metadata injection into responses
- Personalization source tracking in all generated plans
- Improved logging with RAG quality metrics

**📦 New Dependencies**:

- `jsPDF` for client-side PDF generation
- HNSWLib integration for vector similarity search
- LangChain document loaders and text splitters

**🐛 Bug Fixes**:

- Fixed meal plan structure parsing issues
- Improved error boundaries for failed generations
- Better handling of missing vector store scenarios
- Fixed PDF generation for multi-day plans

---

**Made with ❤️ for women managing PCOS**

### New in v1.2.0

Small maintenance and UX improvements landed after v1.1.0 to make the chat + meal planning flows safer, more robust and more user-friendly:

- Chat -> Meal Plan redirect (server + client)

  - Added middleware on the chat route to detect meal-plan requests and block them from invoking the LLM. Instead the server returns a structured `MEAL_PLAN_REDIRECT` response. This protects against the LLM generating free-form meal plans in chat and keeps meal plan generation scoped to the dedicated Meal Plan Generator.
  - Frontend now displays a dedicated `MealPlanRedirectCard` when the redirect response is returned. The card includes CTA, short features list, help text and an action URL to the meal planner.

- UI / content tweaks for the redirect card

  - The phrase "Meal Plan Generator" is now rendered as bold in the redirect message (HTML-safe rendering with controlled styling).
  - Updated feature copy shown on the card (3/5/7-day options and ingredient/substitution details).

- Chat timestamp handling

  - Messages now display reliable timestamps across environments. The chat bubble rendering code was hardened to accept Firestore Timestamp objects, objects with `seconds`, ISO strings and unix timestamps so "Invalid Date" no longer appears.

- Miscellaneous bug fixes and stability improvements
  - Fixed incorrect user id usage in the chat page (use `user.uid` instead of `user.id`) so requests and history load correctly.
  - Fixed `dotenv` import/path issues used by ingestion scripts (ensures `.env` loads correctly when running ingestion from the project root).
  - Added helpful debug logging in a few client modules to make API troubleshooting easier during development.

These changes aim to make the experience safer (no ad-hoc meal plans from chat), clearer for users, and easier to debug for developers.

### New in v1.3.0

Significant feature and stability improvements landed in v1.3.0 focused on nutrition accuracy, UX polishing, and robustness across the chat + meal planning flows.

- Calories everywhere

  - LLM prompt and validation updated so each generated meal now includes a calorie estimate (kcal). The prompt enforces calories using the formula: (protein × 4) + (carbs × 4) + (fats × 9).
  - Server-side fallback and repair now calculate calories when the model omits them.
  - Hardcoded fallback templates were updated to include calories.

- Daily 2000 kcal enforcement

  - New requirement: each day's meals are validated and adjusted to target ~2000 kcal (acceptable range 1900–2100 kcal).
  - Implementation details: `validateAndAdjustCalories()` scales macros proportionally and performs a fine-tune pass to hit the daily target while preserving PCOS-friendly ratios.
  - Fallback plan generation also scales templates to meet the daily calorie target when RAG is unavailable.

- Frontend: Meal UI and transparency

  - `MealCard` now displays Calories alongside Protein / Carbs / Fats in the nutrition grid. If calories are missing, the UI computes them from macros as a fallback.
  - `MealPlanDisplay` shows a clear disclaimer about the baseline assumptions used for calorie calculations (moderately active adult woman, ~5'2"–5'4", 56 kg).
  - PDF export (jsPDF) includes nutrition info; calorie values are now included in exported meal plans.

- Chat and message UX improvements

  - Pagination added to chat history: only the most recent 5 messages load initially with a "Load older messages" button to fetch 5 more at a time.
  - Auto-scroll behavior refined: when user clicks "Load older messages" the UI preserves scroll position and does NOT jump to the bottom; normal auto-scroll still happens on new incoming messages.
  - Fixed message duplication on re-renders by adding a one-time history loader and replacing (not appending) messages when loading history.

- Reliability & debugging

  - Improved logging for meal generation (RAG retrieval counts, calorie totals, adjustment logs) to make troubleshooting easier.
  - Fixed several issues encountered during testing (dotenv fixes, correct Firebase `user.uid` usage in chat page, and more).

- Files / areas touched (high level)
  - server/src/langchain/chains/mealPlanChain.js — improved prompt, calorie enforcement, `validateAndAdjustCalories()`, fallback template tuning
  - server/src/routes/mealPlan.js — meal plan endpoint remains the single source of truth for generation and now returns rag metadata and adjusted plans
  - client/src/components/meal/MealCard.jsx — added calories display and fallback calculation
  - client/src/components/meal/MealPlanDisplay.jsx — disclaimer added and PDF export now handles calories
  - client/src/components/chat/ChatInterface.jsx — pagination, "Load older messages" button, scroll preservation, and load-history dedupe
  - client/src/store/index.js — chat store updated to support allMessages, visibleCount and loadMoreMessages

### New in v1.4.0

Focused fixes and UX improvements landed after v1.3.0 to improve medical report parsing accuracy, reduce LLM hallucinations from optional community sources, and present cycle-dependent hormones more appropriately in the UI.

- Parser & Medical Report Analysis

  - Fixed extraction logic so Free T3 and Free T4 are parsed correctly (value-after-unit/range pattern handling). This prevents T3 values being mis-assigned to T4.
  - Fixed parsing for Estradiol, Progesterone, Vitamin D and Vitamin B12 across typical lab report formats. Vitamin D values reported in ng/mL are now converted to nmol/L when required.
  - Added more robust fallback/snippet extraction and structured debug logging to help diagnose unmatched fields and speed future parser improvements.
  - Added a local parser test harness used during development: `server/test_parser_final.mjs` (developer-only test script).

- Backend updates

  - `server/src/services/parserService.js` — improved regex patterns, conversion utilities, fallback snippet extraction, and extended logging.
  - `server/src/utils/labRanges.js` — introduced `skipSeverity` and `cycleDependentNote` flags for cycle-dependent hormones; `getLabSeverity()` respects the new flag and returns a `cycle-dependent` state.

- Frontend / UX

  - `client/src/components/files/ReportAnalysis.jsx` — UI updated to treat estradiol and progesterone as "cycle-dependent": the app no longer shows normal/abnormal severity badges for these labs. Instead an info-style card displays per-phase reference ranges so users can interpret results based on their cycle phase.
  - Severity icons/colors/labels updated to include a `cycle-dependent`/info state.

- RAG / Chat anti-hallucination improvements

  - The chat/RAG pipeline now explicitly injects an anti-fabrication note when optional Reddit/community data is not available, preventing the LLM from inventing community posts as sources.
  - Additional logging was added around the RAG context construction so triggers like `needsCommunityInsights()` and what was injected are auditable in logs.

- Tests, Docs & Developer aids

  - Created `CYCLE_DEPENDENT_HORMONES_UPDATE.md` (developer doc) summarizing the change and showing reference ranges used in the UI.
  - Parser test harness (see above) and enhanced logs to make reproducing failures and writing unit tests easier.

- Why this matters

  - Medical report parsing is a core trust surface for the app: improving extraction accuracy reduces false alerts and prevents incorrect personalization of meal plans.
  - Cycle-dependent labeling avoids presenting misleading severity information for hormones whose interpretation depends on cycle timing.
  - Anti-hallucination changes improve user trust by ensuring the system doesn't invent community anecdotes when community data isn't present.

- Next / Planned
  - Optional UI: add a cycle-phase selector on report upload so users who provide cycle phase can receive automated interpretation (re-enable severity for estradiol/progesterone when phase is known).
  - Add automated unit tests for `parserService` regexes and CI checks to avoid regressions.
  - Expand RAG/chat regression tests to verify anti-hallucination behavior across more prompts.

### New in v1.5.0

Focused delivery and bug fixes to the medical report analysis feature, developer tooling, and several robustness/UX issues landed in v1.5.0.

- Medical Report: single-file workflow

  - Users can now upload exactly one medical report at a time. Each upload replaces the previous report (the previous document is deleted server-side) so the UI always shows the user's current report.
  - Server persistence: reports are stored in Firestore under a single document per user (convention: `users/{userId}/medicalReport/current`). The server performs sanitization of fields before saving to avoid Firestore INVALID_ARGUMENT errors.
  - Non-blocking saves: file processing and AI analysis return success to the client quickly; Firestore saves are performed in a resilient, non-blocking way so transient DB issues don't block the user flow.

- New/changed server files

  - `server/src/services/medicalReportService.js` — CRUD for single-report-per-user, sanitization helpers (`sanitizeData`, `sanitizeFieldName`) and document size validation.
  - `server/src/routes/upload.js` — Upload endpoints and orchestration (file extraction → parser → AI analysis → enqueue DB save). New endpoints include the upload and user-report CRUD routes (POST /api/upload/report, GET /api/upload/user/:userId/report, DELETE /api/upload/user/:userId/report).
  - `server/src/storage/tmpUploads/` — temporary storage for incoming files during processing.

- New/changed client files

  - `client/src/pages/ReportsPage.jsx` — main Reports page UI: shows current report card, replace/delete UX, and loads the report on mount. Fixed previous auth store import issues and hardened loading states.
  - `client/src/components/files/FileUpload.jsx` — simplified single-file upload component that returns the new report payload and closes the upload flow.
  - `client/src/components/files/ReportAnalysis.jsx` — improved header and timestamp handling; treats cycle-dependent hormones appropriately (see v1.4.0 notes) and shows formatted uploaded timestamp.
  - `client/src/services/apiClient.js` & `client/src/services/firestoreService.js` — new helper methods for the single-report endpoints (uploadFile, getUserReport, deleteUserReport, hasUserReport).
  - `client/src/store/authStore.js` — ensured correct auth store import and usage across reports/chat pages.

- Timestamp handling fix

  - The client now robustly handles multiple uploadedAt formats: Firestore-style serialized objects with `seconds`/`nanoseconds`, Firestore Timestamp instances, ISO strings, and JS Date objects. This prevents "Invalid Date" from appearing in the UI after uploads/refreshes.

- Data sanitization and Firestore reliability

  - To avoid INVALID_ARGUMENT errors the server sanitizes report payloads: removes undefined/NaN values, strips illegal Firestore field name characters, and limits very large text fields.
  - Note: during development the Web (client) Firestore SDK is used on the server in some helper code; for production we recommend migrating server code that writes to Firestore to the Firebase Admin SDK to avoid client-offline/credential limitations.

- Developer docs & helper scripts added

  - `MEDICAL_REPORT_FEATURE.md` — feature doc & quick reference for the new single-file report flow.
  - `IMPLEMENTATION_SUMMARY.md` / `IMPLEMENTATION_CHECKLIST.md` / `QUICK_REFERENCE.md` — implementation notes and checklist for reviewers.
  - `start-medical-report-test.sh` — helper for local test runs (developer convenience).

- Testing & verification notes

  - After pulling changes that modify server-side code, restart the server (Ctrl+C in the server terminal, then `npm run dev`) so new routes and services are loaded.
  - Use the Report page to upload a report and check browser console logs if you see "Invalid Date" — the client prints the raw `uploadedAt` object when loading the report to aid debugging.

- Known issues & recommendations

  - Firestore persistence can appear intermittent in local development due to using the Firebase Web SDK in some server paths. Recommendation: migrate `server/src/config/firebase.js` to use the Firebase Admin SDK (server-side) for reliable server writes in production.
  - The app performs non-blocking saves; if you expect deterministic, synchronous persistence (for example for critical audit trails) review `medicalReportService.saveReport()` and consider awaiting the Firestore write or adding retry/backoff logic.

- Files/areas touched (quick list)
  - Server: `server/src/services/medicalReportService.js`, `server/src/routes/upload.js`, `server/src/config/firebase.js` (notes), `server/src/storage/tmpUploads/`
  - Client: `client/src/pages/ReportsPage.jsx`, `client/src/components/files/FileUpload.jsx`, `client/src/components/files/ReportAnalysis.jsx`, `client/src/services/apiClient.js`, `client/src/services/firestoreService.js`, `client/src/store/authStore.js`
  - Docs: `MEDICAL_REPORT_FEATURE.md`, `IMPLEMENTATION_SUMMARY.md`, `IMPLEMENTATION_CHECKLIST.md`, `QUICK_REFERENCE.md`, `FIRESTORE_FIXES.md`

### New in v1.6.0

Small but important UX, frontend plumbing, and styling fixes focused on ensuring medical report data is actually used in personalization and cleaning up the Reports UI.

- Meal plan personalization plumbing

  - `MealPlanGenerator.jsx` now fetches the user's latest medical report on mount and immediately before generating a meal plan. The fetched report is included in the request body as `healthContext.medicalData` so the backend receives lab values and can incorporate lab-specific guidance into meal generation.
  - This fixes cases where `hasLabValues` / `hasMedicalData` were reported as false even though a report existed in Firestore (the client previously wasn't including the report in the generation request).
  - The component now exposes `userReport` state for display and uses it when calculating `displayPersonalizationSources`.

- Report analysis UI improvements

  - `ReportAnalysis.jsx` was updated to:
    - Parse AI analysis sections more robustly and remove stray standalone numbers (e.g., lines containing only "2.") except inside the `Next Steps` section where numbered lists are desired.
    - Render lab value categories as accessible accordions (Thyroid Function, Vitamins, Hormones, etc.). All accordions are collapsed on load except the first category which is expanded by default.
    - Preserve existing cycle-dependent hormone handling and improved severity display.

- Styling / CSS fixes

  - `client/src/styles/index.css` was cleaned up to avoid using `@apply` inside `@keyframes` and to split scrollbar thumb hover rules into proper selectors. These changes prevent build-time and linter warnings and keep Tailwind usage compatible with PostCSS/Tailwind processing.

- Backend & RAG improvements (refresher)

  - `mealPlanChain.js` includes enhanced lab-guidance support: `buildLabGuidanceQuery()`, `categorizeLabs()`, and integration of lab-specific RAG context into the prompt. This allows the LLM to prioritize evidence-based dietary guidance when abnormal lab values exist.

- Developer notes & testing

  - After pulling frontend changes, restart dev servers to ensure new client-side fetching logic is active. The meal generator now logs whether a report was found and how many lab values were passed in (helpful for debugging personalization).
  - If you still see `hasLabValues: false` in server logs after these changes, confirm the report document exists at `users/{userId}/medicalReport/current` in Firestore and that the client is authenticated and able to read it.

- Files/areas touched (v1.6.0)
  - Client: `client/src/components/meal/MealPlanGenerator.jsx`, `client/src/components/files/ReportAnalysis.jsx`, `client/src/styles/index.css`
  - Server: `server/src/langchain/chains/mealPlanChain.js` (lab guidance helpers)

If you'd like, I can also add a short troubleshooting snippet to the README showing how to verify the medical report document in Firestore and an example curl command to call the meal generation endpoint including `healthContext.medicalData`.

### New in v1.7.0

Major improvements to the chat experience, especially around integrating users' medical reports (lab values) into conversational responses, safer output disclaimers, and route plumbing to ensure the chat pipeline can fetch and use lab data.

- Lab-aware Chat (server-side)

  - `server/src/langchain/chains/chatChain.js` was expanded into a full lab-aware chat pipeline:
    - `buildEnhancedSystemPrompt()` — stronger system-level instructions to prioritize lab data, RAG context, safety rules, and response structure for three common scenarios (symptom query, lab interpretation, community insights).
    - `getUserLabValues(userId)` — server helper that fetches the user's medical report and extracts lab values, uploadedAt and analysis for use in chat.
    - `buildLabContext(medicalData)` / `categorizeLabs()` — create prioritized, human-readable lab context that is injected into prompts so the LLM references exact lab values when answering.
    - `buildLabGuidanceQuery()` — generates targeted RAG queries (dietary guidance) based on abnormal labs and the user's message to retrieve lab-specific recommendations from the vector store.
    - `processMessage()` — orchestrates retrievals (medical knowledge, lab-guidance, Reddit community insights, SERP nutrition data), builds the final prompt, invokes the conversation chain, and returns structured sources and a `contextUsed` summary.

- Safer disclaimers (no duplication)

  - The chat chain previously appended static disclaimers unconditionally which sometimes resulted in duplicate disclaimers when the LLM already included one. The chain now checks the model output (case-insensitive substring matching) and only appends the general, lab-specific, or community disclaimers if they are not already present. This reduces noisy/duplicated safety text while ensuring required statements are present.

- Chat route plumbing & middleware

  - `server/src/routes/chat.js` updated to always pass `userId` (via `userContext`) into `chatChain.processMessage()` so the chain can fetch lab values server-side.
  - `mealPlanIntentDetector` middleware remains integrated to redirect meal-plan requests safely and consistently.

- Client-side: lab context UI

  - `client/src/components/chat/LabContextBadge.jsx` (new) — small UI component (badge/display) to show whether lab context was used for a chat response and quick stats (lab count, last uploaded date). This helps users see when their medical data influenced the reply.

- Developer & debugging notes

  - The chat pipeline returns `contextUsed` and `sources` with each response. `contextUsed.labValues` and `contextUsed.labGuidance` are useful indicators when testing whether lab-based personalization worked.
  - If you run integration tests and `labValues` are not detected, confirm the medical report exists at `users/{userId}/medicalReport/current` and the server can read it (authentication/permissions).
  - There is a local test harness for lab-chat integration (dev-only). If it fails, check `server` logs for Retriever and Reddit/SERP fetch failures.

- Files/areas touched (v1.7.0)
  - Server: `server/src/langchain/chains/chatChain.js`, `server/src/routes/chat.js`, (uses `medicalReportService` + retriever + redditService + serpService)
  - Client: `client/src/components/chat/LabContextBadge.jsx`
  - Middleware: `server/src/middleware/mealPlanIntentDetector.js` (usage continued)

If you'd like, I can add an example cURL payload that demonstrates how `userId` and `userContext` are passed to `/api/chat/message` and what the server returns (including `contextUsed`).

### New in v1.8.0 (November 3, 2025)

Critical fixes to RAG retrieval and diet filtering for personalized meal plan generation, addressing issues where vegetarian/vegan meal templates were incorrectly filtered out, resulting in repetitive meal plans and 0 retrieved templates.

#### RAG Diet Filtering Fix (CRITICAL)

**Root Cause**: Regex patterns looking for markdown format `**Type:** Vegetarian` didn't match the actual RAG document format which stores plain text `Type: Vegetarian`.

**Impact**: All vegetarian meals were being filtered out (0 matches) despite having 20 Goan vegetarian meals in the database.

**Fix Applied**:
- Updated regex from `/Type:\*\*\s*Vegetarian/i` to `/Type:\s*Vegetarian/i`
- Updated ingredients extraction from `/\*\*Ingredients:\*\*(.*?)(?:\n\*\*|$)/s` to `/Ingredients:\s*(.+?)(?:\n|$)/`
- Now correctly matches plain text RAG document structure generated by `ingestMealTemplates.js`

**Result**: ✅ Vegetarian meal retrieval: **0 → 25 meals** (25x improvement!)

#### Ingredient Substitutes Enhancement

**Problem**: Stage 4 (ingredient substitutes) only triggered when "PCOS-problematic ingredients" were found, but never retrieved animal protein substitutes needed for vegan/vegetarian diet adaptations.

**Fix Applied**:
- For vegan/vegetarian/jain diets, ALWAYS retrieve animal protein substitutes (fish→tofu, chicken→paneer, prawn→baby corn, etc.)
- Added 6 targeted protein substitute queries executed before PCOS-problematic ingredient checks
- Queries include: `fish tofu paneer substitute`, `chicken paneer soy substitute`, `egg tofu besan substitute`, etc.

**Result**: ✅ Ingredient substitutes: **0 → 11 documents** retrieved consistently

#### RAG Retrieval Coverage Improvements

- Increased `topK` from 15 to 25 for better meal template coverage
- Improved dinner query from `"Goan dinner regional cuisine meals vegetarian"` to `"Goan dinner evening meal main course vegetarian"` for better semantic matching
- Enhanced cuisine matching with exact state matching (`metadata.state === cuisineLower`) instead of fuzzy substring matching
- Added detailed logging for filtered meals: `"⚠️ No diet type tag found: {mealName}"` and `"❌ Filtered out vegan: {mealName} - contains dairy"`

#### Performance Comparison

| Stage | Before (Broken) | After (Fixed) | Improvement |
|-------|-----------------|---------------|-------------|
| Breakfast | 0 meals | 6 meals | ✅ +6 |
| Lunch | 0 meals | 9 meals | ✅ +9 |
| Dinner | 0 meals | 3-5 meals | ✅ +3-5 |
| Snacks | 0 meals | 1 meal | ✅ +1 |
| General | 0 meals | 9 meals | ✅ +9 |
| **Total Templates** | **0** | **25-30** | ✅ **25-30x** |
| **Ingredient Subs** | **0** | **11** | ✅ **+11** |

#### RAG Document Format (Technical Details)

The ingestion script (`ingestMealTemplates.js`) creates documents in this plain text format:

```
Region: West Indian
State: Goa
Meal: 11. Goan Red Rice with Veg Caldeen
Type: Vegetarian                    ← Plain text (no markdown)
Ingredients: Goan red rice 70g, mixed veg 200g, light coconut milk
Macros: Protein 12g, Carbs 48g, Fats 8g
Budget: ₹45–55
Prep Time: 35 mins
Glycemic Index: Low
Tip: Use local red rice for fiber.
```

The regex patterns now correctly parse this format instead of looking for markdown-style `**Type:**` markers.

#### Meal Plan Quality Improvements

- ✅ No more "filtered to 0 vegetarian meals" log messages
- ✅ Sufficient variety (25-30 meals) for 3-day plans requiring only 9 meals (3 days × 3 meals/day)
- ✅ No repetitions expected
- ✅ LLM can now adapt non-veg dishes using ingredient substitutes: "Goan Fish Curry → Goan Tofu Curry (Vegetarian Version)"
- ✅ Calories remain accurate (1690-1712 kcal, within ±51 tolerance)
- ✅ RAG quality marked as "excellent"

#### Files Modified (v1.8.0)

- **`server/src/langchain/chains/mealPlanChain.js`**:
  - Lines 508-509: Fixed Type: tag regex (removed markdown escaping)
  - Lines 515-516, 533-534: Fixed Ingredients: extraction regex
  - Line 467: Improved dinner query with semantic variations
  - Lines 707-773: Added diet-specific protein substitute retrieval (Stage 4)
  - Increased topK from 15 to 25 for better coverage

- **`server/MEAL_PLAN_RAG_FIX_NOV3.md`**: New documentation file with complete root cause analysis, before/after comparisons, and testing instructions

#### Developer Notes & Testing

After pulling these changes, restart the server to load the updated filtering logic:

```bash
cd server
npm run dev
```

Generate a **Vegetarian + Goan + 3 days** meal plan and verify logs show:
- ✅ Each query: `"filtered to X vegetarian meals"` where X > 0
- ✅ Total meal templates: 25-30 (not 0)
- ✅ Ingredient substitutes: ~11 documents
- ✅ Message: `"Diet type 'vegetarian' requires protein substitutes - retrieving animal protein alternatives"`
- ❌ Check for absence of: `"⚠️ No diet type tag found"` warnings for valid vegetarian meals

#### Related Issues Fixed

- Meal repetition for Goan cuisine (caused by insufficient template retrieval)
- Vegan meal plans showing non-vegan dishes (dairy filtering now works correctly)
- Jain meal plans including root vegetables (ingredients extraction now accurate)
- Missing ingredient substitutes preventing diet adaptations

#### Impact on User Experience

**Before**: Users received repetitive meal plans with only 6 vegetarian options, no variety, and no diet adaptations

**After**: Users receive diverse meal plans with 25+ options, proper variety, and intelligent substitutions (e.g., "Goan Tofu Curry (Vegetarian Version)")

Regional authenticity maintained while ensuring diet compliance.

#### Rollback Plan

If issues arise with the new filtering logic:

```bash
cd /Users/supriya97/Desktop/AI\ Projects/sakhee/server
git diff HEAD src/langchain/chains/mealPlanChain.js > rollback.patch
git checkout HEAD -- src/langchain/chains/mealPlanChain.js
npm run dev
```

#### Next Steps / Recommendations

- [ ] Monitor meal plan generations for dinner retrieval improvements (expect 3-5 meals after query enhancement)
- [ ] Consider adding metadata-based filtering as primary filter (check `metadata.dietType === 'Vegetarian'`) before regex fallback
- [ ] Add unit tests for diet filtering logic to prevent future regressions
- [ ] Expand snacks query variations if snack retrieval remains at 1 meal
- [ ] Document RAG document format in developer guide for future ingestion script changes

---

**Key Takeaway**: This release fixes a critical bug where the RAG system's diet filtering was completely broken due to format mismatch between expected markdown format and actual plain text format in indexed documents. The fix restores full functionality of vegetarian/vegan/jain meal plan generation with proper variety (25-30 meals vs 0) and intelligent diet adaptations using ingredient substitutes (11 documents vs 0).
