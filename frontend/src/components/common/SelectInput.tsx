import { Select } from 'antd';

interface SelectInputProps {
  label: string;
  value?: any;
  defaultValue?: string | string[] | [] | never[] | number;
  required?: boolean;
  options: { value: string | number; label: string }[];
  handleInputChange: (value: string | string[] | [] | never[] | number) => void;
  mode?: 'multiple' | 'tags';
  disable?: boolean;
  placeholder?: string;
  maxSelections?: number;
}

const SelectInput = ({
  label,
  required = false,
  defaultValue,
  options,
  handleInputChange,
  mode,
  value,
  disable = false,
  placeholder,
  maxSelections,
}: SelectInputProps) => {
  return (
    <>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <Select
        mode={mode}
        maxCount={maxSelections}
        placeholder={placeholder}
        disabled={disable}
        value={value}
        defaultValue={defaultValue}
        style={{ width: 400, height: mode !== 'multiple' ? 40 : 'auto' }}
        onChange={handleInputChange}
        options={options}
      />
    </>
  );
};

export default SelectInput;
