import { Radio,  } from 'antd';

interface RadioInputProps {
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  handleInputChange: (value: string) => void;
  disable?: boolean;
  helperText?: string;
}

const RadioInput = ({
  label,
  options,
  defaultValue,
  required = false,
  handleInputChange,
  disable = false,
  helperText,
}: RadioInputProps) => {
  const onChange = (e) => {
    handleInputChange(e.target.value);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <Radio.Group
        onChange={onChange}
        value={defaultValue}
        disabled={disable}
        className="flex flex-col gap-2"
      >
        {options.map((option) => (
          <Radio key={option.value} value={option.value}>
            {option.label}
          </Radio>
        ))}
      </Radio.Group>
      {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
};

export default RadioInput;
