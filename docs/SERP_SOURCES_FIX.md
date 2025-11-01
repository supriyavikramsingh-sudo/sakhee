# SERP Nutrition Sources Fix

**Date**: November 1, 2025  
**Version**: v1.8.1

## Issue

When users ask nutrition questions like "What are the nutritional breakdown of dal baati churma?", the backend fetches nutrition data from Google via SERP API, but the **source links are not being returned to the frontend**.

### Expected Behavior
- Bot response includes nutrition facts (✅ Working)
- "Sources (4)" dropdown shows Google nutrition links (❌ Not working)

### Actual Behavior
- Bot response includes nutrition facts (✅ Working)
- Sources array is populated but without actual URLs
- Frontend shows generic "SERP API" source without clickable links

---

## Root Cause

The `chatChain.js` was adding nutrition sources to the response like this:

```javascript
// ❌ BEFORE: Generic source without links
if (nutritionContext) {
  sources.push({
    type: 'nutrition',
    provider: 'SERP API',
  });
}
```

The SERP service returns rich data including:
- `sourceUrl`: Primary nutrition data source
- `organicResults`: Array of organic search results with `title`, `snippet`, and `link`

But this data wasn't being extracted and passed to the frontend.

---

## Solution

Enhanced the sources compilation to parse the nutrition data JSON and extract actual URLs:

```javascript
// ✅ AFTER: Parse nutrition data and extract links
if (nutritionContext) {
  try {
    const nutritionDataMatch = nutritionContext.match(/🥗 NUTRITIONAL DATA:\n([\s\S]+)/);
    if (nutritionDataMatch) {
      const nutritionData = JSON.parse(nutritionDataMatch[1]);
      
      const nutritionSources = [];
      
      // Add primary source (Knowledge Graph or Answer Box)
      if (nutritionData.sourceUrl) {
        nutritionSources.push({
          title: nutritionData.source || 'Nutrition Facts',
          url: nutritionData.sourceUrl,
          snippet: `Serving: ${nutritionData.servingSize || '100g'}, Calories: ${nutritionData.calories || 'N/A'}, Protein: ${nutritionData.protein || 'N/A'}g`,
        });
      }
      
      // Add organic search results (Healthline, WebMD, etc.)
      if (nutritionData.organicResults && Array.isArray(nutritionData.organicResults)) {
        nutritionData.organicResults.forEach(result => {
          if (result.link) {
            nutritionSources.push({
              title: result.title,
              url: result.link,
              snippet: result.snippet,
            });
          }
        });
      }
      
      if (nutritionSources.length > 0) {
        sources.push({
          type: 'nutrition',
          provider: 'Google (SERP API)',
          links: nutritionSources,  // ✅ Now includes actual URLs
        });
      }
    }
  } catch (parseError) {
    logger.error('Failed to parse nutrition data for sources', { error: parseError.message });
    // Fallback to generic source
    sources.push({
      type: 'nutrition',
      provider: 'Google (SERP API)',
    });
  }
}
```

---

## What Gets Returned Now

### Example Response Structure

```json
{
  "message": {
    "response": "Dal baati churma nutritional info..."
  },
  "sources": [
    {
      "type": "medical",
      "count": 3,
      "documents": [...]
    },
    {
      "type": "nutrition",
      "provider": "Google (SERP API)",
      "links": [
        {
          "title": "Google Knowledge Graph",
          "url": "https://www.google.com/search?q=dal+baati+churma+nutrition",
          "snippet": "Serving: 100g, Calories: 301, Protein: 16.5g"
        },
        {
          "title": "Dal Baati Churma Nutrition Facts - Healthline",
          "url": "https://www.healthline.com/nutrition/dal-baati-churma",
          "snippet": "Learn about the calories, protein, and health benefits..."
        },
        {
          "title": "Traditional Indian Dal Baati - Nutritionix",
          "url": "https://www.nutritionix.com/food/dal-baati-churma",
          "snippet": "Complete nutrition facts including vitamins and minerals..."
        }
      ]
    }
  ],
  "contextUsed": {
    "labValues": false,
    "labGuidance": false,
    "medical": true,
    "reddit": false,
    "nutrition": true
  }
}
```

