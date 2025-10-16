# Cycle-Dependent Hormones Update

## Summary
Updated the system to properly handle **Estradiol** and **Progesterone** as cycle-dependent hormones. These hormones vary significantly based on the menstrual cycle phase, so severity warnings (normal/abnormal) have been removed. Instead, reference ranges for each cycle phase are displayed for the user to interpret.

---

## Changes Made

### 1. **Backend - parserService.js**
**File**: `server/src/services/parserService.js`

- **Estradiol extraction**: Changed severity from calculated value to `'cycle-dependent'`
- **Progesterone extraction**: Changed severity from calculated value to `'cycle-dependent'`
- **getSeverity() method**: Added check for `ranges.skipSeverity` flag to return `'cycle-dependent'` instead of calculating severity

**Example**:
```javascript
// Before
const severity = this.getSeverity('estradiol', value);
labValues.estradiol = { value, unit: 'pg/mL', severity }; // severity: 'normal' or 'abnormal'

// After
labValues.estradiol = { value, unit: 'pg/mL', severity: 'cycle-dependent' };
```

---

### 2. **Backend - labRanges.js**
**File**: `server/src/utils/labRanges.js`

- **Added `skipSeverity: true`** flag for estradiol and progesterone
- **Added `cycleDependentNote`** property with reference ranges for all cycle phases
- **Updated `getLabSeverity()` function** to check for `skipSeverity` flag and return `'cycle-dependent'`

**Example**:
```javascript
estradiol: {
  follicular: { min: 19.5, max: 144.2 },
  midcycle: { min: 63.9, max: 356.7 },
  luteal: { min: 55.8, max: 214.2 },
  normal: { min: 19.5, max: 356.7 },
  unit: 'pg/mL',
  description: 'Estradiol (E2)',
  cycleDependentNote: 'Follicular: 19.5-144.2 | Mid-cycle: 63.9-356.7 | Luteal: 55.8-214.2 pg/mL',
  skipSeverity: true, // Don't calculate severity - cycle dependent
},
```

---

### 3. **Frontend - ReportAnalysis.jsx**
**File**: `client/src/components/files/ReportAnalysis.jsx`

- **Added `'cycle-dependent'` case** to `getSeverityIcon()` - shows info icon
- **Added `'cycle-dependent'` case** to `getSeverityColor()` - uses info color (blue)
- **Added `'cycle-dependent'` label** to `getSeverityLabel()` - displays "Varies by Cycle Phase"
- **Created `getCycleDependentRanges()` helper** - returns reference ranges for estradiol/progesterone
- **Updated lab value display** - shows reference ranges below cycle-dependent hormones

**UI Changes**:
```jsx
// Cycle-dependent hormones now display:
// 1. Info icon (instead of checkmark/warning)
// 2. Blue border (instead of green/yellow/red)
// 3. "Varies by Cycle Phase" label
// 4. Reference ranges box below the value showing:
//    "Follicular: X-Y | Mid-cycle: A-B | Luteal: C-D pg/mL"
```

---

## Visual Result

### Before:
```
Estradiol
147.78 pg/mL
❌ Abnormal (RED ALERT)
```

### After:
```
Estradiol
147.78 pg/mL
ℹ️ Varies by Cycle Phase (BLUE INFO)

Reference Ranges:
Follicular: 19.5-144.2 | Mid-cycle: 63.9-356.7 | Luteal: 55.8-214.2 pg/mL
```

---

## Affected Hormones

1. **Estradiol (E2)**
   - Follicular phase: 19.5-144.2 pg/mL
   - Mid-cycle (ovulation): 63.9-356.7 pg/mL
   - Luteal phase: 55.8-214.2 pg/mL

2. **Progesterone**
   - Follicular phase: 0.1-0.3 ng/mL
   - Luteal phase: 1.2-25.0 ng/mL

---

## Testing

Verified with PDF containing:
- Estradiol: 147.78 pg/mL → Now shows "cycle-dependent" instead of "normal"
- Progesterone: 22.25 ng/mL → Now shows "cycle-dependent" instead of "abnormal"

Both values now display with:
✅ Info icon (blue)
✅ "Varies by Cycle Phase" label
✅ Reference ranges for user interpretation
✅ No false alarms

---

## Why This Change?

Without knowing the cycle phase (follicular, ovulation, luteal), it's impossible to determine if estradiol or progesterone levels are normal. For example:

- **Estradiol 147.78 pg/mL** could be:
  - High for follicular phase (normal max: 144.2)
  - Normal for mid-cycle (normal range: 63.9-356.7)
  - High for luteal phase (normal max: 214.2)

- **Progesterone 22.25 ng/mL** could be:
  - Very high for follicular phase (normal max: 0.3)
  - Normal for luteal phase (normal range: 1.2-25.0)

By providing reference ranges, users can interpret their values based on where they are in their cycle.

---

## Future Enhancements

Consider adding:
1. **Cycle phase selector** during report upload
2. **Automatic severity calculation** if cycle phase is known
3. **Educational tooltips** explaining menstrual cycle phases
4. **Date-based cycle estimation** if last period date is provided

---

## Files Modified

1. ✅ `server/src/services/parserService.js`
2. ✅ `server/src/utils/labRanges.js`
3. ✅ `client/src/components/files/ReportAnalysis.jsx`

---

## Verification Commands

Test the parser:
```bash
cd server
node test_parser_final.mjs
```

Expected output:
```
✅ estradiol: 147.78 pg/mL [cycle-dependent]
✅ progesterone: 22.25 ng/mL [cycle-dependent]
```

---

## Notes

- Other hormones (LH, FSH, testosterone, etc.) still show normal/elevated/low as they are not significantly affected by cycle phase
- The change only affects estradiol and progesterone
- Backend still extracts and stores these values correctly - only the interpretation/display logic changed
