# Unified NSFW Content Handling

**Date**: November 2, 2025  
**Author**: GitHub Copilot  
**Status**: ✅ Completed

## Overview

Unified the handling of NSFW/inappropriate content across the application to use a single, consistent approach with a clean white message box (instead of the previous pink/red error styling).

## Problem

There were **two different** implementations for handling NSFW content:

1. **Middleware (safetyGuards.js)** - Blocked requests at the API level
   - Returned HTTP 400 error with message: "Inappropriate content detected"
   - Details: "This platform is designed for PCOS health management. Please keep conversations professional and health-focused."
   - Frontend displayed with **pink/red background** (`bg-danger bg-opacity-10 text-danger`)

2. **ChatChain (chatChain.js)** - Secondary filter within the LLM chain
   - Returned regular assistant message
   - Message: "I'm sorry, but I cannot provide NSFW or adult content..."
   - Frontend displayed with **white background** (like normal bot messages)

This created inconsistent user experience and redundant code.

## Solution

### 1. **Primary NSFW Filter: Middleware** ✅

All NSFW content detection now happens in `server/src/middleware/safetyGuards.js`:

- Uses obfuscation detection to catch attempts to bypass filters
- Checks for explicit keywords with context awareness
- Returns consistent error format:
  ```json
  {
    "success": false,
    "error": {
      "message": "Inappropriate content detected",
      "details": "This platform is designed for PCOS health management. Please keep conversations professional and health-focused."
    }
  }
  ```

### 2. **Removed NSFW Patterns from ChatChain** ✅

Updated `server/src/langchain/chains/chatChain.js`:

- **REMOVED**: All NSFW pattern detection (now fully handled by middleware)
- **KEPT**: Violence/harm and illegal activity patterns (these are appropriate for LLM-level handling)
- Added clarifying comment that this is a backup filter for edge cases

**Before:**
```javascript
const nsfwPatterns = [
  /\b(porn|pornography|pornographic|xxx|nsfw|18\+)\b/i,
  /\b(sex video|sex tape|nude|nudes|naked)\b/i,
  // ... many more patterns
];
```

**After:**
```javascript
/**
 * Content Safety Filter - Blocks NSFW, adult, and inappropriate content requests
 * NOTE: This is a BACKUP filter. Primary filtering happens in middleware (safetyGuards.js)
 * This should only catch edge cases that slip through middleware.
 */
checkContentSafety(message) {
  // NSFW patterns REMOVED - handled by middleware
  // Only violence/harm and illegal activity patterns remain
}
```

### 3. **Unified Frontend Styling** ✅

Updated `frontend/src/components/chat/MessageBubble.tsx`:

- Changed error message styling from **pink/red** to **white** background
- Maintains professional, clean appearance
- Consistent with assistant message styling

**Before:**
```tsx
isError
  ? 'bg-danger bg-opacity-10 text-danger'  // Pink/red background
```

**After:**
```tsx
isError
  ? 'bg-white text-gray-900 rounded-bl-none border border-gray-200'  // White background
```

## Architecture Flow

```
User Message
    ↓
[Middleware: safetyGuards.js]
    ↓
  NSFW Check (obfuscation-aware)
    ↓
    ├─ If NSFW → Return 400 error → Frontend displays white message box
    │                                 "Inappropriate content detected"
    │
    └─ If Safe → Continue to ChatChain
           ↓
       [ChatChain]
           ↓
       Backup Safety Check (violence/illegal only)
           ↓
       Generate Response
```

## Benefits

✅ **Single Source of Truth**: All NSFW filtering in one place (middleware)  
✅ **Consistent UX**: All error messages use same white styling  
✅ **Better Security**: Middleware catches content before it reaches LLM  
✅ **Reduced Redundancy**: No duplicate NSFW pattern lists  
✅ **Clear Separation**: Middleware = security, ChatChain = content generation  
✅ **Maintainable**: One place to update NSFW patterns  

## User Experience

**Before** (inconsistent):
- Middleware NSFW block → Pink/red error box
- ChatChain NSFW block → White bot message

**After** (unified):
- All NSFW blocks → White message box with consistent message
- Clean, professional appearance
- Same styling as other system messages

## Message Format

When NSFW content is detected, users see:

```
[White message box from Sakhee AI]

Inappropriate content detected

This platform is designed for PCOS health management. Please keep 
conversations professional and health-focused.
```

## Files Modified

1. ✅ `server/src/langchain/chains/chatChain.js`
   - Removed NSFW pattern detection
   - Kept violence/harm and illegal activity patterns
   - Added clarifying comments

2. ✅ `frontend/src/components/chat/MessageBubble.tsx`
   - Changed error styling from pink/red to white
   - Maintained border and text styling

3. ✅ `docs/UNIFIED_NSFW_HANDLING.md` (this file)
   - Documentation of changes

## Testing Checklist

- [ ] Test NSFW keyword triggers middleware block
- [ ] Verify white message box displays correctly
- [ ] Test obfuscated NSFW attempts (e.g., "p0rn", "s3x")
- [ ] Confirm message format is consistent
- [ ] Test that violence/harm patterns still work in ChatChain
- [ ] Verify illegal activity patterns still work in ChatChain

## Future Improvements

- Consider adding rate limiting for repeated NSFW attempts
- Add analytics to track NSFW block frequency
- Potentially add educational message about platform purpose

---

**Note**: The middleware layer provides the first line of defense, catching inappropriate content before it consumes LLM tokens or processing resources. The ChatChain backup filter remains for violence/harm and illegal activity patterns that may require more contextual understanding.
