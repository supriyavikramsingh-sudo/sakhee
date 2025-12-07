import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { joinCommunity } from '../services/communityService';

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

  // Get user location on mount
  useEffect(() => {
    const getLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // Reverse geocoding using OpenStreetMap Nominatim API (free, no API key needed)
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const data = await response.json();

              setLocation({
                city:
                  data.address?.city || data.address?.town || data.address?.village || 'Unknown',
                state: data.address?.state || 'Unknown',
                country: data.address?.country || 'Unknown',
                latitude,
                longitude,
              });
            } catch (error) {
              console.error('Reverse geocoding failed:', error);
              setLocation({
                city: 'Unknown',
                state: 'Unknown',
                country: 'Unknown',
                latitude,
                longitude,
              });
            }
          },
          (error) => {
            console.error('Geolocation error:', error);

            // Set a default fallback location
            setLocation({
              city: 'Unknown',
              state: 'Unknown',
              country: 'Unknown',
            });
          }
        );
      } else {
        setLocation({
          city: 'Unknown',
          state: 'Unknown',
          country: 'Unknown',
        });
      }
    };

    getLocation();
  }, []);

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

    // Validate location
    if (!location) {
      setErrorMessage('Unable to detect location. Please refresh the page and try again.');
      return;
    }

    setFormState('loading');

    try {
      await joinCommunity({
        email: email.trim(),
        location,
        deviceType,
        consentGiven,
      });

      setFormState('success');
    } catch (error: any) {
      setFormState('error');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary mb-6">Join our community</h1>
          <p className="text-xl text-muted max-w-3xl mx-auto leading-relaxed mb-8">
            Get early access and be the first to know when we launch. Join thousands of women taking
            control of their PCOS journey.
          </p>

          {/* Illustration */}
          <div className="max-w-2xl mx-auto mb-12">
            <img
              src="/images/undraw_happy-women-day_8whn.svg"
              alt="Diverse community of women supporting each other"
              className="w-full max-w-md mx-auto"
            />
          </div>
        </section>

        {/* Form Card */}
        <section className="max-w-md mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            {formState === 'success' ? (
              // Success State
              <div className="text-center">
                <h2 className="text-3xl font-bold text-primary mb-4">Thank you for joining! 🎉</h2>
                <p className="text-lg text-muted mb-4">
                  We're thrilled to have you as part of the Sakhee community. You'll be the first to
                  know when we launch!
                </p>
                <p className="text-muted">Check your inbox for updates.</p>
              </div>
            ) : (
              // Form State
              <form onSubmit={handleSubmit}>
                <h2 className="text-2xl font-bold text-center mb-6">Get Started</h2>

                {/* Email Input */}
                <div className="mb-4">
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
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={formState === 'loading'}
                  />
                  {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                </div>

                {/* Consent Checkbox */}
                <div className="mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      disabled={formState === 'loading'}
                    />
                    <span className="text-sm text-gray-700">
                      I agree to receive updates from Sakhee. <span className="text-danger">*</span>
                    </span>
                  </label>
                </div>

                {/* Data Disclaimer */}
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted leading-relaxed">
                    <strong>Data Usage:</strong> Your data is stored securely and will never be
                    shared with third parties. By signing up, you agree to our privacy practices.
                  </p>
                </div>

                {/* Error Message */}
                {formState === 'error' && errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={formState === 'loading'}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formState === 'loading' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'GET STARTED'
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Additional Info Section */}
        <section className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <h3 className="font-semibold mb-2">AI Health Companion</h3>
              <p className="text-sm text-muted">
                Get instant answers to your PCOS questions anytime
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <h3 className="font-semibold mb-2">Indian-Focused</h3>
              <p className="text-sm text-muted">
                Personalized for Indian cuisine, culture, and lifestyle
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">35M+</div>
              <h3 className="font-semibold mb-2">PCOS Fighters</h3>
              <p className="text-sm text-muted">
                Help us build India's first community for millions managing PCOS.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default JoinCommunityPage;
