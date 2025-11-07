export const appConfig = {
  // AI Model Settings
  model: {
    name: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 16384,
    topP: 1.0,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
  },

  // Embeddings
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },

  // RAG Settings
  // ✅ OPTIMIZED: Reduced topK for better quality/performance balance
  // ✅ CRITICAL FIX: minScore adjusted for DISTANCE scores (lower=better)
  // Note: HNSW returns DISTANCE (1 - similarity), not similarity
  // minScore=0.5 means "distance ≤ 0.5" → similarity ≥ 0.5
  // Previous 0.3 was too strict (required similarity ≥ 0.7)
  rag: {
    chunkSize: 1000,
    chunkOverlap: 200,
    topK: 15, // ✅ Reduced from 25 (fewer but higher quality results)
    minScore: 0.5, // ✅ FIXED: Raised from 0.3 to allow similarity ≥ 0.5 (was blocking breakfast queries)
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    skipSuccessfulRequests: true,
  },

  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    supportedFileTypes: ['pdf', 'docx', 'jpeg', 'jpg', 'png'],
    uploadDir: './src/storage/tmpUploads',
  },

  // Feature Flags
  features: {
    redditInsights: true,
    mealPlanning: true,
    reportParsing: true,
    progressTracking: true,
    communityInsights: true,
  },

  // Cache Settings
  cache: {
    ttl: 60 * 60 * 1000, // 1 hour
    enabled: true,
  },

  // Tone & Personality
  tone: {
    empathy: true,
    nonJudgmental: true,
    supportive: true,
    culturallyAdapt: true,
  },
};

export default appConfig;
