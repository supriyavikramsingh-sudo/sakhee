const QuestionField = ({
  type,
  label,
  required,
  options,
  value,
  onChange,
  placeholder,
  helpText,
  maxSelections,
}) => {
  const renderField = () => {
    switch (type) {
      case 'email':
      case 'text':
        return (
          <div>
            <input
              type={type}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              required={required}
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            />
            {helpText && <p className="mt-1 text-xs text-textSecondary">{helpText}</p>}
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">{`Select ${label.toLowerCase()}`}</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        const currentSelections = Array.isArray(value) ? value : [];
        const maxReached = maxSelections && currentSelections.length >= maxSelections;

        return (
          <div>
            {maxSelections && (
              <p className="mb-3 text-sm text-primary font-medium">
                Select up to {maxSelections} {maxSelections === 1 ? 'option' : 'options'}
                {currentSelections.length > 0 &&
                  ` (${currentSelections.length}/${maxSelections} selected)`}
              </p>
            )}

            <div className="space-y-2">
              {options?.map((opt) => {
                const isChecked = currentSelections.includes(opt.value);
                const isDisabled = !isChecked && maxReached;

                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 cursor-pointer ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(e) => {
                        const newValue = Array.isArray(value) ? value : [];
                        if (e.target.checked) {
                          // Check if we can add more
                          if (!maxSelections || newValue.length < maxSelections) {
                            onChange([...newValue, opt.value]);
                          }
                        } else {
                          onChange(newValue.filter((v) => v !== opt.value));
                        }
                      }}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>

            {maxReached && (
              <p className="mt-2 text-xs text-warning">
                Maximum selections reached. Uncheck an option to select another.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {renderField()}
    </div>
  );
};

export default QuestionField;
