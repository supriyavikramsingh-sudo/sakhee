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
}: QuestionFieldProps) => {
  switch (type) {
    case 'text':
    case 'email':
      return (
        <div>
          <TextInput
            disable={disabled}
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
            label={label}
            maxSelections={maxSelections}
            defaultValue={''}
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
            required={required}
            defaultValue={[]}
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
