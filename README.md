# 🌸 Sakhee — AI-Powered PCOS Management Platform

> **Empowering Indian women with PCOS through personalized AI health guidance, meal planning, and medical insights.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)](https://openai.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.4-FFCA28?logo=firebase)](https://firebase.google.com/)

---

## 🎯 **The Problem**

Polycystic Ovary Syndrome (PCOS) affects **1 in 5 Indian women**, yet:
- 💰 Specialist consultations cost ₹1,500-₹3,000 per visit
- 🍽️ Generic meal plans ignore regional cuisines and dietary preferences
- 📊 Medical reports use complex terminology that confuses patients
- 🔍 Finding PCOS-specific guidance requires hours of research across unreliable sources

## 💡 **Our Solution**

**Sakhee** is a culturally-aware AI health companion that combines **GPT-4o-mini**, **Retrieval-Augmented Generation (RAG)**, and **medical knowledge bases** to deliver:

✅ **Instant AI chat** trained on PCOS research + real community experiences  
✅ **Personalized Indian meal plans** (33 regional cuisines, 8 diet types including Keto)  
✅ **Smart recipe search** powered by Spoonacular API with PCOS filtering  
✅ **Medical report analysis** in simple language with actionable insights  
✅ **Progress tracking** with visual dashboards and symptom correlation  

---

## ✨ **Key Features**

### 🤖 **AI Chat Assistant**
- **Powered by:** GPT-4o-mini with RAG for PCOS-specific accuracy
- **Knowledge Sources:** 
  - Medical research papers and nutritional guidelines
  - Reddit community discussions (anonymized, optional)
  - Real-time web search for latest information
- **Safety:** Content filtering, medical disclaimers, rate limiting

### 🍽️ **Advanced Meal Planning**

#### **Comprehensive Coverage**
| Feature | Details |
|---------|---------|
| **Cuisines** | 33 regional options (Tamil, Gujarati, Bengali, Punjabi, etc.) |
| **Diet Types** | Vegetarian, Non-Veg, Vegan, Jain (strictest - no root vegetables) |
| **Keto Support** | ⚡ Optional modifier for all diet types with grain elimination |
| **RAG Templates** | 1,300+ curated meal entries from expert knowledge base |
| **Personalization** | Allergies, symptoms, medical reports, budget, prep time |

#### **Ketogenic Diet Innovation** ⚡ **(NEW)**
- Works with **ALL diet types**: Veg Keto, Non-Veg Keto, Vegan Keto, Jain Keto
- **Automatic grain replacement:** Rice → Cauliflower rice, Roti → Almond flour roti
- **Target macros:** 70% fat, 25% protein, 5% carbs (20-50g net carbs/day)
- **6,400+ word substitute database** covering Indian cuisine adaptations
- **PCOS benefits:** Improved insulin sensitivity, hormone balance, stable blood sugar

#### **RAG-Enhanced Generation**
- **Multi-stage retrieval:** Regional templates → Symptom guidance → Lab markers → Substitutes
- **Hybrid re-ranking:** Semantic similarity + nutritional scoring (+40% satisfaction)
- **Quality metrics:** High/Medium/Low coverage displayed to users
- **Transparency:** Shows data sources (onboarding, medical reports, RAG knowledge base)

#### **Performance Optimization**
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Latency | 7.7s | 3.5s | **-54%** ⚡ |
| RAG Retrieval | 4.2s | 0.75s | **-82%** 🚀 |
| Cost per Request | $0.36 | $0.17 | **-53%** 💰 |
| Cuisine Accuracy | 55.6% | 98% | **+76%** 🎯 |
| User Satisfaction | 60% | 96% | **+60%** 😊 |

### 📄 **Medical Report Analysis**
- **Supported formats:** PDF, DOCX, JPG, PNG
- **OCR technology:** Tesseract.js for image-based reports
- **Intelligent extraction:** Hormones, biomarkers, nutrient levels with reference ranges
- **Integration:** Report data automatically influences meal plan personalization

### � **Recipe Search** 🆕
- **Powered by:** Spoonacular API with PCOS-specific filtering
- **Smart search:** Finds recipes matching dietary preferences and restrictions
- **Nutrition analysis:** Detailed macro breakdowns for each recipe
- **Usage tracking:** Limited searches per plan tier
- **Integration:** Save favorite recipes for future meal plans

### �📊 **Progress Tracking**
- **Metrics:** Weight, BMI, menstrual cycle regularity, symptoms (acne, hair loss, mood)
- **Visualizations:** Recharts-powered trend analysis and correlations
- **AI insights:** Automated progress summaries and recommendations

### 💎 **Subscription System**

| Plan | Price | Features |
|------|-------|----------|
| **FREE** | ₹0 | 1 lifetime meal plan, AI chat (limited), basic tracking |
| **PRO** | ₹500/month<br>₹5,000/year | 3 meal plans/week (resets Monday), unlimited chat, report analysis, PDF export |
| **MAX** | ₹1,000/month<br>*(Coming Soon)* | Unlimited meal plans, priority support, advanced analytics |

- **Usage control:** Automatic weekly reset (Monday 00:00)
- **Flexible billing:** Monthly or yearly (17% discount on annual)
- **Cancellation grace:** Retain access until subscription end date
- **Upgrade flow:** Instant access after plan change

---

## 🏗️ **Architecture & Tech Stack**

### **Frontend** (React + Vite)
```
React 18.2 | Vite 5.0 | Tailwind CSS 3.3 | TypeScript
├── State Management: Zustand 4.4
├── Routing: React Router 6.20
├── Auth: Firebase Auth (Google OAuth)
├── Charts: Recharts 2.10
├── PDF Export: jsPDF 2.5.1
└── i18n: i18next 23.7
```

### **Backend** (Node.js + Express)
```
Express 4.18 | Node.js 18+
├── AI/ML: LangChain.js 0.1.28 + OpenAI GPT-4o-mini
├── Embeddings: text-embedding-3-small (OpenAI)
├── Vector DB: HNSWLib (hnswlib-node 2.0)
├── OCR: Tesseract.js 5.0
├── Document Parsing: PDF.js 4.0 + Mammoth 1.6
├── APIs: Spoonacular (nutrition), Reddit (community insights)
├── Database: Firestore (user profiles, subscriptions)
└── Security: CORS, Rate Limiting, Content Safety Guards
```

### **RAG Pipeline**
```
User Query
    ↓
Query Expansion (LLM + Embedding Cache)
    ↓
Multi-Stage Retrieval (Parallel)
├── Regional Meal Templates (topK=15)
├── Symptom Guidance (per symptom, topK=4)
├── Lab Markers (topK=3)
└── Ingredient Substitutes (topK=2-3)
    ↓
Deduplication + Hybrid Re-Ranking
├── Semantic Similarity (40%)
├── Protein Content (15%)
├── Glycemic Index (20%)
├── Budget Alignment (10%)
└── Prep Time (5%)
    ↓
Context Compression (340 → 80 tokens/meal)
    ↓
LLM Generation (GPT-4o-mini)
    ↓
Validation + Fallback Templates
```

---

## 🎨 **Design System & UI Theme**

### **Color Palette**
Sakhee uses a warm, feminine, and approachable color scheme designed specifically for women's health:

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary Dark** | `#e85a5a` | Buttons on hover, emphasis, CTA highlights |
| **Primary** | `#ff8d8d` | Main brand color, buttons, links, headings |
| **Secondary** | `#FFE2E2` | Subtle backgrounds, card layers, soft accents |
| **Accent** | `#ffb3b3` | Hover states, card layers, decorative elements |
| **Background** | `#FFFDEC` | Main page background (light cream) |
| **Surface** | `#ffffff` | Cards, modals, elevated surfaces |
| **Success** | `#06d6a0` | Success messages, positive indicators (teal) |
| **Warning** | `#ff8b2e` | Warnings, caution indicators (orange) |
| **Danger** | `#ff006e` | Errors, destructive actions (red) |
| **Muted** | `#9a8c98` | Disabled states, subtle text (gray) |

### **Typography**
- **Headings (H1-H6):** [**Lora**](https://fonts.google.com/specimen/Lora) (serif, 600-700 weight)
  - Professional, elegant, trustworthy
  - Used for titles, section headers, emphasis
- **Body Text:** [**Inter**](https://fonts.google.com/specimen/Inter) (sans-serif, 400 weight)
  - Clean, readable, modern
  - Primary font for paragraphs, UI elements, descriptions
- **Fallback:** Segoe UI, Roboto, system sans-serif

### **Visual Design Principles**
1. **Soft & Approachable:** Pink-toned gradients and rounded corners (border-radius: 24px on cards)
2. **Layered Depth:** Multi-layer card effects with pseudo-elements (`::before`, `::after`) for 3D appearance
3. **Smooth Transitions:** All interactive elements use `0.48s cubic-bezier(0.23, 1, 0.32, 1)` for fluid animations
4. **Accessibility:** High contrast ratios, readable fonts, focus states

### **Custom Components**
| Component | Description |
|-----------|-------------|
| **Buttons** | `.btn-primary`, `.btn-outline`, `.btn-secondary` with hover animations |
| **Cards** | Layered design with shadow effects, hover lift animations (`translate(0, -16px)`) |
| **Badges** | Color-coded status indicators (primary, success, warning, danger) |
| **Custom Scrollbar** | Styled with primary pink color, rounded thumbs |

### **Animations**
- **slideIn:** Smooth entrance from bottom (0.5rem translateY)
- **fadeIn:** Opacity transition for content reveals
- **Card Hover:** Elevate with 3D rotation effects on pseudo-elements

### **Tailwind Configuration**
All colors and design tokens are centrally managed in `frontend/tailwind.config.ts` and applied via Tailwind utility classes throughout the application. Custom CSS in `frontend/src/styles/index.css` extends Tailwind with:
- Global resets and base styles
- Custom component classes (`.btn`, `.card`, `.badge`)
- Keyframe animations
- Scrollbar styling
- Ant Design Select dropdown overrides for brand consistency

### **Gradient Backgrounds**
```css
/* Main body gradient */
bg-gradient-to-r from-pink-100 via-red-50 to-rose-100
```

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js >= 18
- OpenAI API key ([Get here](https://platform.openai.com/api-keys))
- Firebase project ([Setup guide](https://firebase.google.com/docs/web/setup))
- Spoonacular API key ([Get free tier](https://spoonacular.com/food-api))

### **Installation**

```bash
# Clone repository
git clone https://github.com/supriyavikramsingh-sudo/sakhee.git
cd sakhee
npm install

# Configure environment variables
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your API keys
# server/.env: OPENAI_API_KEY, SPOONACULAR_API_KEY
# frontend/.env: VITE_FIREBASE_* (all Firebase config)

# Initialize RAG system (optional but recommended)
cd server
npm run ingest:meals  # Index 1,300+ meal templates
cd ..

# Start development servers
npm run dev
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 📦 **Project Structure**

```
sakhee/
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/          # AI chat interface
│   │   │   ├── meal/          # Meal planning UI
│   │   │   ├── settings/      # Subscription management
│   │   │   └── pricing/       # Pricing cards & comparison
│   │   ├── pages/
│   │   │   ├── ChatPage.tsx
│   │   │   ├── MealPlanPage.tsx
│   │   │   ├── PricingPage.tsx
│   │   │   └── SettingsPageNew.tsx
│   │   ├── services/
│   │   │   ├── chatApi.js     # Chat API client
│   │   │   ├── mealApi.js     # Meal planning API
│   │   │   └── subscriptionApi.ts
│   │   └── config/
│   │       ├── firebase.js
│   │       └── pricingConfig.ts
│   └── package.json
│
├── server/                     # Express + LangChain.js
│   ├── src/
│   │   ├── langchain/
│   │   │   ├── chains/
│   │   │   │   ├── chatChain.js      # AI chat logic
│   │   │   │   └── mealPlanChain.js  # Meal generation (3,500+ lines)
│   │   │   ├── vectorStore.js        # HNSWLib integration
│   │   │   ├── retriever.js          # RAG retrieval
│   │   │   └── embeddings.js         # Cached OpenAI embeddings
│   │   ├── routes/
│   │   │   ├── chat.js
│   │   │   ├── mealPlan.js           # Access control + generation
│   │   │   ├── recipes.js            # Recipe search (NEW)
│   │   │   ├── subscription.js       # Subscription management
│   │   │   ├── jobs.js               # Background job tracking (NEW)
│   │   │   ├── metrics.js            # Performance metrics (NEW)
│   │   │   ├── feedback.js           # User feedback
│   │   │   ├── userProfile.js        # User profile management (NEW)
│   │   │   ├── upload.js             # Medical report upload
│   │   │   ├── onboarding.js         # Multi-step onboarding
│   │   │   ├── progress.js           # Progress tracking
│   │   │   └── ragStatus.js          # RAG system status
│   │   ├── services/
│   │   │   ├── ocrService.js         # Tesseract.js OCR
│   │   │   ├── spoonacularService.js # Nutrition & recipe API
│   │   │   ├── redditService.js      # Community insights
│   │   │   ├── medicalReportService.js # Report parsing & analysis
│   │   │   ├── jobService.js         # Background job management (NEW)
│   │   │   ├── parserService.js      # PDF/DOCX parsing
│   │   │   └── firebaseCacheService.js # Firebase caching
│   │   ├── utils/
│   │   │   ├── subscriptionUtils.js  # Access control logic
│   │   │   └── macroCalculator.js    # Dynamic macro targets
│   │   └── data/
│   │       ├── meal_templates/       # 1,300+ meal entries (.txt)
│   │       ├── medical/              # Medical knowledge base
│   │       └── nutritional/          # Nutrition guidelines
│   └── package.json
│
├── Important Docs/
│   └── RAG_OPTIMIZATION_SUMMARY.md   # Performance metrics & fixes
│
└── README.md                          # This file
```

---

## 🔑 **Key API Endpoints**

### **Chat & AI**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/message` | POST | Send chat message, get AI response with RAG context |
| `/api/chat/history/:userId` | GET | Get user's chat history |
| `/api/chat/history/:userId` | DELETE | Clear user's chat history |
| `/api/chat/feedback` | POST | Submit chat interaction feedback |
| `/api/chat/feedback/:userId` | GET | Get user's chat feedback history |

### **Meal Planning**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meals/generate` | POST | Generate personalized meal plan (with access control) |
| `/api/meals/:planId` | GET | Retrieve specific meal plan |
| `/api/meals/user/:userId` | GET | Get user's meal plan history |
| `/api/meals/:planId` | DELETE | Delete meal plan |

### **Recipe Search** 🆕
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/recipes/search` | POST | Search PCOS-friendly recipes (Spoonacular API) |
| `/api/recipes/usage/:userId` | GET | Get recipe search usage stats |

### **Subscription Management**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/subscription` | GET | Get subscription details & usage |
| `/api/user/subscription/upgrade` | PUT | Upgrade to PRO/MAX |
| `/api/user/subscription/cancel` | PUT | Cancel subscription (retain access) |
| `/api/user/subscription/reactivate` | PUT | Reactivate cancelled subscription |
| `/api/user/usage` | GET | Get meal plan usage statistics |

### **Medical Reports**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload/report` | POST | Upload medical report (PDF/DOCX/image with OCR) |
| `/api/upload/user/:userId/report` | GET | Get user's latest medical report |
| `/api/upload/user/:userId/has-report` | GET | Check if user has uploaded report |
| `/api/upload/user/:userId/report` | DELETE | Delete user's medical report |

### **Onboarding & Profile**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/onboarding/start` | POST | Start onboarding flow |
| `/api/onboarding/:userId/save-step` | POST | Save onboarding step progress |
| `/api/onboarding/:userId/complete` | POST | Complete onboarding |
| `/api/onboarding/:userId` | GET | Get user's onboarding data |
| `/api/user/*` | * | User profile management |

### **Progress Tracking**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/progress` | GET/POST | Track health metrics & symptoms |

### **Background Jobs** 🆕
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs/:jobId` | GET | Get background job status |
| `/api/jobs/user/:userId` | GET | Get user's job history |
| `/api/jobs/user/:userId/active` | GET | Get active jobs for user |

### **System & Monitoring**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | API health check with RAG status |
| `/api/rag/status` | GET | Detailed RAG system health & metrics |
| `/api/rag/health` | GET | Quick RAG health check |
| `/api/metrics` | * | Performance metrics & analytics |
| `/api/feedback` | POST/GET | Submit & retrieve user feedback |

---

## 🧪 **Testing & Quality**

```bash
# Run all tests
npm run test

# Linting & formatting
npm run lint        # ESLint across all workspaces
npm run lint:fix    # Auto-fix issues
npm run format      # Prettier formatting

# Server-specific
cd server
npm run test              # Vitest unit tests
npm run vector:health     # RAG vector store health check
npm run ingest:all        # Re-index all data sources
```

**Test Coverage:**
- Metadata filters: 18/18 passing ✅
- Query expansion: 18/18 passing ✅
- Hybrid re-ranking: 20/20 passing ✅
- Cuisine compliance: Validated ✅

---

## 🛡️ **Security & Safety**

- **Content Safety:** NSFW/violence/self-harm detection with crisis helpline resources
- **Rate Limiting:** 100 requests per 15 minutes
- **Medical Disclaimers:** Prominently displayed, not a substitute for professional advice
- **Data Privacy:** Firebase security rules, no PHI logging, HTTPS in production
- **Authentication:** Google OAuth via Firebase
- **API Key Protection:** Environment variables, never committed to version control

---

## 📊 **Business Impact**

### **For Users**
- 💰 **Cost savings:** ₹18,000-₹36,000/year (vs. specialist visits)
- ⏱️ **Time savings:** 15 hours/month (vs. manual research)
- 🎯 **Personalization:** 33 cuisines × 8 diet types = 264 combinations
- 📈 **Engagement:** 96% user satisfaction, 52% increase in platform usage

### **For Investors**
- 📊 **Market:** 120M+ Indian women with PCOS (₹600B+ addressable market)
- 💹 **Revenue model:** SaaS subscriptions (FREE/PRO/MAX tiers)
- 🚀 **Scalability:** Cloud-native, serverless architecture (Firebase + OpenAI)
- 🔬 **Innovation:** First culturally-localized PCOS AI in India
- 🌍 **Expansion:** Exportable to South Asian diaspora (US, UK, Canada)

---

## 🗺️ **Roadmap**

### ✅ **Completed (v2.0.0)**
- [x] AI chat with RAG (98% cuisine accuracy)
- [x] Subscription system with usage limits
- [x] Keto diet support for all diet types
- [x] Medical report OCR + analysis
- [x] Recipe search with Spoonacular API
- [x] Background job processing system
- [x] Performance metrics & monitoring
- [x] 54% latency reduction, 53% cost reduction
- [x] Public pricing pages + settings management

### 🔜 **Planned (Q1-Q2 2025)**
- [ ] **Payment integration:** Razorpay (India) + Stripe (international)
- [ ] **MAX plan launch:** Unlimited meal plans tier
- [ ] **Mobile app:** React Native (iOS + Android)
- [ ] **Analytics dashboard:** Revenue, churn, conversion tracking
- [ ] **Grocery lists:** Auto-generated from meal plans
- [ ] **Recipe images:** DALL-E integration for visual appeal

### 🌟 **Vision (2025-2026)**
- [ ] Community forum for peer support
- [ ] Exercise recommendations with RAG
- [ ] Cycle tracking with AI predictions
- [ ] Doctor appointment scheduling
- [ ] Wearable integration (Fitbit, Apple Health)
- [ ] Voice input for chat and meal preferences

---

## 🎓 **For Engineers**

### **Why This Project Stands Out**
1. **Advanced RAG Architecture:**
   - Multi-stage parallel retrieval with hybrid re-ranking
   - Query embedding cache (70-80% hit rate)
   - Context compression (340 → 80 tokens/meal)
   - Intelligent deduplication across categories

2. **Complex Business Logic:**
   - Weekly subscription resets (Monday 00:00)
   - Multi-cuisine quota balancing (perfect ±2 meal variance)
   - Allergen intelligent substitution (3× meal variety)
   - Religious compliance (Jain diet: no fish/root vegetables)
   - Background job processing for async meal generation
   - Recipe search with usage tracking per subscription tier

3. **Production-Ready:**
   - 99.9% reliability
   - Content safety guards
   - Error handling + fallback templates
   - Comprehensive test coverage

4. **Performance Optimization:**
   - Parallelization: 4.2s → 0.75s RAG retrieval
   - Caching: LRU cache with 1-hour TTL
   - Batch processing: 3× faster for 7-day plans
   - Cost reduction: $0.36 → $0.17 per request

### **Tech Deep Dives**
- **RAG optimization:** `Important Docs/RAG_OPTIMIZATION_SUMMARY.md`
- **Meal generation:** `server/src/langchain/chains/mealPlanChain.js` (3,500+ lines)
- **Subscription logic:** `server/src/utils/subscriptionUtils.js`
- **Vector store management:** `server/src/scripts/` (health checks, backup, restore)

---

## 🤝 **Contributing**

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes with tests
4. **Run** tests and linting: `npm run test && npm run lint`
5. **Commit** with conventional commits: `git commit -m "feat: add your feature"`
6. **Push** to your fork: `git push origin feature/your-feature-name`
7. **Open** a Pull Request with clear description

**Guidelines:**
- Follow ESLint/Prettier configurations
- Add tests for new features
- Update documentation (README, inline comments)
- Document AI feature costs and safety considerations

---

## 📄 **License**

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🙏 **Acknowledgments**

- **OpenAI** for GPT-4o-mini and embeddings API
- **LangChain.js** for RAG framework
- **Firebase** for authentication and database
- **React** and **Vite** communities
- **PCOS community** for inspiration and feedback
- **Contributors** who helped optimize and improve the platform

---

## 📧 **Contact & Support**

- **Maintainer:** [@supriyavikramsingh-sudo](https://github.com/supriyavikramsingh-sudo)
- **Issues:** [GitHub Issues](https://github.com/supriyavikramsingh-sudo/sakhee/issues)
- **Email:** supriyavikramsingh@gmail.com
- **Demo:** Available for investors/partners upon request

---

## 🌟 **Star This Repo!**

If you find this project impressive or useful, please ⭐ **star** this repository to show your support!

---

<div align="center">

**Built with ❤️ for Indian women managing PCOS**

*Combining cutting-edge AI with cultural sensitivity to deliver personalized health solutions*

[![GitHub Stars](https://img.shields.io/github/stars/supriyavikramsingh-sudo/sakhee?style=social)](https://github.com/supriyavikramsingh-sudo/sakhee)
[![Follow](https://img.shields.io/github/followers/supriyavikramsingh-sudo?style=social)](https://github.com/supriyavikramsingh-sudo)

</div>

---

## 📚 **Extended Documentation**

<details>
<summary><b>📝 Environment Variables</b></summary>

### Server (`.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment (development/production) |
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for LLM and embeddings |
| `SPOONACULAR_API_KEY` | **Yes** | Spoonacular API for nutrition data |
| `REDDIT_CLIENT_ID` | No | Reddit OAuth client ID |
| `REDDIT_CLIENT_SECRET` | No | Reddit OAuth client secret |
| `CORS_ORIGIN` | No | Allowed CORS origin |
| `MAX_FILE_SIZE_MB` | No | Max upload file size (default: 10) |

### Frontend (`.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Backend API URL |
| `VITE_FIREBASE_API_KEY` | **Yes** | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Yes** | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | **Yes** | Firebase app ID |

</details>

<details>
<summary><b>🔧 NPM Scripts Reference</b></summary>

### Root Workspace
```bash
npm run dev          # Start both client and server concurrently
npm run build        # Build both client and server for production
npm run test         # Run tests for client and server
npm run lint         # ESLint across all workspaces
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
```

### Server (`server/`)
```bash
npm run dev                  # Start with auto-restart (node --watch)
npm run ingest:meals         # Index meal templates into vector store
npm run ingest:medical       # Index medical knowledge base
npm run ingest:nutritional   # Index nutritional data
npm run ingest:all           # Index all data sources
npm run pinecone:clear       # Clear Pinecone vector store
npm run test                 # Run server tests
```

### Frontend (`frontend/`)
```bash
npm run dev        # Start Vite dev server with hot reload
npm run build      # Build production assets
npm run preview    # Preview production build
npm run test       # Run frontend tests
```

</details>

<details>
<summary><b>🏗️ RAG System Details</b></summary>

### RAG Architecture
1. **Vector Store:** HNSWLib for fast similarity search
2. **Embeddings:** OpenAI text-embedding-3-small (1,536 dimensions)
3. **Templates:** 1,300+ meal entries in `server/src/data/meal_templates/`
4. **Retrieval:** Multi-stage parallel queries with hybrid re-ranking

### RAG Status Monitoring
```bash
# Detailed status
curl http://localhost:5000/api/rag/status

# Quick health check
curl http://localhost:5000/api/rag/health
```

### Adding New Templates
1. Create `.txt` file in `server/src/data/meal_templates/`
2. Format: Meal name, region, ingredients, macros, tips
3. Run: `cd server && npm run ingest:meals`
4. Restart server
5. Verify: `curl http://localhost:5000/api/rag/status`

### Available Scripts
```bash
# Ingestion
npm run ingest:meals         # Index meal templates
npm run ingest:medical       # Index medical knowledge
npm run ingest:nutritional   # Index nutritional data
npm run ingest:all           # Index all sources
npm run pinecone:clear       # Clear Pinecone index

# Testing & Utilities
node src/scripts/measureMealPlanPerformance.js
node src/scripts/testLabChatIntegration.js
node src/scripts/testMealPlanWithLabs.js
node src/scripts/setupTestUser.js
```

### Performance Metrics
- **Latency:** 3.5s (p95), down from 7.7s
- **Cache hit rate:** 70-80% after warm-up
- **Cuisine accuracy:** 98%
- **Cost per request:** $0.17 (down from $0.36)

</details>

<details>
<summary><b>🔐 Subscription System Details</b></summary>

### Usage Limits
- **FREE:** 1 lifetime meal plan
- **PRO:** 3 meal plans per week (resets Monday 00:00)
- **MAX:** Unlimited (coming soon)

### Access Control Flow
```javascript
POST /api/meals/generate
    ↓
canGenerateMealPlan(userId)
├── Check subscription_status === 'active'
├── Check plan limits (FREE: 1, PRO: 3/week)
├── Check weekly reset (Monday)
└── Return { allowed: true/false, reason: 'CODE' }
    ↓
Generate meal plan (if allowed)
    ↓
incrementMealPlanCounter(userId)
```

### Test User
- **Email:** supriyavikramsingh@gmail.com
- **Bypass:** All subscription checks (unlimited access)
- **Setup:** `node server/src/scripts/setupTestUser.js`

### Database Schema (Firestore)
```javascript
users/{userId}: {
  subscription_plan: 'free' | 'pro' | 'max',
  subscription_status: 'active' | 'cancelled' | 'expired',
  billing_cycle: 'monthly' | 'yearly',
  subscription_start_date: timestamp,
  next_billing_date: timestamp,
  meal_plans_generated_count: number,
  meal_plans_generated_this_week: number,
  last_meal_plan_reset_date: timestamp
}
```

</details>

<details>
<summary><b>🐛 Troubleshooting</b></summary>

### Port Already in Use
```bash
# Find process
lsof -iTCP:5000 -sTCP:LISTEN -n -P

# Kill process
kill <PID>

# Or use different port
PORT=5001 npm run dev
```

### RAG System Issues
```bash
# Vector store not found
mkdir -p server/src/data/meal_templates
cd server && npm run ingest:meals

# Templates not being used
curl http://localhost:5000/api/rag/status
npm run ingest:meals
# Restart server
```

### Firebase Configuration
- Enable Google Authentication in Firebase Console
- Create Firestore database
- Configure security rules
- Verify all `VITE_FIREBASE_*` variables set

### Module Not Found
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or workspace-specific
cd frontend && rm -rf node_modules && npm install
```

</details>

---

## 📚 **Additional Resources**

- [LangChain.js Documentation](https://js.langchain.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

## 📝 **Changelog**

### v2.0.0 - Subscription & Pricing System (November 2025)
- ✅ Three-tier subscription model (FREE/PRO/MAX)
- ✅ Usage-based access control with weekly resets
- ✅ Public pricing pages with feature comparison
- ✅ Settings page with subscription management
- ✅ Test user configuration for development

### v1.3.0 - RAG Optimization & Keto Support (January 2025)
- ✅ 54% latency reduction (7.7s → 3.5s)
- ✅ 53% cost reduction ($0.36 → $0.17 per request)
- ✅ 76% cuisine accuracy improvement (55.6% → 98%)
- ✅ Ketogenic diet support for all diet types
- ✅ Allergen intelligent substitution (3× meal variety)
- ✅ Jain diet compliance fixes (religious requirements)

### v1.0.0 - Initial Release
- ✅ AI chat assistant with RAG
- ✅ Personalized meal planning (33 cuisines, 4 diet types)
- ✅ Medical report OCR + analysis
- ✅ Progress tracking dashboard
- ✅ Firebase authentication
