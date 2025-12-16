import { useState, useEffect, useRef } from 'react';
import { Loader2, SparkleIcon, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { joinCommunity } from '../services/communityService';
import Navigation from './Navigation';
import Footer from './Footer';
import { countryCodes, type CountryCode } from './data/countryCodes';

interface LocationData {
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

type FormState = 'initial' | 'loading' | 'success' | 'error';

const JoinCommunityPage = () => {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>(countryCodes[0]); // Default to India
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [deviceType, setDeviceType] = useState<string>('Desktop');
  const [formState, setFormState] = useState<FormState>('initial');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect device type on mount
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
        return 'Tablet';
      }
      if (/mobile|android|touch|webos|hpwos|blackberry|iemobile|opera mini/i.test(userAgent)) {
        return 'Mobile';
      }
      return 'Desktop';
    };
    setDeviceType(detectDevice());
  }, []);

  // Asynchronously get user location in the background (non-blocking)
  useEffect(() => {
    const getLocationAsync = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // Reverse geocoding using OpenStreetMap Nominatim API
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const data = await response.json();

              const locationData: LocationData = {
                city:
                  data.address?.city || data.address?.town || data.address?.village || 'Unknown',
                state: data.address?.state || 'Unknown',
                country: data.address?.country || 'Unknown',
                latitude,
                longitude,
              };

              setLocation(locationData);

              // If user already submitted, update their location data in backend
              if (submittedEmail) {
                try {
                  await fetch(
                    `${
                      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
                    }/api/community/update-location`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: submittedEmail,
                        location: locationData,
                      }),
                    }
                  );
                  console.log('✅ Location data updated for:', submittedEmail);
                } catch (error) {
                  console.error('Failed to update location:', error);
                }
              }
            } catch (error) {
              console.error('Reverse geocoding failed:', error);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
          }
        );
      }
    };

    getLocationAsync();
  }, [submittedEmail]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all spaces and non-digits
    const digitsOnly = phone.replace(/\s/g, '');

    // Check if it contains only digits
    if (!/^\d+$/.test(digitsOnly)) {
      return false;
    }

    // Get the expected phone length for the selected country
    const expectedLength = countryCode.phoneLength;

    // If phoneLength is a number, check for exact match
    if (typeof expectedLength === 'number') {
      return digitsOnly.length === expectedLength;
    }

    // If phoneLength is a range {min, max}, check if within range
    if (typeof expectedLength === 'object' && expectedLength.min && expectedLength.max) {
      return digitsOnly.length >= expectedLength.min && digitsOnly.length <= expectedLength.max;
    }

    return false;
  };

  const filteredCountries = countryCodes.filter(
    (country) =>
      country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      country.dialCode.includes(countrySearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setEmailError('');
    setPhoneError('');
    setErrorMessage('');

    // Validate phone number (MANDATORY)
    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      const expectedLength = countryCode.phoneLength;
      let errorMsg = '';

      if (typeof expectedLength === 'number') {
        errorMsg = `Please enter a valid ${expectedLength}-digit phone number for ${countryCode.name}`;
      } else if (typeof expectedLength === 'object') {
        errorMsg = `Please enter a valid phone number (${expectedLength.min}-${expectedLength.max} digits) for ${countryCode.name}`;
      }

      setPhoneError(errorMsg);
      return;
    }

    // Validate email (OPTIONAL - only if provided)
    if (email.trim() && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate consent
    if (!consentGiven) {
      setErrorMessage('You must agree to receive updates to continue');
      return;
    }

    // Set loading state
    setFormState('loading');

    try {
      // Use current location or fallback to 'Unknown' if still loading
      // This allows seamless submission without waiting for location
      const locationData = location || {
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
      };

      await joinCommunity({
        email: email.trim() || undefined, // Optional email
        phoneNumber: phoneNumber.trim(),
        countryCode: countryCode.dialCode,
        phoneLength: countryCode.phoneLength, // Send country-specific phone length for backend validation
        location: locationData,
        deviceType,
        consentGiven,
      });

      // Store submitted email to update location later if it becomes available
      if (email.trim()) {
        setSubmittedEmail(email.trim().toLowerCase());
      }

      // Immediately show success state for seamless UX
      setFormState('success');
    } catch (error: any) {
      setFormState('error');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -50, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-40 right-10 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl"
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 50, -20, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        <motion.div
          className="absolute bottom-20 left-1/2 w-72 h-72 bg-secondary/30 rounded-full mix-blend-multiply filter blur-xl"
          animate={{
            x: [0, 20, -30, 0],
            y: [0, -30, 40, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </div>

      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4 px-4 py-2 bg-secondary rounded-full"
          >
            <span className="text-sm font-semibold text-primary flex items-center gap-1">
              <SparkleIcon /> Coming Soon
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-primary mb-6"
          >
            Join our community
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted max-w-3xl mx-auto leading-relaxed mb-8"
          >
            Get early access and be the first to know when we launch. Join thousands of women taking
            control of their PCOS journey.
          </motion.p>
        </section>

        {/* Form Card */}
        <section className="flex max-sm:flex-col justify-between mx-auto">
          {/* Illustration with animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            className="flex-1 mx-auto mb-12"
          >
            <img
              src="/images/undraw_happy-women-day_8whn.svg"
              alt="Diverse community of women supporting each other"
              className="w-full max-w-md mx-auto drop-shadow-xl"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ y: -5 }}
            className="bg-white p-4 md:p-8 flex-1 rounded-xl shadow-lg"
          >
            {formState === 'success' ? (
              // Success State
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full"
                >
                  <span className="text-4xl">🎉</span>
                </motion.div>
                <h2 className="text-3xl font-bold text-primary mb-4">Thank you for joining!</h2>
                <p className="text-lg text-muted mb-4">
                  We're thrilled to have you as part of the Sakhee community. You'll be the first to
                  know when we launch!
                </p>
                <p className="text-muted">Check your inbox for updates.</p>
              </motion.div>
            ) : (
              // Form State
              <form onSubmit={handleSubmit}>
                <h2 className="text-2xl font-bold text-center mb-6 text-primary">Sign me up!</h2>

                {/* Phone Number Input (MANDATORY) */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-4"
                >
                  <label htmlFor="phone" className="block text-sm font-semibold mb-2">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <div className="flex gap-2">
                    {/* Country Code Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all flex items-center gap-2 bg-white hover:border-primary"
                      >
                        <span className="text-xl">{countryCode.flag}</span>
                        <span className="font-medium">{countryCode.dialCode}</span>
                        <ChevronDown size={16} className="text-gray-500" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {showCountryDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden"
                          >
                            {/* Search Box */}
                            <div className="p-2 border-b border-gray-200">
                              <div className="relative">
                                <Search
                                  size={18}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="text"
                                  placeholder="Search country..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                />
                              </div>
                            </div>

                            {/* Country List */}
                            <div className="overflow-y-auto max-h-80">
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setCountryCode(country);
                                      setShowCountryDropdown(false);
                                      setCountrySearch('');

                                      // Re-validate phone number if already entered
                                      if (phoneNumber.trim()) {
                                        // Clear error first, then validate with new country
                                        setPhoneError('');

                                        // Use setTimeout to ensure countryCode state is updated
                                        setTimeout(() => {
                                          const digitsOnly = phoneNumber.replace(/\s/g, '');
                                          if (!/^\d+$/.test(digitsOnly)) {
                                            return;
                                          }

                                          const expectedLength = country.phoneLength;
                                          let isValid = false;

                                          if (typeof expectedLength === 'number') {
                                            isValid = digitsOnly.length === expectedLength;
                                          } else if (
                                            typeof expectedLength === 'object' &&
                                            expectedLength.min &&
                                            expectedLength.max
                                          ) {
                                            isValid =
                                              digitsOnly.length >= expectedLength.min &&
                                              digitsOnly.length <= expectedLength.max;
                                          }

                                          if (!isValid) {
                                            let errorMsg = '';
                                            if (typeof expectedLength === 'number') {
                                              errorMsg = `Please enter a valid ${expectedLength}-digit phone number for ${country.name}`;
                                            } else if (typeof expectedLength === 'object') {
                                              errorMsg = `Please enter a valid phone number (${expectedLength.min}-${expectedLength.max} digits) for ${country.name}`;
                                            }
                                            setPhoneError(errorMsg);
                                          }
                                        }, 0);
                                      }
                                    }}
                                    className="w-full px-4 py-2 hover:bg-gray-100 flex items-center gap-3 text-left transition-colors"
                                  >
                                    <span className="text-xl">{country.flag}</span>
                                    <span className="flex-1 text-sm">{country.name}</span>
                                    <span className="text-sm text-gray-600">
                                      {country.dialCode}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                  No countries found
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Phone Number Input */}
                    <input
                      type="tel"
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => {
                        // Only allow digits and spaces
                        const value = e.target.value.replace(/[^\d\s]/g, '');
                        setPhoneNumber(value);
                        setPhoneError('');
                      }}
                      onBlur={() => {
                        // Validate phone number when user leaves the field
                        if (phoneNumber.trim() && !validatePhoneNumber(phoneNumber)) {
                          const expectedLength = countryCode.phoneLength;
                          let errorMsg = '';

                          if (typeof expectedLength === 'number') {
                            errorMsg = `Please enter a valid ${expectedLength}-digit phone number for ${countryCode.name}`;
                          } else if (typeof expectedLength === 'object') {
                            errorMsg = `Please enter a valid phone number (${expectedLength.min}-${expectedLength.max} digits) for ${countryCode.name}`;
                          }

                          setPhoneError(errorMsg);
                        }
                      }}
                      placeholder="Enter phone number"
                      className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                        phoneError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={formState === 'loading'}
                    />
                  </div>
                  {phoneError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-1"
                    >
                      {phoneError}
                    </motion.p>
                  )}
                </motion.div>

                {/* Email Input (OPTIONAL) */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-4"
                >
                  <label htmlFor="email" className="block text-sm font-semibold mb-2">
                    Email Address <span className="text-sm text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    placeholder="your.email@example.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={formState === 'loading'}
                  />
                  {emailError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-1"
                    >
                      {emailError}
                    </motion.p>
                  )}
                </motion.div>

                {/* Consent Checkbox */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mb-4"
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => {
                        setConsentGiven(e.target.checked);
                        // Clear error when user checks the box
                        if (e.target.checked) {
                          setErrorMessage('');
                        }
                      }}
                      className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      disabled={formState === 'loading'}
                    />
                    <span className="text-sm text-gray-700">
                      I agree to receive updates from Sakhee. <span className="text-danger">*</span>
                    </span>
                  </label>
                </motion.div>

                {/* Data Disclaimer */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mb-6 p-3 bg-secondary rounded-lg"
                >
                  <p className="text-xs text-muted leading-relaxed">
                    <strong>Data Usage:</strong> Your data is stored securely and will never be
                    shared with third parties. By signing up, you agree to our privacy practices.
                  </p>
                </motion.div>

                {/* Error Message - Shows for both validation and server errors */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={formState === 'loading'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primaryDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formState === 'loading' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </section>

        {/* Additional Info Section */}
        <section className="max-w-5xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
            >
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="text-4xl font-bold text-primary mb-2"
                >
                  24/7
                </motion.div>
                <h3 className="font-semibold mb-2">AI Health Companion</h3>
                <p className="text-sm text-muted">
                  Get instant answers to your PCOS questions anytime
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
            >
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="text-4xl font-bold text-primary mb-2"
                >
                  100%
                </motion.div>
                <h3 className="font-semibold mb-2">Indian-Focused</h3>
                <p className="text-sm text-muted">
                  Personalized for Indian cuisine, culture, and lifestyle
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
            >
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="text-4xl font-bold text-primary mb-2"
                >
                  35M+
                </motion.div>
                <h3 className="font-semibold mb-2">PCOS Fighters</h3>
                <p className="text-sm text-muted">
                  Help us build India's first community for millions managing PCOS.
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default JoinCommunityPage;
