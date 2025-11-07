#!/bin/bash
# Quick script to implement Phase 1 optimizations
# Expected improvement: 0.3 → 0.45-0.50 (+50-67%)

echo "🚀 Phase 1: Boost Embedding Scores (Quick Wins)"
echo "================================================"
echo ""

# Step 1: Backup current vector store
echo "📦 Step 1: Backing up current vector store..."
npm run vector:backup
echo "✅ Backup complete"
echo ""

# Step 2: Show current config
echo "📋 Step 2: Current RAG config:"
echo "   chunkSize: 1000 (TOO LARGE)"
echo "   chunkOverlap: 200 (TOO SMALL)"
echo ""

# Step 3: Instructions for manual edit
echo "✏️  Step 3: Update config manually:"
echo "   File: server/src/config/appConfig.js"
echo ""
echo "   Change from:"
echo "     rag: {"
echo "       chunkSize: 1000,"
echo "       chunkOverlap: 200,"
echo "     }"
echo ""
echo "   Change to:"
echo "     rag: {"
echo "       chunkSize: 400,      // ✅ Reduced from 1000"
echo "       chunkOverlap: 100,   // ✅ 25% overlap"
echo "     }"
echo ""
read -p "Press ENTER after you've edited the config file..."

# Step 4: Clear vector store
echo ""
echo "🗑️  Step 4: Clearing old vector store..."
npm run vector:clear
echo "✅ Vector store cleared"
echo ""

# Step 5: Re-ingest with new chunking
echo "📥 Step 5: Re-ingesting data with optimized chunking..."
echo "   This may take 5-10 minutes..."
npm run ingest:all
echo "✅ Data re-ingested"
echo ""

# Step 6: Test improvement
echo "🧪 Step 6: Testing embedding score improvement..."
node scripts/diagnose-retrieval.js
echo ""

# Step 7: Summary
echo "✅ Phase 1 Complete!"
echo ""
echo "📊 Expected Results:"
echo "   - Scores should improve from 0.30 → 0.45-0.50"
echo "   - More documents retrieved at minScore=0.3"
echo "   - Better match quality"
echo ""
echo "🔍 Check the diagnostic output above for actual scores."
echo ""
echo "📖 Next Steps:"
echo "   - If scores are now 0.45-0.50: Great! Move to Phase 2 (data cleaning)"
echo "   - If scores are still 0.30-0.35: Check data quality and consider Phase 2"
echo "   - Full guide: GUIDE_BOOST_EMBEDDING_SCORES.md"
echo ""
