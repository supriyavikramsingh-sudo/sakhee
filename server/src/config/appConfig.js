export const appConfig = {
  // AI Model Settings
  model: {
    name: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5
  },
  
  // Embeddings
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536
  },
  
  // RAG Settings
  rag: {
    chunkSize: 1000,
    chunkOverlap: 200,
    topK: 5,
    minScore: 0.5
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    skipSuccessfulRequests: true
  },
  
  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    supportedFileTypes: ['pdf', 'docx', 'jpeg', 'jpg', 'png'],
    uploadDir: './src/storage/tmpUploads'
  },
  
  // Feature Flags
  features: {
    redditInsights: true,
    mealPlanning: true,
    reportParsing: true,
    progressTracking: true,
    communityInsights: true
  },
  
  // Cache Settings
  cache: {
    ttl: 60 * 60 * 1000, // 1 hour
    enabled: true
  },
  
  // Tone & Personality
  tone: {
    empathy: true,
    nonJudgmental: true,
    supportive: true,
    culturallyAdapt: true
  }
};

export default appConfig;
