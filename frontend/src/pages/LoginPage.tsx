import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader, AlertCircle, Cpu, ShieldCheck, Heart } from 'lucide-react';
import Logo from '/images/logo.svg';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, isAuthenticated, isLoading, error } = useAuthStore();
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleSignIn = async () => {
    setSigning(true);
    const result = await signInWithGoogle();

    if (result.success) {
      navigate('/');
    } else {
      setSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url(/images/login-bg.png)] bg-left bg-contain px-4">
      <div className="max-w-2xl w-full bg-white/80 rounded-lg backdrop-blur-sm shadow-lg p-8">
        {/* Logo & Title */}
        <div className="text-center flex flex-col gap-4 mb-8">
          <img className="h-16" src={Logo} />
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-primary">Start your journey with Sakhee</h2>
            <p className="text-muted">Your personalised AI companion for PCOS management</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="flex flex-col items-center">
          <h3 className="text-xl font-bold mb-6 text-center">Sign in to continue</h3>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-danger bg-opacity-10 border-l-4 border-danger rounded flex items-start gap-3">
              <AlertCircle className="text-danger flex-shrink-0" size={20} />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={signing}
            className="bg-[linear-gradient(#e9e9e9,#e9e9e9_50%,#fff)] group w-50 h-16 inline-flex transition-all duration-300 overflow-visible p-1 rounded-full group"
          >
            {signing ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span className="font-medium">Signing in...</span>
              </>
            ) : (
              <div className="w-half h-full bg-[linear-gradient(to_top,#ececec,#fff)] overflow-hidden shadow-[0_0_1px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.05),0_3px_3px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.12)] p-1 rounded-full hover:shadow-none duration-300">
                <div className="w-full h-full text-xl gap-x-0.5 gap-y-0.5 justify-center text-[#101010] bg-[linear-gradient(#f4f4f4,#fefefe)] group-hover:bg-[linear-gradient(#e2e2e2,#fefefe)] duration-200 items-center text-[18px] font-medium gap-4 inline-flex overflow-hidden px-4 py-2 rounded-full black group-hover:text-blue-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    version="1.1"
                    viewBox="0 0 64 64"
                    height="32px"
                    width="24px"
                  >
                    <g fillRule="evenodd" fill="none" stroke-width="1" stroke="none">
                      <g fillRule="nonzero" transform="translate(3.000000, 2.000000)">
                        <path
                          fill="#4285F4"
                          d="M57.8123233,30.1515267 C57.8123233,27.7263183 57.6155321,25.9565533 57.1896408,24.1212666 L29.4960833,24.1212666 L29.4960833,35.0674653 L45.7515771,35.0674653 C45.4239683,37.7877475 43.6542033,41.8844383 39.7213169,44.6372555 L39.6661883,45.0037254 L48.4223791,51.7870338 L49.0290201,51.8475849 C54.6004021,46.7020943 57.8123233,39.1313952 57.8123233,30.1515267"
                        ></path>
                        <path
                          fill="#34A853"
                          d="M29.4960833,58.9921667 C37.4599129,58.9921667 44.1456164,56.3701671 49.0290201,51.8475849 L39.7213169,44.6372555 C37.2305867,46.3742596 33.887622,47.5868638 29.4960833,47.5868638 C21.6960582,47.5868638 15.0758763,42.4415991 12.7159637,35.3297782 L12.3700541,35.3591501 L3.26524241,42.4054492 L3.14617358,42.736447 C7.9965904,52.3717589 17.959737,58.9921667 29.4960833,58.9921667"
                        ></path>
                        <path
                          fill="#FBBC05"
                          d="M12.7159637,35.3297782 C12.0932812,33.4944915 11.7329116,31.5279353 11.7329116,29.4960833 C11.7329116,27.4640054 12.0932812,25.4976752 12.6832029,23.6623884 L12.6667095,23.2715173 L3.44779955,16.1120237 L3.14617358,16.2554937 C1.14708246,20.2539019 0,24.7439491 0,29.4960833 C0,34.2482175 1.14708246,38.7380388 3.14617358,42.736447 L12.7159637,35.3297782"
                        ></path>
                        <path
                          fill="#EB4335"
                          d="M29.4960833,11.4050769 C35.0347044,11.4050769 38.7707997,13.7975244 40.9011602,15.7968415 L49.2255853,7.66898166 C44.1130815,2.91684746 37.4599129,0 29.4960833,0 C17.959737,0 7.9965904,6.62018183 3.14617358,16.2554937 L12.6832029,23.6623884 C15.0758763,16.5505675 21.6960582,11.4050769 29.4960833,11.4050769"
                        ></path>
                      </g>
                    </g>
                  </svg>
                  <span className="ml-2">Sign In with Google</span>
                </div>
              </div>
            )}
          </button>

          {/* Privacy Notice */}
          <p className="mt-6 text-xs text-center text-muted">
            By signing in, you agree to our Terms of Service and Privacy Policy. Your health data is
            encrypted and private.
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <Cpu className="text-primary" size={28} />
            <h4 className="mt-2 text-sm font-semibold">AI-driven insights</h4>
            <p className="text-xs text-muted">
              Personalized recommendations powered by medical research.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="text-primary" size={28} />
            <h4 className="mt-2 text-sm font-semibold">Data security</h4>
            <p className="text-xs text-muted">
              Encrypted storage and strict privacy controls for your health data.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <Heart className="text-primary" size={28} />
            <h4 className="mt-2 text-sm font-semibold">Compassionate support</h4>
            <p className="text-xs text-muted">
              Actionable, empathetic guidance to help you manage PCOS day-to-day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
