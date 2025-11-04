import { Input } from 'antd';
import { useState } from 'react';

interface NumberInputProps {
  label: string;
  defaultValue?: number;
  value?: number;
  required?: boolean;
  handleInputChange: (value: number | undefined) => void;
  disable?: boolean;
  placeholder?: string;
  maxDecimals?: number; // Maximum number of decimal places allowed
  min?: number; // Minimum value
  max?: number; // Maximum value
  error?: string; // Validation error message
}

const NumberInput = ({
  label,
  required = false,
  defaultValue,
  handleInputChange,
  disable = false,
  placeholder,
  maxDecimals = 1,
  min,
  max,
  error,
  value,
}: NumberInputProps) => {
  const [inputValue, setInputValue] = useState<number | string>(value || defaultValue || '');
  const [validationError, setValidationError] = useState<string>('');

  const validateAndUpdate = (value: string) => {
    // Allow empty string
    if (value === '') {
      setInputValue('');
      setValidationError('');
      handleInputChange(undefined);
      return;
    }

    // Check if it's a valid number with allowed decimals
    const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
    if (!regex.test(value)) {
      setValidationError(
        `Please enter a valid number with up to ${maxDecimals} decimal place${
          maxDecimals !== 1 ? 's' : ''
        }`
      );
      return;
    }

    const numValue = parseFloat(value);

    // Check if it's a valid number
    if (isNaN(numValue)) {
      setValidationError('Please enter a valid number');
      return;
    }

    // Check min/max bounds
    if (min !== undefined && numValue < min) {
      setValidationError(`Value must be at least ${min}`);
      setInputValue(value);
      handleInputChange(undefined);
      return;
    }

    if (max !== undefined && numValue > max) {
      setValidationError(`Value must be at most ${max}`);
      setInputValue(value);
      handleInputChange(undefined);
      return;
    }

    // Valid input
    setInputValue(value);
    setValidationError('');
    handleInputChange(numValue);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        disabled={disable}
        style={{ width: 400, height: 40 }}
        onChange={(e) => validateAndUpdate(e.target.value)}
        status={validationError || error ? 'error' : ''}
      />
      {(validationError || error) && (
        <p className="text-red-500 text-xs mt-1">{validationError || error}</p>
      )}
    </div>
  );
};

export default NumberInput;
