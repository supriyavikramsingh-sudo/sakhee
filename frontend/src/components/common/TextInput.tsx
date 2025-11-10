import { Input } from 'antd';

interface TextInputProps {
  label: string;
  defaultValue?: string | number;
  value?: string | number;
  required?: boolean;
  handleInputChange: (value: string | number) => void;
  disable?: boolean;
  placeholder?: string;
  className?: string;
}

const TextInput = ({
  className,
  label,
  required = false,
  defaultValue,
  handleInputChange,
  disable = false,
  placeholder,
  value,
}: TextInputProps) => {
  return (
    <>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <Input
        placeholder={placeholder}
        value={value || defaultValue}
        disabled={disable}
        className={`w-[400px] h-[40px] ${className}`}
        onChange={(e) => handleInputChange(e.target.value)}
      />
    </>
  );
};

export default TextInput;
