# Recipe Search UI - End-to-End Testing Guide

**Date:** November 15, 2025  
**Version:** 1.0  
**Status:** Ready for Testing

---

## Overview

This document provides comprehensive test scenarios for the Recipe Search UI integration. Since this requires a running application with Firebase authentication and backend API, **manual testing is required**.

---

## Pre-Testing Setup

### 1. Environment Setup

**Backend Requirements:**
```bash
cd server
npm install
npm start
```

**Frontend Requirements:**
```bash
cd frontend
npm install
npm run dev
```

**Environment Variables Required:**
- Firebase credentials configured
- Spoonacular API key set
- Backend server running on expected port

### 2. Test User Accounts Needed

Create test accounts for each tier:

| Email | Tier | Daily Limit | Purpose |
|-------|------|-------------|---------|
| `free-user@test.com` | FREE | 0 | Test upgrade prompts |
| `pro-user@test.com` | Pro | 5/day | Test Pro functionality |
| `max-user@test.com` | Max | 10/day | Test Max functionality |

**Setup Instructions:**
1. Create users in Firebase Authentication
2. Set subscription tier in Firestore:
   ```
   users/{userId}/profile/subscription/tier: 'free' | 'pro' | 'max'
   ```

### 3. Test Data Setup

**Firestore Collections:**
- `users/{userId}/recipeSearches/{date}` - Usage tracking
- Reset usage counters to test fresh state

---

## Testing Checklist

### ✅ Component Rendering Tests

#### Test 1.1: RecipeSearchButton Visibility
- [ ] Navigate to chat page
- [ ] Verify Recipe Search Button appears above input area
- [ ] Verify "New Chat" button appears next to it
- [ ] Check button alignment (left: Recipe Search, right: New Chat)

**Expected:**
- Both buttons visible
- Recipe Search on left, New Chat on right
- Proper spacing between buttons

---

#### Test 1.2: MealPlanRedirectCard Update
- [ ] Trigger a meal plan redirect response from chat
- [ ] Verify TWO buttons appear: "Search Recipe" and "Create Meal Plan"
- [ ] Check buttons are side-by-side on desktop
- [ ] Resize to mobile (< 640px) and verify buttons stack

**Expected:**
- Two buttons visible
- "Search Recipe" uses outline style
- "Create Meal Plan" uses primary style
- Responsive layout works

---

### ✅ FREE User Flow Tests

#### Test 2.1: FREE User - Button State
**Login as:** `free-user@test.com`

- [ ] Observe Recipe Search Button state
- [ ] Verify button shows lock icon
- [ ] Verify button text shows "Recipe Search"
- [ ] Verify button is disabled (cursor not allowed)

**Expected:**
- Lock icon visible
- Button grayed out
- No usage counter shown

---

#### Test 2.2: FREE User - Hover Tooltip
**Login as:** `free-user@test.com`

- [ ] Hover over Recipe Search Button
- [ ] Verify tooltip appears above button
- [ ] Check tooltip content:
  - Title: "Recipe Search - Pro Feature"
  - Description about PCOS-friendly recipes
  - Two tier options: Pro (5/day) and Max (10/day)
  - Two buttons: "Upgrade to Pro" and "Upgrade to Max"

**Expected:**
- Tooltip appears on hover
- Content is clear and readable
- Yellow lock icon visible
- Green/Blue dots for tier indicators

---

#### Test 2.3: FREE User - Upgrade Navigation
**Login as:** `free-user@test.com`

- [ ] Hover tooltip, click "Upgrade to Pro"
- [ ] Verify navigates to `/pricing` page
- [ ] Return to chat
- [ ] Hover tooltip, click "Upgrade to Max"
- [ ] Verify navigates to `/pricing` page

**Expected:**
- Both upgrade buttons navigate correctly
- Page transitions smooth

---

#### Test 2.4: FREE User - Click Disabled Button
**Login as:** `free-user@test.com`

