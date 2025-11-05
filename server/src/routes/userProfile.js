import express from 'express';
import { collection, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('UserProfileRoutes');

/**
 * Middleware to verify authentication
 * For now, we expect userId to be passed in the request body or query
 * TODO: Implement proper Firebase Admin SDK authentication
 */
const verifyAuth = async (req, res, next) => {
  try {
    // For now, get userId from request body or query params
    // In a production environment, you should verify the Firebase token
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized: No user ID provided' },
      });
    }

    req.userId = userId;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { message: 'Authentication error' },
    });
  }
};

/**
 * Helper function to calculate age from age range string
 */
function getAgeFromRange(ageRange) {
  const ageRangeMap = {
    '18-24': 21,
    '25-29': 27,
    '30-34': 32,
    '35-39': 37,
    '40-45': 42.5,
    '56+': 60,
  };
  return ageRangeMap[ageRange] || 30;
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation for women
 */
function calculateBMR(weight_kg, height_cm, age_years) {
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age_years - 161;
  return Math.round(bmr);
}

/**
 * Calculate TDEE using activity multipliers
 */
function calculateTDEE(bmr, activityLevel) {
  const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.465,
    very: 1.55,
  };

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate daily calorie requirement based on weight goal
 */
function calculateDailyCalories(tdee, weightGoal) {
  switch (weightGoal) {
    case 'lose':
      return Math.round(tdee - 500);
    case 'gain':
      return Math.round(tdee + 500);
    case 'maintain':
    default:
      return tdee;
  }
}

/**
 * Calculate BMI
 */
function calculateBMI(weight_kg, height_cm) {
  const height_m = height_cm / 100;
  const bmi = weight_kg / (height_m * height_m);
  return Math.round(bmi * 10) / 10;
}

/**
 * Validate BMI is within healthy range (18.5 - 24.9)
 */
function validateBMI(bmi) {
  if (bmi < 18.5) {
    return {
      isHealthy: false,
      message: `Your target weight results in a BMI of ${bmi}, which is below the healthy range (18.5-24.9).`,
    };
  } else if (bmi > 24.9) {
    return {
      isHealthy: false,
      message: `Your target weight results in a BMI of ${bmi}, which is above the healthy range (18.5-24.9).`,
    };
  } else {
    return {
      isHealthy: true,
      message: `Target BMI of ${bmi} is within the healthy range.`,
    };
  }
}

/**
 * GET /api/user/profile
 * Fetch complete user profile from Firestore
 */
router.get('/profile', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Fetching user profile', { userId });

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      logger.warn('User profile not found', { userId });
      return res.status(404).json({
        success: false,
        error: { message: 'User profile not found' },
      });
    }

    const userData = userDoc.data();

    logger.info('User profile fetched successfully', { userId });

    res.json({
      success: true,
      data: {
        ...userData,
        userId,
        updatedAt: userData.updatedAt?.toDate?.() || null,
        onboardedAt: userData.onboardedAt?.toDate?.() || null,
        calculated_at: userData.calculated_at?.toDate?.() || null,
      },
    });
  } catch (error) {
    logger.error('Get user profile failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch user profile',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/user/profile
 * Update user profile with validation and metric recalculation
 */
router.put('/profile', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    logger.info('Updating user profile', { userId, updates: Object.keys(updates) });

    // Validation errors object
    const validationErrors = {};

    // Get current user data for comparison
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: { message: 'User profile not found' },
      });
    }

    const currentData = userDoc.data();

    // Merge updates with current profileData
    const updatedProfileData = {
      ...(currentData.profileData || {}),
      ...updates,
    };

    // Prevent email updates
    if (updates.email && updates.email !== currentData.profileData?.email) {
      validationErrors.email = 'Email cannot be modified';
    }

    // Validate age group if provided
    if (updates.age) {
      const validAgeRanges = ['18-24', '25-29', '30-34', '35-39', '40-45', '56+'];
      if (!validAgeRanges.includes(updates.age)) {
        validationErrors.age = 'Invalid age range';
      }
    }

    // Validate height if provided
    if (updates.height_cm !== undefined) {
      const height = parseFloat(updates.height_cm);
      if (isNaN(height) || height < 100 || height > 250) {
        validationErrors.height_cm = 'Height must be between 100 and 250 cm';
      }
    }

    // Validate current weight if provided
    if (updates.current_weight_kg !== undefined) {
      const weight = parseFloat(updates.current_weight_kg);
      if (isNaN(weight) || weight < 30 || weight > 200) {
        validationErrors.current_weight_kg = 'Weight must be between 30 and 200 kg';
      }
    }

    // Validate diet type if provided
    if (updates.dietType) {
      const validDietTypes = ['vegetarian', 'non-vegetarian', 'vegan', 'jain'];
      if (!validDietTypes.includes(updates.dietType)) {
        validationErrors.dietType = 'Invalid diet type';
      }
    }

    // Validate activity level if provided
    if (updates.activityLevel) {
      const validActivityLevels = ['sedentary', 'light', 'moderate', 'very'];
      if (!validActivityLevels.includes(updates.activityLevel)) {
        validationErrors.activityLevel = 'Invalid activity level';
      }
    }

    // Validate primary goals if provided
    if (updates.goals) {
      if (!Array.isArray(updates.goals) || updates.goals.length === 0) {
        validationErrors.goals = 'At least one primary goal is required';
      } else if (updates.goals.length > 2) {
        validationErrors.goals = 'Maximum 2 primary goals allowed';
      }
    }

    // Handle conditional fields
    const finalGoals = updates.goals || currentData.profileData?.goals || [];

    // If weight management is not in goals, clear weight_goal and target_weight_kg
    if (!finalGoals.includes('weight-management')) {
      updatedProfileData.weight_goal = null;
      updatedProfileData.target_weight_kg = null;
    }

    // If weight_goal is maintain, clear target_weight_kg
    if (updates.weight_goal === 'maintain') {
      updatedProfileData.target_weight_kg = null;
    }

    // Validate target weight and BMI if provided
    const finalHeight = updates.height_cm || currentData.profileData?.height_cm;
    const finalTargetWeight = updates.target_weight_kg || updatedProfileData.target_weight_kg;

    if (finalTargetWeight && finalHeight) {
      const targetWeight = parseFloat(finalTargetWeight);

      if (isNaN(targetWeight) || targetWeight < 30 || targetWeight > 200) {
        validationErrors.target_weight_kg = 'Target weight must be between 30 and 200 kg';
      } else {
        // Validate BMI
        const targetBMI = calculateBMI(targetWeight, parseFloat(finalHeight));
        const bmiValidation = validateBMI(targetBMI);

        if (!bmiValidation.isHealthy) {
          validationErrors.target_weight_kg = bmiValidation.message;
        }
      }
    }

    // If validation errors exist, return them
    if (Object.keys(validationErrors).length > 0) {
      logger.warn('Validation errors', { userId, validationErrors });
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          fieldErrors: validationErrors,
        },
      });
    }

    // Recalculate metrics if height, weight, or activity changed
    let calculatedMetrics = {};
    const needsRecalculation =
      updates.height_cm !== undefined ||
      updates.current_weight_kg !== undefined ||
      updates.activityLevel !== undefined ||
      updates.age !== undefined ||
      updates.weight_goal !== undefined ||
      updates.target_weight_kg !== undefined;

    if (needsRecalculation) {
      const height = parseFloat(updatedProfileData.height_cm);
      const weight = parseFloat(updatedProfileData.current_weight_kg);
      const ageRange = updatedProfileData.age;
      const activityLevel = updatedProfileData.activityLevel;
      const weightGoal = updatedProfileData.weight_goal || 'maintain';
      const targetWeight = parseFloat(updatedProfileData.target_weight_kg || weight);

      if (height && weight && ageRange && activityLevel) {
        const calculated_age = getAgeFromRange(ageRange);
        const bmr = calculateBMR(weight, height, calculated_age);
        const tdee = calculateTDEE(bmr, activityLevel);
        const daily_calorie_requirement = calculateDailyCalories(tdee, weightGoal);
        const current_bmi = calculateBMI(weight, height);
        const target_bmi = calculateBMI(targetWeight, height);

        calculatedMetrics = {
          calculated_age,
          bmr,
          tdee,
          daily_calorie_requirement,
          current_bmi,
          target_bmi,
          calculated_at: serverTimestamp(),
        };

        logger.info('Metrics recalculated', {
          userId,
          bmr,
          tdee,
          daily_calorie_requirement,
        });
      }
    }

    // Update Firestore document
    const updateData = {
      profileData: updatedProfileData,
      ...calculatedMetrics,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, updateData);

    // Fetch updated profile
    const updatedDoc = await getDoc(userRef);
    const updatedData = updatedDoc.data();

    logger.info('User profile updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...updatedData,
        userId,
        updatedAt: updatedData.updatedAt?.toDate?.() || null,
        onboardedAt: updatedData.onboardedAt?.toDate?.() || null,
        calculated_at: updatedData.calculated_at?.toDate?.() || null,
      },
    });
  } catch (error) {
    logger.error('Update user profile failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update user profile',
        details: error.message,
      },
    });
  }
});

export default router;
