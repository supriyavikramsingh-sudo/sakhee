/**
 * Feature Flags Configuration
 * 
 * Central configuration for toggling features on/off during development and rollout.
 * 
 * Usage:
 *   import featureFlags from '../config/featureFlags';
 *   if (featureFlags.enableDailyTrackingCalendar) { ... }
 * 
 * Guidelines:
 * - Start with flags set to `false` for new features
 * - Enable for beta testing, then production rollout
 * - Remove flags once feature is stable and fully deployed
 */

interface FeatureFlags {
  /**
   * Daily Tracking Calendar Enhancement
   * Shows calendar visualization on Progress page
   * Enables editing of entries from last 7 days
   * Status: Phase 1 - Skeleton component
   */
  enableDailyTrackingCalendar: boolean;

  /**
   * Weekly Activity Level Calculation
   * Replaces activity dropdown with Yes/No exercise question
   * Calculates activity level weekly based on exercise days
   * Status: Phase 2 - COMPLETE (Ready for staging deployment)
   */
  enableWeeklyActivityCalculation: boolean;

  /**
   * Conditional Weight Requirement
   * Makes weight field optional for users without weight management goals
   * Status: Not yet implemented (Phase 2)
   */
  enableConditionalWeightRequirement: boolean;

  /**
   * Progressive Entry View
   * Shows read-only summary before allowing edits
   * Status: Not yet implemented (Phase 3)
   */
  enableProgressiveEntryView: boolean;
}

const featureFlags: FeatureFlags = {
  // Phase 1-3 features (ready for testing)
  enableDailyTrackingCalendar: true,  // ✅ Phase 3 COMPLETE - Calendar with data visualization

  // Phase 2 features (ready for deployment)
  enableWeeklyActivityCalculation: false,  // TODO: Enable after Phase 2 deployment

  // Future features (not yet implemented)
  enableConditionalWeightRequirement: false,
  enableProgressiveEntryView: false,
};

export default featureFlags;
