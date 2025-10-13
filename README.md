# 🌸 Sakhee — AI-powered PCOS Management Assistant

Sakhee is an AI-driven, culturally-localized health companion focused on helping Indian women manage PCOS/PCOD. It combines a React + Vite frontend with an Express backend that leverages language models and retrieval pipelines (LangChain.js) for personalized chat, meal planning, medical report parsing, and progress tracking.

This README covers how to get the project running locally, available scripts, environment variables, features, and code organization.

---

## ✨ Features

- **🤖 AI Chat Assistant** - Conversational AI powered by GPT-4o-mini with RAG (Retrieval-Augmented Generation) for PCOS-specific guidance
- **🍽️ Personalized Meal Planning** - AI-generated meal plans tailored to Indian cuisine and PCOS dietary needs
- **📄 Medical Report Analysis** - OCR-based parsing of lab reports (PDF, DOCX, images) with intelligent data extraction
- **📊 Progress Tracking** - Visual dashboards to monitor health metrics, symptoms, and lifestyle changes over time
- **🌐 Multi-language Support** - English and Hindi with i18next internationalization
- **🔐 Firebase Authentication** - Secure Google OAuth login with Firestore for user profiles and data persistence
- **🛡️ Safety & Privacy** - Content safety guards, rate limiting, and medical disclaimers
- **🔄 Community Insights** - Reddit integration for anonymized community experiences (optional)
- **🎨 Modern UI** - Responsive design with Tailwind CSS, Lucide icons, and Recharts visualizations

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

3. **Start development servers**
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
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment (development/production) |
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for LLM and embeddings |
| `SERP_API_KEY` | No | SERP API key for web search context |
| `REDDIT_CLIENT_ID` | No | Reddit OAuth client ID |
| `REDDIT_CLIENT_SECRET` | No | Reddit OAuth client secret |
| `REDDIT_REDIRECT_URI` | No | Reddit OAuth redirect URI |
| `CORS_ORIGIN` | No | Allowed CORS origin (default: http://localhost:5173) |
| `MAX_FILE_SIZE_MB` | No | Max upload file size in MB (default: 10) |
| `DATABASE_URL` | No | Database URL (default: local) |

### Client (`.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Backend API URL |
| `VITE_API_TIMEOUT` | No | API request timeout (default: 30000ms) |
| `VITE_APP_NAME` | No | App name (default: Sakhee) |
| `VITE_FIREBASE_API_KEY` | **Yes** | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Yes** | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | **Yes** | Firebase app ID |

⚠️ **Security Note**: Never commit `.env` files with real API keys to version control.

## 📜 NPM Scripts

### Root Workspace
| Script | Description |
|--------|-------------|
| `npm run dev` | Start both client and server concurrently (development mode) |
| `npm run build` | Build both client and server for production |
| `npm run test` | Run tests for client and server |
| `npm run lint` | Run ESLint across all workspaces |
| `npm run lint:fix` | Auto-fix linting issues across all workspaces |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting with Prettier |

### Server (`server/`)
| Script | Description |
|--------|-------------|
| `npm run dev` | Start server with auto-restart on changes (node --watch) |
| `npm run start` | Start server in production mode |
| `npm run test` | Run server tests with Vitest |
| `npm run lint` | Lint server code |
| `npm run lint:fix` | Auto-fix server linting issues |
| `npm run format` | Format server code with Prettier |

### Client (`client/`)
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server with hot reload |
| `npm run build` | Build production-ready static assets |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run client tests with Vitest |
| `npm run lint` | Lint client code |
| `npm run lint:fix` | Auto-fix client linting issues |
| `npm run format` | Format client code with Prettier |

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
│   │   │   ├── MealPlanGenerator.jsx
│   │   │   ├── MealPlanDisplay.jsx
│   │   │   └── MealCard.jsx
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
│   │   ├── chains/
│   │   │   ├── chatChain.js           # Chat conversation chain
│   │   │   ├── mealPlanChain.js       # Meal planning chain
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
│   │   ├── mealPlan.js                # Meal planning endpoints
│   │   ├── upload.js                  # File upload endpoints
│   │   ├── progress.js                # Progress tracking endpoints
│   │   └── onboarding.js              # Onboarding endpoints
│   ├── services/
│   │   ├── ocrService.js              # OCR for images (Tesseract.js)
│   │   ├── parserService.js           # PDF/DOCX parsing
│   │   ├── redditService.js           # Reddit API integration
│   │   ├── serpService.js             # SERP API for web search
│   │   └── firebaseCacheService.js    # Firebase caching
│   ├── storage/
│   │   ├── tmpUploads/                # Temporary file uploads
│   │   └── localCache/                # Local caching
│   ├── utils/
│   │   ├── logger.js                  # Winston logger
│   │   └── labRanges.js               # Medical lab reference ranges
│   └── data/
│       └── meal_templates/            # Meal plan templates
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
  - Cultural cuisine preferences (North Indian, South Indian, etc.)
  - PCOS-specific nutritional requirements
  - Allergies and restrictions
- **Output**: 7-day meal plans with recipes, nutritional info, and cooking instructions

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
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/chat` | POST | Send chat message |
| `/api/meals/generate` | POST | Generate meal plan |
| `/api/upload` | POST | Upload medical report |
| `/api/progress` | GET/POST | Get/update progress data |
| `/api/onboarding/create` | POST | Complete onboarding |

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
- [x] Personalized meal planning
- [x] Medical report analysis (OCR + parsing)
- [x] Progress tracking dashboard
- [x] Firebase authentication
- [x] Multi-language support (EN, HI)
- [x] Community insights (Reddit integration)

### Planned 🔜
- [ ] Mobile app (React Native)
- [ ] Exercise recommendations
- [ ] Medication reminders
- [ ] Doctor appointment scheduling
- [ ] Community forum
- [ ] More languages (Tamil, Telugu, Bengali)
- [ ] Integration with health tracking devices
- [ ] Symptom prediction models
- [ ] Cycle tracking with predictions

---

## 📚 Additional Resources

- [LangChain.js Documentation](https://js.langchain.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

**Made with ❤️ for women managing PCOS**