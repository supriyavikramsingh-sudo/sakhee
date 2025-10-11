const QuestionField = ({
  key,
  type,
  label,
  required,
  options,
  value,
  onChange,
  placeholder
}) => {
  const renderField = () => {
    switch (type) {
      case 'email':
      case 'text':
        return (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">{`Select ${label.toLowerCase()}`}</option>
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <div className="space-y-2">
            {options?.map(opt => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(value)
                      ? value.includes(opt.value)
                      : false
                  }
                  onChange={(e) => {
                    const newValue = Array.isArray(value) ? value : []
                    if (e.target.checked) {
                      onChange([...newValue, opt.value])
                    } else {
                      onChange(newValue.filter(v => v !== opt.value))
                    }
                  }}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-danger">*</span>}
      </label>
      {renderField()}
    </div>
  )
}

export default QuestionField