- [ ] Click the Recipe Search Button (it's disabled)
- [ ] Verify nothing happens (button should not respond)
- [ ] No error messages appear

**Expected:**
- Button does not respond to clicks
- No console errors

---

### ✅ Pro User Flow Tests

#### Test 3.1: Pro User - Initial State (5/5 Available)
**Login as:** `pro-user@test.com` (ensure fresh daily limit)

- [ ] Observe Recipe Search Button
- [ ] Verify button shows "Recipe Search · 5/5"
- [ ] Verify button is enabled (cursor pointer)
- [ ] Verify button uses primary color

**Expected:**
- Button shows full counter (5/5)
- Button is clickable
- No tooltip on hover

---

#### Test 3.2: Pro User - Open Dish Input
**Login as:** `pro-user@test.com`

- [ ] Click Recipe Search Button
- [ ] Verify DishNameInputCard appears in chat
- [ ] Check card elements:
  - Title: "What dish would you like to search?"
  - Input field with placeholder
  - Help text: "Tip: Be specific..."
  - Usage counter: "5/5 searches remaining today"
  - Two buttons: Cancel and Search

**Expected:**
- Card appears smoothly
- Input has auto-focus
- All elements visible and styled correctly

---

#### Test 3.3: Pro User - Input Validation
**Login as:** `pro-user@test.com`

**Test 3.3a: Empty Input**
- [ ] Leave input empty, click Search
- [ ] Verify error: "Please enter a dish name"
- [ ] Verify Search button disabled when empty

**Test 3.3b: Too Short (1 character)**
- [ ] Type "a"
- [ ] Verify error: "Dish name must be at least 2 characters"
- [ ] Verify Search button disabled

**Test 3.3c: Valid Input**
- [ ] Type "chicken biryani" (15 characters)
- [ ] Verify no error message
- [ ] Verify Search button enabled
- [ ] Verify character count updates

**Test 3.3d: Too Long (>100 characters)**
- [ ] Type 101 characters
- [ ] Verify error message appears
- [ ] Verify Search button disabled

**Expected:**
- Validation works in real-time
- Error messages clear and helpful
- Button states match validation

---

#### Test 3.4: Pro User - Clear Button
**Login as:** `pro-user@test.com`

- [ ] Type "test dish" in input
- [ ] Verify X (clear) button appears on right
- [ ] Click clear button
- [ ] Verify input clears
- [ ] Verify clear button disappears

**Expected:**
- Clear button only visible when input has text
- Clicking clears input immediately

---

#### Test 3.5: Pro User - Cancel Action
**Login as:** `pro-user@test.com`

- [ ] Click Recipe Search Button
- [ ] Input card appears
- [ ] Click Cancel button
- [ ] Verify card disappears
- [ ] Verify no API call made (check Network tab)

**Expected:**
- Card closes smoothly
- No backend request
- Button counter unchanged

---

#### Test 3.6: Pro User - Keyboard Navigation
**Login as:** `pro-user@test.com`

**Test 3.6a: Enter Key Submit**
- [ ] Click Recipe Search Button
- [ ] Type "masala dosa"
- [ ] Press Enter key
- [ ] Verify search submits

**Test 3.6b: Escape Key Cancel**
- [ ] Click Recipe Search Button
- [ ] Type "test"
- [ ] Press Escape key
- [ ] Verify card closes

**Expected:**
- Enter submits form
- Escape closes card

---

#### Test 3.7: Pro User - Successful Recipe Search
**Login as:** `pro-user@test.com`

- [ ] Click Recipe Search Button
- [ ] Enter "chicken biryani"
- [ ] Click Search button
- [ ] Verify loading state (spinner in button)
- [ ] Wait for response
- [ ] Verify RecipeResultCard(s) appear in chat
- [ ] Check card content:
  - Recipe title
  - Ready time, servings, health score
  - Nutrition facts (Calories, Protein, Carbs, Fat)
  - **PCOS Modifications section** (visually distinct)
  - "View Full Recipe" button
  - Usage counter updated

**Expected:**
- Loading state shows briefly
- Recipe card appears with all sections
- PCOS section has green-blue gradient background
- PCOS section has left green border (4px)
- PCOS badge visible
- Usage counter shows 4/5 after search

---

#### Test 3.8: Pro User - PCOS Section Visual Verification
**Login as:** `pro-user@test.com` (after successful search)

**Visual Checks:**
- [ ] Verify PCOS section background is green-blue gradient
- [ ] Verify left border is 4px solid green
- [ ] Verify "PCOS-Friendly" badge is present (green background, white text)
- [ ] Verify section has increased padding vs other sections
- [ ] Verify section is clearly distinct from rest of card

**Content Checks:**
- [ ] Regional substitutes show original → substitute format
- [ ] Cooking improvements listed
- [ ] Portion guidance provided
- [ ] Glycemic control tips present

**Expected:**
- PCOS section extremely clear and visually separated
- All subsections have content
- NO emojis anywhere in card

---

#### Test 3.9: Pro User - Multiple Searches
**Login as:** `pro-user@test.com`

- [ ] Perform search #1: "palak paneer" → Verify 4/5 remaining
- [ ] Perform search #2: "dal makhani" → Verify 3/5 remaining
- [ ] Perform search #3: "butter chicken" → Verify 2/5 remaining
- [ ] Perform search #4: "aloo gobi" → Verify 1/5 remaining
- [ ] Perform search #5: "chole bhature" → Verify 0/5 remaining

**Expected:**
- Counter decrements correctly after each search
- All searches return results
- Button shows "0/5" after 5th search
- Button becomes disabled at 0/5

---

#### Test 3.10: Pro User - Rate Limit Reached
**Login as:** `pro-user@test.com` (after 5 searches)

- [ ] Verify Recipe Search Button shows "Recipe Search · 0/5"
- [ ] Verify button is disabled
- [ ] Click button (should not respond)
- [ ] Verify no input card appears
- [ ] Check if error card shows (might auto-show)

**Expected:**
- Button disabled at 0/5
- No interaction possible
- Clear indication of exhausted limit

---

#### Test 3.11: Pro User - Try Search When Rate Limited
**Login as:** `pro-user@test.com` (at 0/5)

- [ ] Somehow trigger Recipe Search (via button if clickable)
- [ ] Verify RecipeErrorCard appears
- [ ] Check error card content:
  - Type: "rateLimited"
  - Clock icon
  - Message about daily limit reached
  - Countdown timer to midnight IST
  - Suggestion to upgrade to Max
  - "Upgrade to Max" button

**Expected:**
- Error card shows rate limit message
- Countdown timer is functional (updates every second)
- Upgrade button navigates to pricing

---

#### Test 3.12: Pro User - View Full Recipe Button
**Login as:** `pro-user@test.com` (with recipe card visible)

- [ ] Locate "View Full Recipe" button at bottom of recipe card
- [ ] Click button
- [ ] Verify opens Spoonacular recipe page in new tab
- [ ] Verify original tab remains on chat

**Expected:**
- External link opens in new tab
- Link works correctly
- No errors in console

---

### ✅ Max User Flow Tests

#### Test 4.1: Max User - Initial State (10/10 Available)
**Login as:** `max-user@test.com` (ensure fresh daily limit)

- [ ] Observe Recipe Search Button
- [ ] Verify button shows "Recipe Search · 10/10"
- [ ] Verify button is enabled

**Expected:**
- Button shows 10/10
- Fully functional

---

#### Test 4.2: Max User - Perform Searches
**Login as:** `max-user@test.com`

- [ ] Perform 10 consecutive searches with different dishes
- [ ] Verify counter decrements each time
- [ ] After 10th search, verify button shows 0/10 and is disabled

**Expected:**
- Max users get 10 searches/day
- Counter accurate throughout

---

#### Test 4.3: Max User - Rate Limit Error
**Login as:** `max-user@test.com` (at 0/10)

- [ ] Attempt to search (if possible)
- [ ] Verify error card shows rate limit message
- [ ] Check that message is different from Pro (no upgrade suggestion)

**Expected:**
- Error acknowledges Max tier
- No upgrade prompts (already at highest tier)
- Reset time shown

---

### ✅ Error Handling Tests

#### Test 5.1: Recipe Not Found
**Login as:** `pro-user@test.com`

- [ ] Search for non-existent dish: "xyznotarealrecipe123"
- [ ] Verify RecipeErrorCard appears
- [ ] Check error card:
  - Type: "notFound"
  - Info icon
  - Message: "No recipes found for 'xyznotarealrecipe123'"
  - Helpful tips (3 bullets)
  - Note: "Good news: This didn't count against your daily limit"
  - "Try Again" button
- [ ] Verify usage counter DID NOT decrement

**Expected:**
- Error card shows helpful message
- Usage counter unchanged
- Try Again button reopens input card

---

#### Test 5.2: Network Error / API Failure
**Login as:** `pro-user@test.com`

**Simulate network failure:**
- [ ] Disconnect internet or stop backend server
- [ ] Search for "test dish"
- [ ] Verify RecipeErrorCard appears
- [ ] Check error card:
  - Type: "apiError"
  - Alert icon
  - Generic error message
  - "Try Again" button
  - Optional: Technical details (collapsible)

**Expected:**
- Error card handles API failure gracefully
- User-friendly message
- Try Again option available

---

#### Test 5.3: Error Recovery - Try Again
**Login as:** `pro-user@test.com`

- [ ] Trigger an error (not found or API)
- [ ] Click "Try Again" button on error card
- [ ] Verify error card disappears
- [ ] Verify DishNameInputCard reappears
- [ ] Input field should be empty (fresh start)

**Expected:**
- Smooth transition from error to retry
- Previous input cleared
- User can start fresh

---

#### Test 5.4: Error Recovery - Upgrade Button
**Login as:** `free-user@test.com`

- [ ] Trigger upgrade required error (click disabled button)
- [ ] Error card should show
- [ ] Click "Upgrade to Pro" or "Upgrade to Max" button
- [ ] Verify navigation to pricing page

**Expected:**
- Upgrade buttons work from error card
- Seamless navigation

---

### ✅ Data Persistence Tests

#### Test 6.1: Recipe Cards Persist in Chat History
**Login as:** `pro-user@test.com`

- [ ] Perform a recipe search
- [ ] Recipe card appears
- [ ] Refresh the page
- [ ] Verify chat history loads
- [ ] Verify recipe card reappears with same data

**Expected:**
- Recipe results saved to Firestore
- Cards reload correctly after refresh

---

#### Test 6.2: Usage Counter Persists
**Login as:** `pro-user@test.com`

- [ ] Perform 2 searches (counter shows 3/5)
- [ ] Close browser
- [ ] Reopen and login
- [ ] Verify Recipe Search Button shows 3/5

**Expected:**
- Usage counter persists across sessions
- Accurate count maintained

---

#### Test 6.3: Daily Reset Verification
**Login as:** `pro-user@test.com`

**Setup:** Set system time to 11:59 PM IST, use 5 searches

- [ ] At 11:59 PM IST, verify counter at 0/5
- [ ] Wait until 12:00 AM IST (midnight)
- [ ] Refresh page
- [ ] Verify counter resets to 5/5

**Note:** This may require backend test setup or manual Firestore manipulation

**Expected:**
- Counter resets to full at midnight IST
- Previous day's usage cleared

---

### ✅ Cache Behavior Tests

#### Test 7.1: Cached Recipe Search
**Login as:** `pro-user@test.com`

- [ ] Search for "chicken biryani"
- [ ] Counter decrements to 4/5
- [ ] Immediately search for "chicken biryani" again
- [ ] Check Network tab: Should use cached response
- [ ] Counter decrements to 3/5 (cache hit still counts)

**Expected:**
- Backend returns cached result (faster)
- Usage counter still decrements
- User sees same results quickly

---

### ✅ Responsive Design Tests

#### Test 8.1: Desktop Layout (1920x1080)
- [ ] Recipe Search Button + New Chat button side-by-side
- [ ] MealPlanRedirectCard buttons side-by-side
- [ ] Recipe card nutrition grid: 4 columns
- [ ] All cards fit width properly
- [ ] No horizontal scroll

**Expected:**
- Optimal desktop layout
- All content readable
- Proper spacing

---

#### Test 8.2: Tablet Layout (768px)
- [ ] Resize browser to 768px width
- [ ] Verify Recipe Search Button responsive
- [ ] MealPlanRedirectCard buttons still side-by-side (should be)
- [ ] Recipe card nutrition grid: 4 columns (might be 2)
- [ ] All text readable

**Expected:**
- Layout adapts smoothly
- No overflow issues

---

#### Test 8.3: Mobile Layout (375px - iPhone SE)
- [ ] Resize to 375px width
- [ ] Recipe Search Button fits properly
- [ ] New Chat button still visible
- [ ] MealPlanRedirectCard buttons stack vertically
- [ ] DishNameInputCard fits width
- [ ] Recipe card nutrition grid: 2 columns
- [ ] PCOS section readable
- [ ] Error cards fit properly
- [ ] Buttons stack if needed

**Expected:**
- Full mobile functionality
- No horizontal scroll
- All buttons tappable (min 44px touch target)
- Text readable without zoom

---

#### Test 8.4: Very Small Mobile (320px)
- [ ] Resize to 320px (smallest common width)
- [ ] Verify all components still usable
- [ ] Text doesn't overflow
- [ ] Buttons still clickable

**Expected:**
- Degrades gracefully
- Core functionality intact

---

### ✅ Accessibility Tests

#### Test 9.1: Keyboard Navigation
**Full keyboard flow:**
- [ ] Tab to Recipe Search Button
- [ ] Press Enter to open input card
- [ ] Tab to input field (should auto-focus)
- [ ] Type "test dish"
- [ ] Tab to Clear button
- [ ] Tab to Cancel button
- [ ] Tab to Search button
- [ ] Press Enter to submit
- [ ] Verify all interactions work without mouse

**Expected:**
- Full keyboard accessibility
- Logical tab order
- Enter/Escape shortcuts work

---

#### Test 9.2: Screen Reader Test (Optional)
**With screen reader enabled:**
- [ ] Navigate to Recipe Search Button
- [ ] Verify button label announced
- [ ] Verify tier/usage announced
- [ ] Open input card
- [ ] Verify labels announced
- [ ] Submit search
- [ ] Verify loading state announced
- [ ] Verify recipe card content accessible

**Expected:**
- All interactive elements have labels
- State changes announced
- Content structure logical

---

#### Test 9.3: Focus Indicators
- [ ] Tab through all interactive elements
- [ ] Verify focus ring visible on each
- [ ] Check contrast of focus indicators

**Expected:**
- Clear focus indicators
- Sufficient contrast

---

### ✅ Regression Tests (Existing Features)

#### Test 10.1: Regular Chat Still Works
**Login as any user**

- [ ] Send a normal chat message (not recipe-related)
- [ ] Verify AI responds normally
- [ ] Check message bubbles render correctly
- [ ] Source citations still appear if present

**Expected:**
- No impact on existing chat functionality
- All features work as before

---

#### Test 10.2: Meal Plan Redirect Still Works
**Login as any user**

- [ ] Trigger a meal plan redirect (ask for meal plan)
- [ ] Verify MealPlanRedirectCard appears
- [ ] Verify both buttons work:
  - "Search Recipe" → Opens recipe search input
  - "Create Meal Plan" → Navigates to meal plan page

**Expected:**
- Both buttons functional
- No breaking changes

---

#### Test 10.3: New Chat Button Still Works
- [ ] Have some chat history
- [ ] Click "New Chat" button
- [ ] Verify confirmation dialog appears
- [ ] Confirm
- [ ] Verify chat clears
- [ ] Recipe Search Button still present

**Expected:**
- Chat clearing works
- Recipe Search Button state resets (if needed)

---

#### Test 10.4: Message Bubbles Unchanged
- [ ] Send various messages
- [ ] Verify user messages still styled correctly
- [ ] Verify AI responses styled correctly
- [ ] Verify timestamps appear
- [ ] No layout issues with new buttons

**Expected:**
- Existing message rendering intact
- No visual regressions

---

### ✅ Performance Tests

#### Test 11.1: Initial Load Time
- [ ] Clear cache
- [ ] Load chat page
- [ ] Measure time to interactive
- [ ] Verify no excessive loading

**Expected:**
- Page loads in reasonable time (<3s on good connection)
- No blocking JS

---

#### Test 11.2: Search Response Time
- [ ] Perform a recipe search
- [ ] Measure time from click to results
- [ ] First search (no cache): Should be <5s
- [ ] Cached search: Should be <1s

**Expected:**
- Acceptable response times
- Loading states show during wait

---

#### Test 11.3: Memory Leaks
- [ ] Perform 20+ searches in a row
- [ ] Check browser memory usage (DevTools)
- [ ] Verify no significant memory growth

**Expected:**
- Memory stays stable
- No leaks from component mounting/unmounting

---

## Test Results Template

Use this template to record test results:

```markdown
## Test Session: [Date/Time]
**Tester:** [Name]
**Environment:** [Browser, OS, Screen Size]

### Results Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

### Failed Tests
1. Test ID: [X.X]
   - Issue: [Description]
   - Steps to Reproduce: [...]
   - Expected: [...]
   - Actual: [...]
   - Severity: [Critical/High/Medium/Low]

### Bugs Found
1. [Bug description]
   - Component: [...]
   - Severity: [...]
   - Screenshot: [Link if available]

### Notes
- [Any observations]
- [Performance notes]
- [UX feedback]
```

---

## Critical Path Testing (Quick Smoke Test)

If time is limited, test these critical scenarios first:

### Quick Test Suite (15 minutes)

1. ✅ **FREE User Block** (2 min)
   - Login as FREE user
   - Verify button disabled with tooltip
   - Click upgrade button

2. ✅ **Pro User Happy Path** (5 min)
   - Login as Pro user
   - Click Recipe Search → Input appears
   - Search "chicken biryani" → Recipe appears
   - Verify PCOS section distinct
   - Check counter decrements

3. ✅ **Error Handling** (3 min)
   - Search "xyznotreal" → Not found error
   - Verify usage unchanged
   - Click Try Again → Input reopens

4. ✅ **Mobile Responsive** (2 min)
   - Resize to 375px
   - Verify layout adapts
   - Buttons still work

5. ✅ **Regression Check** (3 min)
   - Send normal chat message
   - Trigger meal plan redirect
   - Clear chat
   - Verify all existing features work

---

## Browser Compatibility

Test on these browsers (minimum):

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Known Limitations

**Items that cannot be fully tested without production setup:**
1. Midnight IST reset (requires time manipulation or waiting)
2. Large-scale concurrent usage (load testing)
3. Spoonacular API rate limits (external dependency)
4. Firebase quota limits

**Workarounds:**
- Manual Firestore manipulation for reset testing
- Small-scale concurrency can be simulated
- Mock API responses if needed

---

## Post-Testing Actions

After completing tests:

1. **Document Issues:**
   - Create GitHub issues for bugs
   - Prioritize by severity
   - Assign to developers

2. **Update Documentation:**
   - Note any UX improvements discovered
   - Update user guide if needed

3. **Create Demo Video** (Optional):
   - Record successful flow
   - Show all features
   - Use for stakeholder demo

4. **Sign-Off:**
   - Product owner approval
   - Design team approval
   - Technical lead approval

---

## Success Criteria

Recipe Search UI is ready for production if:

- ✅ All critical path tests pass
- ✅ Zero blocking bugs
- ✅ Less than 3 minor bugs
- ✅ Performance acceptable (<5s response)
- ✅ Mobile responsive works
- ✅ No regressions in existing features
- ✅ Accessibility standards met (WCAG AA)
- ✅ PCOS section visually distinct (key requirement)
- ✅ NO emojis found anywhere
- ✅ All tiers (FREE/Pro/Max) functional

---

## Final Notes

**Remember:**
- Test with real data where possible
- Try edge cases and unusual inputs
- Consider user perspective (not just technical correctness)
- Document UX feedback even if functionality works
- Take screenshots of any visual issues

**Good luck with testing!** 🧪

---

**Testing Guide Version:** 1.0  
**Last Updated:** November 15, 2025  
**Status:** Ready for Manual Testing
