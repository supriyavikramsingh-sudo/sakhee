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
