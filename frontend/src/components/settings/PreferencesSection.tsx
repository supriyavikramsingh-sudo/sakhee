import { Alert, Spin } from 'antd';
import { ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QuestionField from '../onboarding/QuestionField';
import { regionalCuisineConfig } from '../../config/regionalCuisineConfig';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { calculateBMI, validateBMI } from '../../utils/calorieCalculations';

const PreferencesSection = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Edit state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Available states for regional cuisine
  const [availableStates, setAvailableStates] = useState<any[]>([]);
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['personalInfo', 'healthProfile', 'dietLifestyle', 'goalsBudget', 'preferences'])
  );

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.uid) return;
    
    setIsLoadingProfile(true);
    setErrorMessage(null);
    
    try {
      const response: any = await apiClient.getUserProfileSettings(user.uid);
      
      if (response.success) {
        setUserProfile(response.data);
      } else {
        setErrorMessage('Failed to load profile');
      }
    } catch (error: any) {
      console.error('Load profile error:', error);
      setErrorMessage(error.message || 'Failed to load profile. Please try again.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Update available states when regions change
  useEffect(() => {
    if (editingSection === 'preferences' && editedData.regions) {
      const states = regionalCuisineConfig.getStatesForRegions(editedData.regions);
      setAvailableStates(states);
      
      // Remove selected states that are no longer available
      if (editedData.cuisineStates && editedData.cuisineStates.length > 0) {
        const availableStateIds = states.map((s) => s.id);
        const filteredStates = editedData.cuisineStates.filter((id) =>
          availableStateIds.includes(id)
        );
        if (filteredStates.length !== editedData.cuisineStates.length) {
          setEditedData((prev) => ({
            ...prev,
            cuisineStates: filteredStates,
          }));
        }
      }
    }
  }, [editedData.regions, editingSection]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const startEditing = (section: string) => {
    if (!userProfile) return;
    
    setEditingSection(section);
    setValidationErrors({});
    setSuccessMessage(null);
    setErrorMessage(null);
    
    // Pre-populate edit data based on section
    const profileData = userProfile.profileData || {};
    
    switch (section) {
      case 'personalInfo':
        setEditedData({
          email: profileData.email || '',
          age: profileData.age || '',
          location: profileData.location || '',
        });
        break;
      case 'healthProfile':
        setEditedData({
          diagnosisTime: profileData.diagnosisTime || '',
          symptoms: profileData.symptoms || [],
          height_cm: profileData.height_cm || '',
          current_weight_kg: profileData.current_weight_kg || '',
        });
        break;
      case 'dietLifestyle':
        setEditedData({
          dietType: profileData.dietType || '',
          activityLevel: profileData.activityLevel || '',
          allergies: profileData.allergies || [],
        });
        break;
      case 'goalsBudget':
        setEditedData({
          goals: profileData.goals || [],
          weight_goal: profileData.weight_goal || '',
          target_weight_kg: profileData.target_weight_kg || '',
          income: profileData.income || '',
        });
        break;
      case 'preferences':
        setEditedData({
          language: profileData.language || '',
          regions: profileData.regions || [],
          cuisineStates: profileData.cuisineStates || [],
        });
        break;
    }
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditedData({});
    setValidationErrors({});
  };

  const handleFieldChange = (key: string, value: any) => {
    setEditedData((prev) => {
      const newData = {
        ...prev,
        [key]: value,
      };

      // Handle conditional fields
      if (key === 'regions') {
        newData.cuisineStates = [];
      }

      if (key === 'goals' && !value?.includes('weight-management')) {
        delete newData.weight_goal;
        delete newData.target_weight_kg;
        setValidationErrors((prev) => {
          const { target_weight_kg, ...rest } = prev;
          return rest;
        });
      }

      if (key === 'weight_goal' && value === 'maintain') {
        delete newData.target_weight_kg;
        setValidationErrors((prev) => {
          const { target_weight_kg, ...rest } = prev;
          return rest;
        });
      }

      // Validate target weight BMI
      if (key === 'target_weight_kg') {
        const height = editedData.height_cm || userProfile?.profileData?.height_cm;
        if (height && value) {
          const bmi = calculateBMI(parseFloat(value), parseFloat(height));
          const validation = validateBMI(bmi);
          
          if (!validation.isHealthy) {
            setValidationErrors((prev) => ({
              ...prev,
              target_weight_kg: validation.message,
            }));
          } else {
            setValidationErrors((prev) => {
              const { target_weight_kg, ...rest } = prev;
              return rest;
            });
          }
        }
      }

      return newData;
    });
  };

  const saveSection = async () => {
    if (!userProfile || !editingSection || !user?.uid) return;

    // Final validation
    const errors: any = {};
    
    // Section-specific validation
    if (editingSection === 'personalInfo') {
      if (!editedData.age) errors.age = 'Age is required';
    }
    
    if (editingSection === 'healthProfile') {
      if (!editedData.diagnosisTime) errors.diagnosisTime = 'Diagnosis date is required';
      if (!editedData.height_cm) errors.height_cm = 'Height is required';
      if (!editedData.current_weight_kg) errors.current_weight_kg = 'Weight is required';
    }
    
    if (editingSection === 'dietLifestyle') {
      if (!editedData.dietType) errors.dietType = 'Diet type is required';
      if (!editedData.activityLevel) errors.activityLevel = 'Activity level is required';
    }
    
    if (editingSection === 'goalsBudget') {
      if (!editedData.goals || editedData.goals.length === 0) {
        errors.goals = 'At least one goal is required';
      }
      if (!editedData.income) errors.income = 'Income range is required';
      
      if (editedData.goals?.includes('weight-management') && !editedData.weight_goal) {
        errors.weight_goal = 'Weight goal is required when weight management is selected';
      }
    }
    
    if (editingSection === 'preferences') {
      if (!editedData.language) errors.language = 'Language is required';
      if (!editedData.regions || editedData.regions.length === 0) {
        errors.regions = 'At least one region is required';
      }
    }

    if (Object.keys(errors).length > 0 || Object.keys(validationErrors).length > 0) {
      setValidationErrors({ ...errors, ...validationErrors });
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Convert cuisineStates to cuisines array if in preferences section
      let finalData = { ...editedData };
      
      if (editingSection === 'preferences' && editedData.cuisineStates) {
        const cuisines = regionalCuisineConfig.getCuisinesFromStates(editedData.cuisineStates);
        finalData.cuisines = cuisines;
      }

      const response: any = await apiClient.updateUserProfileSettings(user.uid, finalData);

      if (response.success) {
        setUserProfile(response.data);
        setSuccessMessage('✓ Changes saved successfully');
        
        // Check for metric changes that affect meal plans
        const metricsChanged = 
          editedData.height_cm !== undefined ||
          editedData.current_weight_kg !== undefined ||
          editedData.activityLevel !== undefined ||
          editedData.weight_goal !== undefined ||
          editedData.target_weight_kg !== undefined;

        if (metricsChanged && response.data.daily_calorie_requirement) {
          setSuccessMessage(
            `✓ Changes saved. Your personalized calorie target has been updated to ${response.data.daily_calorie_requirement} kcal.`
          );
        }

        // Auto-dismiss and exit edit mode after 2 seconds
        setTimeout(() => {
          setEditingSection(null);
          setEditedData({});
          setSuccessMessage(null);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      
      // Handle field validation errors from backend
      if (error.status === 400 && error.response?.error?.fieldErrors) {
        setValidationErrors(error.response.error.fieldErrors);
        setErrorMessage('Please fix the validation errors');
      } else {
        setErrorMessage(error.message || 'Failed to save changes. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getSectionQuestions = (section: string) => {
    if (!userProfile) return [];
    
    const profileData = userProfile.profileData || {};
    const data = editingSection === section ? editedData : profileData;

    switch (section) {
      case 'personalInfo':
        return [
          {
            key: 'email',
            type: 'email',
            label: t('onboarding.email'),
            required: false,
            disabled: true,
            value: data.email,
          },
          {
            key: 'age',
            type: 'select',
            label: t('onboarding.age'),
            required: true,
            placeholder: 'Please select your option',
            value: data.age,
            options: [
              { value: '18-24', label: '18-24 years' },
              { value: '25-29', label: '25-29 years' },
              { value: '30-34', label: '30-34 years' },
              { value: '35-39', label: '35-39 years' },
              { value: '40-45', label: '40-45 years' },
            ],
            error: validationErrors.age,
          },
          {
            key: 'location',
            type: 'text',
            label: t('onboarding.location'),
            required: false,
            placeholder: 'e.g., Mumbai, Maharashtra',
            value: data.location,
          },
        ];

      case 'healthProfile':
        return [
          {
            key: 'diagnosisTime',
            type: 'select',
            label: t('onboarding.diagnosisTime'),
            required: true,
            placeholder: 'Please select your option',
            value: data.diagnosisTime,
            options: [
              { value: 'not-diagnosed', label: 'Not yet diagnosed' },
              { value: 'recent', label: 'Recently (< 1 year)' },
              { value: '1-3-years', label: '1-3 years ago' },
              { value: '3-5-years', label: '3-5 years ago' },
              { value: '5-plus', label: '5+ years ago' },
            ],
            error: validationErrors.diagnosisTime,
          },
          {
            key: 'symptoms',
            type: 'multiselect',
            label: t('onboarding.symptoms'),
            required: false,
            placeholder: 'Please select your options',
            value: data.symptoms,
            options: [
              { value: 'irregular-periods', label: 'Irregular periods' },
              { value: 'weight-gain', label: 'Weight gain' },
              { value: 'acne', label: 'Acne/skin issues' },
              { value: 'hair-loss', label: 'Hair loss' },
              { value: 'hirsutism', label: 'Excessive hair growth' },
              { value: 'fatigue', label: 'Fatigue' },
              { value: 'mood-swings', label: 'Mood swings' },
            ],
          },
          {
            key: 'height_cm',
            type: 'number',
            label: 'Height (cm)',
            required: true,
            placeholder: 'Enter height in cm',
            value: data.height_cm,
            maxDecimals: 1,
            min: 100,
            max: 250,
            helperText: 'Enter your height in centimeters',
            error: validationErrors.height_cm,
          },
          {
            key: 'current_weight_kg',
            type: 'number',
            label: 'Current Weight (kg)',
            required: true,
            placeholder: 'Enter weight in kg',
            value: data.current_weight_kg,
            maxDecimals: 1,
            min: 30,
            max: 200,
            helperText: 'Enter your current weight in kilograms',
            error: validationErrors.current_weight_kg,
          },
        ];

      case 'dietLifestyle':
        return [
          {
            key: 'dietType',
            type: 'select',
            label: t('onboarding.dietType'),
            required: true,
            placeholder: 'Please select your option',
            value: data.dietType,
            options: [
              { value: 'vegetarian', label: 'Vegetarian' },
              { value: 'non-vegetarian', label: 'Non-vegetarian' },
              { value: 'vegan', label: 'Vegan' },
              { value: 'jain', label: 'Jain' },
            ],
            error: validationErrors.dietType,
          },
          {
            key: 'activityLevel',
            type: 'select',
            label: t('onboarding.activityLevel'),
            required: true,
            placeholder: 'Please select your option',
            value: data.activityLevel,
            options: [
              { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
              { value: 'light', label: 'Lightly active (1-3 days/week)' },
              { value: 'moderate', label: 'Moderately active (4-5 days/week)' },
              { value: 'very', label: 'Very active (6-7 days/week)' },
            ],
            helperText: 'Select based on your typical weekly exercise routine',
            error: validationErrors.activityLevel,
          },
          {
            key: 'allergies',
            type: 'multiselect',
            label: t('onboarding.allergies'),
            required: false,
            placeholder: 'Please select your options',
            value: data.allergies,
            options: [
              { value: 'dairy', label: 'Dairy' },
              { value: 'gluten', label: 'Gluten' },
              { value: 'nuts', label: 'Nuts' },
              { value: 'eggs', label: 'Eggs' },
            ],
          },
        ];

      case 'goalsBudget':
        const questions: any[] = [
          {
            key: 'goals',
            type: 'multiselect',
            label: t('onboarding.primaryGoals'),
            required: true,
            placeholder: 'Please select your options',
            value: data.goals,
            maxSelections: 2,
            options: [
              { value: 'regularize-periods', label: 'Regularize periods' },
              { value: 'weight-management', label: 'Weight management' },
              { value: 'skin-hair', label: 'Improve skin/hair' },
              { value: 'balance-hormones', label: 'Balance hormones' },
              { value: 'fertility', label: 'Boost fertility' },
              { value: 'mood-energy', label: 'Improve mood & energy' },
            ],
            error: validationErrors.goals,
          },
        ];

        // Conditional weight goal fields
        const hasWeightGoal = data.goals?.includes('weight-management');
        
        if (hasWeightGoal) {
          questions.push({
            key: 'weight_goal',
            type: 'radio',
            label: 'Weight Goal',
            required: true,
            value: data.weight_goal,
            options: [
              { value: 'maintain', label: 'Maintain Weight' },
              { value: 'lose', label: 'Lose Weight' },
              { value: 'gain', label: 'Gain Weight' },
            ],
            helperText: 'Select your weight management goal',
            error: validationErrors.weight_goal,
          });

          const needsTargetWeight = data.weight_goal === 'lose' || data.weight_goal === 'gain';
          
          if (needsTargetWeight) {
            questions.push({
              key: 'target_weight_kg',
              type: 'number',
              label: 'Target Weight (kg)',
              required: true,
              placeholder: 'Enter target weight in kg',
              value: data.target_weight_kg,
              maxDecimals: 1,
              min: 30,
              max: 200,
              helperText: 'Enter your target weight (must result in healthy BMI)',
              error: validationErrors.target_weight_kg,
            });
          }
        }

        questions.push({
          key: 'income',
          type: 'select',
          label: t('onboarding.income'),
          required: true,
          placeholder: 'Please select your option',
          value: data.income,
          options: [
            { value: '0-25k', label: '₹0 - ₹25,000' },
            { value: '25-50k', label: '₹25,000 - ₹50,000' },
            { value: '50-100k', label: '₹50,000 - ₹1L' },
            { value: '100-300k', label: '₹1L - ₹3L' },
            { value: '300k+', label: '> ₹3L' },
          ],
          error: validationErrors.income,
        });

        return questions;

      case 'preferences':
        return [
          {
            key: 'language',
            type: 'select',
            label: t('onboarding.language'),
            required: true,
            placeholder: 'Please select your option',
            value: data.language,
            options: [
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिंदी' },
              { value: 'ta', label: 'தமிழ்' },
              { value: 'te', label: 'తెలుగు' },
            ],
            error: validationErrors.language,
          },
          {
            key: 'regions',
            type: 'multiselect',
            label: 'Preferred Regions',
            required: true,
            placeholder: 'Please select your options',
            value: data.regions,
            options: regionalCuisineConfig.regions.map((region) => ({
              value: region.id,
              label: region.label,
            })),
            helperText: 'Select one or more regions for cuisine preferences',
            error: validationErrors.regions,
          },
          {
            key: 'cuisineStates',
            type: 'multiselect',
            label: 'Preferred Cuisines/States',
            required: false,
            placeholder: 'Please select your options',
            value: data.cuisineStates,
            options: availableStates.map((state) => ({
              value: state.id,
              label: state.label,
            })),
            helperText: 'Select cuisines based on your preferred regions',
            disabled: !data.regions || data.regions.length === 0,
          },
        ];

      default:
        return [];
    }
  };

  const renderSectionCard = (
    sectionKey: string,
    title: string,
    description: string
  ) => {
    const isExpanded = expandedSections.has(sectionKey);
    const isEditing = editingSection === sectionKey;
    const questions = getSectionQuestions(sectionKey);

    return (
      <div
        key={sectionKey}
        className="bg-white rounded-lg shadow-md overflow-hidden mb-4 transition-all"
      >
        {/* Section Header */}
        <div
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50"
          onClick={() => !isEditing && toggleSection(sectionKey)}
        >
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isEditing && isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(sectionKey);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition"
                disabled={editingSection !== null && editingSection !== sectionKey}
              >
                <Edit2 size={16} />
                Edit
              </button>
            )}
            
            {!isEditing && (
              <button className="text-gray-400 hover:text-gray-600">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Section Content */}
        {isExpanded && (
          <div className="px-6 pb-6 border-t border-gray-100">
            {/* Success/Error Messages */}
            {isEditing && successMessage && (
              <Alert
                type="success"
                message={successMessage}
                closable
                onClose={() => setSuccessMessage(null)}
                className="mb-4"
              />
            )}
            
            {isEditing && errorMessage && (
              <Alert
                type="error"
                message={errorMessage}
                closable
                onClose={() => setErrorMessage(null)}
                className="mb-4"
              />
            )}

            {/* Display calculated calorie info for health profile */}
            {sectionKey === 'healthProfile' && !isEditing && userProfile?.daily_calorie_requirement && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700">
                  Daily Calorie Target: <span className="text-primary font-semibold">{userProfile.daily_calorie_requirement} kcal</span>
                </p>
              </div>
            )}

            {/* Info message during editing */}
            {isEditing && (sectionKey === 'healthProfile' || sectionKey === 'dietLifestyle') && (
              <Alert
                type="info"
                message="Your calorie requirements will be recalculated when you save"
                className="mb-4"
                showIcon
              />
            )}

            {/* Questions Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-4">
              {questions.map((question) => (
                <QuestionField
                  key={question.key}
                  {...question}
                  onChange={(value) => handleFieldChange(question.key, value)}
                  disabled={!isEditing || question.disabled}
                />
              ))}
            </div>

            {/* Action Buttons (Edit Mode) */}
            {isEditing && (
              <div className="flex gap-4 pt-6 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  <X size={16} />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveSection}
                  disabled={isSaving || Object.keys(validationErrors).length > 0}
                  className="flex items-center gap-2 ml-auto px-6 py-2 bg-primary text-white rounded-lg hover:bg-primaryDark disabled:opacity-50 transition"
                >
                  {isSaving ? (
                    <>
                      <Spin size="small" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (errorMessage && !userProfile) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <Alert
          type="error"
          message="Failed to load settings"
          description={errorMessage}
          showIcon
          action={
            <button onClick={loadUserProfile} className="btn-primary mt-4">
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* Section Cards */}
      {renderSectionCard(
        'personalInfo',
        'Personal Information',
        'Basic details about you'
      )}
      
      {renderSectionCard(
        'healthProfile',
        'Health Profile',
        'Your health metrics and symptoms'
      )}
      
      {renderSectionCard(
        'dietLifestyle',
        'Diet & Lifestyle',
        'Your dietary preferences and activity level'
      )}
      
      {renderSectionCard(
        'goalsBudget',
        'Goals & Budget',
        'Your health goals and budget preferences'
      )}
      
      {renderSectionCard(
        'preferences',
        'Preferences',
        'Language and cuisine preferences'
      )}
    </div>
  );
};

export default PreferencesSection;
