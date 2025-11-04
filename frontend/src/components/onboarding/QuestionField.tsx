import NumberInput from '../common/NumberInput';
import RadioInput from '../common/RadioInput';
import SelectInput from '../common/SelectInput';
import TextInput from '../common/TextInput';

interface QuestionFieldProps {
  type: string;
  label: string;
  onChange: (value: any) => void;
  options?: { value: string | number; label: string }[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  maxSelections?: number;
  disabled?: boolean;
  maxDecimals?: number; // For number input
  min?: number; // For number input
  max?: number; // For number input
  error?: string; // Validation error
  defaultValue?: any; // Default value for fields
  value?: any; // Current value for fields
}

const QuestionField = ({
  type,
  label,
  onChange,
  options = [],
  required,
  placeholder,
  helperText,
  maxSelections,
  disabled,
  maxDecimals,
  min,
  max,
  error,
  defaultValue,
  value,
}: QuestionFieldProps) => {
  switch (type) {
    case 'text':
    case 'email':
      return (
        <div>
          <TextInput
            defaultValue={defaultValue}
            disable={disabled}
            value={value}
            label={label}
            handleInputChange={onChange}
            required={required}
            placeholder={placeholder}
          />
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    case 'number':
      return (
        <div>
          <NumberInput
            disable={disabled}
            value={value}
            label={label}
            handleInputChange={onChange}
            required={required}
            placeholder={placeholder}
            maxDecimals={maxDecimals}
            min={min}
            max={max}
            error={error}
            defaultValue={defaultValue}
          />
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    case 'radio':
      return (
        <div>
          <RadioInput
            disable={disabled}
            label={label}
            value={value}
            options={options as { value: string; label: string }[]}
            handleInputChange={onChange}
            required={required}
            defaultValue={defaultValue}
            helperText={helperText}
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <SelectInput
            disable={disabled}
            value={value}
            defaultValue={defaultValue}
            label={label}
            maxSelections={maxSelections}
            placeholder={placeholder}
            required={required}
            options={options}
            handleInputChange={onChange}
          />
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    case 'multiselect':
      return (
        <div>
          <SelectInput
            disable={disabled}
            label={label}
            value={value}
            required={required}
            defaultValue={defaultValue}
            placeholder={placeholder}
            maxSelections={maxSelections}
            options={options}
            mode="multiple"
            handleInputChange={(value) => onChange(value)}
          />
          {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
      );

    default:
      return null;
  }
};

export default QuestionField;
