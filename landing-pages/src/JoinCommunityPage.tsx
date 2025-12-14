import { useState, useEffect } from 'react';
import { Loader2, SparkleIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { joinCommunity } from '../services/communityService';
import Navigation from './Navigation';
import Footer from './Footer';

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
  const [consentGiven, setConsentGiven] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [deviceType, setDeviceType] = useState<string>('Desktop');
  const [formState, setFormState] = useState<FormState>('initial');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string>('');

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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setEmailError('');
    setErrorMessage('');

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
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
        email: email.trim(),
        location: locationData,
        deviceType,
        consentGiven,
      });

      // Store submitted email to update location later if it becomes available
      setSubmittedEmail(email.trim().toLowerCase());

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
            className="bg-white p-8 flex-1 rounded-xl shadow-lg"
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

                {/* Email Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-4"
                >
                  <label htmlFor="email" className="block text-sm font-semibold mb-2">
                    Email Address <span className="text-danger">*</span>
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
                  transition={{ delay: 0.6 }}
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
                  transition={{ delay: 0.7 }}
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
                  transition={{ delay: 0.8 }}
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
