import { Loader, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DishNameInputCardProps {
  onSubmit: (dishName: string) => void;
  onCancel: () => void;
  remainingSearches: number;
  dailyLimit: number;
  userTier: 'pro' | 'max';
  isLoading?: boolean;
}

const DishNameInputCard = ({
  onSubmit,
  onCancel,
  remainingSearches,
  dailyLimit,
  userTier,
  isLoading = false,
}: DishNameInputCardProps) => {
  const [dishName, setDishName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();

    // Scroll into view
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const validateDishName = (value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError('Please enter at least 2 characters');
      return false;
    }
    if (trimmed.length > 100) {
      setError('Please keep it under 100 characters');
      return false;
    }
    setError('');
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDishName(value);
    if (error) {
      validateDishName(value);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = dishName.trim();
    if (validateDishName(trimmed)) {
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleClear = () => {
    setDishName('');
    setError('');
    inputRef.current?.focus();
  };

  const isValid = dishName.trim().length >= 2 && dishName.trim().length <= 100;

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-primary shadow-lg max-w-2xl animate-slideIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-white p-2 rounded-full">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Recipe Search</h3>
        </div>
        <button
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close"
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Field */}
        <div>
          <label htmlFor="dish-name-input" className="block text-sm font-medium text-gray-700 mb-2">
            What dish would you like to make?
          </label>
          <div className="relative">
            <input
              id="dish-name-input"
              ref={inputRef}
              type="text"
              value={dishName}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="e.g., biryani, paneer tikka, dal makhani..."
              maxLength={100}
              className={`
                w-full px-4 py-3 pr-10 rounded-lg border-2 transition-all
                ${error ? 'border-danger' : 'border-gray-300 focus:border-primary'}
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20
                disabled:bg-gray-50 disabled:cursor-not-allowed
              `}
              aria-invalid={!!error}
              aria-describedby={error ? 'dish-name-error' : 'dish-name-help'}
            />
            {dishName && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear input"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Help Text */}
          {!error && (
            <p id="dish-name-help" className="mt-2 text-xs text-gray-500">
              Tip: Be specific! Try &quot;chicken biryani&quot; or &quot;palak paneer&quot;
            </p>
          )}

          {/* Error Message */}
          {error && (
            <p
              id="dish-name-error"
              role="alert"
              aria-live="polite"
              className="mt-2 text-xs text-danger"
            >
              {error}
            </p>
          )}
        </div>

        {/* Usage Counter */}
        <div className="flex items-center justify-between px-4 py-2 bg-secondary rounded-lg">
          <span className="text-sm text-gray-600">Searches remaining today:</span>
          <span className="text-sm font-semibold text-primary">
            {remainingSearches}/{dailyLimit}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 btn-outline !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="flex-1 btn-primary !py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Search Recipe</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DishNameInputCard;
