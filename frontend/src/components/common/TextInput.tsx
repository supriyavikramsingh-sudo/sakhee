import { Input } from 'antd';

interface TextInputProps {
  label: string;
  defaultValue?: string | number;
  value?: string | number;
  required?: boolean;
  handleInputChange: (value: string | number) => void;
  disable?: boolean;
  placeholder?: string;
}

const TextInput = ({
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
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <Input
        placeholder={placeholder}
        value={value || defaultValue}
        disabled={disable}
        style={{ width: 400, height: 40 }}
        onChange={(e) => handleInputChange(e.target.value)}
      />
    </>
  );
};

export default TextInput;
