import { Select } from 'antd';

interface SelectInputProps {
  label: string;
  defaultValue?: string | string[] | [] | never[] | number;
  required?: boolean;
  options: { value: string | number; label: string }[];
  handleInputChange: (value: string | string[] | [] | never[] | number) => void;
  mode?: 'multiple' | 'tags';
  disable?: boolean;
}

const SelectInput = ({
  label,
  required = false,
  defaultValue,
  options,
  handleInputChange,
  mode,
  disable = false,
}: SelectInputProps) => {
  return (
    <>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <Select
        mode={mode}
        disabled={disable}
        defaultValue={defaultValue ?? options[0]?.value}
        style={{ width: 400, height: mode === 'multiple' ? 'auto' : 40 }}
        onChange={handleInputChange}
        options={options}
      />
    </>
  );
};

export default SelectInput;