---

## Frontend Rendering

The frontend `SourceCitations` component should now receive:

```javascript
// sources prop will include:
{
  type: 'nutrition',
  provider: 'Google (SERP API)',
  links: [
    { title: '...', url: 'https://...', snippet: '...' },
    { title: '...', url: 'https://...', snippet: '...' }
  ]
}
```

The frontend can render these as clickable links:

```jsx
{source.type === 'nutrition' && source.links && (
  <div>
    <h4>🥗 Nutrition Sources ({source.provider})</h4>
    {source.links.map((link, idx) => (
      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer">
        {link.title}
      </a>
    ))}
  </div>
)}
```

---

## Testing

### Test Case 1: Nutrition Query with Knowledge Graph

**Query**: "What are the nutritional breakdown of dal baati churma?"

**Expected**:
1. ✅ Bot provides nutrition facts (calories, protein, carbs, fats)
2. ✅ Sources include Google Knowledge Graph link
3. ✅ Sources include 2-3 organic results (Healthline, Nutritionix, etc.)
4. ✅ All links are clickable in the "Sources" dropdown

### Test Case 2: Obscure Dish (Organic Results Only)

**Query**: "nutritional info on nagaland fish curry"

**Expected**:
1. ✅ Bot provides nutrition facts (from RAG meal templates + SERP)
2. ✅ Sources include RAG documents (meal templates)
3. ✅ Sources include organic nutrition links (if SERP found any)
4. ✅ If SERP didn't find structured data, shows "found: false" with organic results

### Test Case 3: SERP API Not Configured

**Query**: "nutrition info on idli sambar"

**Expected** (if SERP_API_KEY is missing):
1. ✅ Bot provides nutrition facts (from RAG only)
2. ✅ Sources include only RAG documents
3. ✅ No nutrition source in sources array (graceful fallback)

---

## Files Modified

- **server/src/langchain/chains/chatChain.js** (lines ~1656-1710)
  - Enhanced nutrition sources compilation
  - Parse nutrition data JSON to extract links
  - Add graceful error handling for parsing failures

---

## Verification Steps

1. **Restart server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Send nutrition query**:
   ```bash
   curl -X POST http://localhost:5000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test-user",
       "message": "What are the nutritional breakdown of dal baati churma?"
     }'
   ```

3. **Check response JSON**:
   - Look for `sources` array
   - Find `type: 'nutrition'` entry
   - Verify `links` array exists and contains URLs

4. **Check frontend**:
   - Open chat UI
   - Ask nutrition question
   - Click "Sources" dropdown
   - Verify Google/nutrition links are clickable

---

## Related Files

- SERP Service: `/server/src/services/serpService.js` (returns nutrition data structure)
- Chat Route: `/server/src/routes/chat.js` (returns response with sources)
- Frontend SourceCitations: (check client code for rendering)

---

## Impact

### Before
- ❌ Nutrition sources showed generic "SERP API" label
- ❌ No clickable links to Google or nutrition sites
- ❌ Users couldn't verify nutrition data

### After
- ✅ Nutrition sources include actual URLs (Knowledge Graph + organic results)
- ✅ Clickable links to trusted nutrition sites (Healthline, Nutritionix, etc.)
- ✅ Users can verify and explore nutrition data sources
- ✅ Better transparency and trust in AI responses

---

## Next Steps

1. **Verify frontend rendering**: Ensure `SourceCitations.jsx` handles `links` array properly
2. **Add unit test**: Test nutrition sources parsing with mock SERP responses
3. **Monitor logs**: Track how often SERP returns structured data vs organic results
4. **Consider caching**: SERP service already caches nutrition data for 30 days (good!)

---

**Status**: ✅ Complete (syntax check passed, ready to test)
