// client/src/components/onboarding/QuestionField.jsx
import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

const QuestionField = ({
  type,
  label,
  value,
  onChange,
  options = [],
  required,
  placeholder,
  helperText,
  maxSelections,
  disabled,
}) => {
  const handleCheckboxChange = (optionValue) => {
    const currentValues = Array.isArray(value) ? value : [];

    if (currentValues.includes(optionValue)) {
      // Remove
      onChange(currentValues.filter((v) => v !== optionValue));
    } else {
      // Add (respect maxSelections)
      if (maxSelections && currentValues.length >= maxSelections) {
        return; // Don't add more
      }
      onChange([...currentValues, optionValue]);
    }
  };

  const handleMultiSelectChange = (optionValue) => {
    const currentValues = Array.isArray(value) ? value : [];

    if (currentValues.includes(optionValue)) {
      // Remove
      onChange(currentValues.filter((v) => v !== optionValue));
    } else {
      // Add
      onChange([...currentValues, optionValue]);
    }
  };

  // Render based on type
  switch (type) {
    case 'text':
    case 'email':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {label} {required && <span className="text-danger">*</span>}
          </label>
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          />
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {label} {required && <span className="text-danger">*</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Select...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {label} {required && <span className="text-danger">*</span>}
            {maxSelections && (
              <span className="text-xs text-muted ml-2">(Select up to {maxSelections})</span>
            )}
          </label>
          <div className="space-y-2">
            {options.map((option) => {
              const isChecked = Array.isArray(value) && value.includes(option.value);
              const isDisabled =
                maxSelections &&
                !isChecked &&
                Array.isArray(value) &&
                value.length >= maxSelections;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !isDisabled && handleCheckboxChange(option.value)}
                  className={`flex items-center gap-2 w-full px-4 py-2 border rounded-lg transition ${
                    isChecked
                      ? 'border-primary bg-primary/10'
                      : isDisabled
                      ? 'border-surface bg-gray-100 cursor-not-allowed'
                      : 'border-surface hover:border-primary'
                  }`}
                  disabled={isDisabled}
                >
                  {isChecked ? (
                    <CheckSquare className="text-primary" size={20} />
                  ) : (
                    <Square className="text-muted" size={20} />
                  )}
                  <span className={isDisabled ? 'text-gray-400' : ''}>{option.label}</span>
                </button>
              );
            })}
          </div>
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    case 'multiselect':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {label} {required && <span className="text-danger">*</span>}
          </label>
          {disabled ? (
            <div className="w-full px-4 py-3 border border-surface rounded-lg bg-gray-50 text-gray-500 text-sm">
              Please select regions first
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {options.length === 0 ? (
                <div className="text-sm text-gray-500 italic py-3">
                  No options available. Select regions first.
                </div>
              ) : (
                options.map((option) => {
                  const isChecked = Array.isArray(value) && value.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleMultiSelectChange(option.value)}
                      className={`flex items-center gap-2 w-full px-4 py-2 border rounded-lg transition ${
                        isChecked
                          ? 'border-primary bg-primary/10'
                          : 'border-surface hover:border-primary'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="text-primary" size={20} />
                      ) : (
                        <Square className="text-muted" size={20} />
                      )}
                      <span>{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    default:
      return null;
  }
};

export default QuestionField;
