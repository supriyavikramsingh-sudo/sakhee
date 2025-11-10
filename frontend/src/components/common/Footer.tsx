import { Heart } from 'lucide-react';
import type { ReactNode } from 'react';

const Footer = ({ children }: { children?: ReactNode }) => {
  return (
    <footer className="bg-background text-[#700f0f] snap-end flex flex-col gap-2 items-center justify-center mt-8 py-8 w-full">
      {children}
      <div className="flex gap-2 justify-center items-center">
        <Heart size={40} className="bg-secondary border border-[#700f0f] rounded-lg p-1" />
        <h3 className="text-3xl">AI Sakhee</h3>
      </div>
      <p className="text-center text-sm max-w-2xl font-semibold">
        © 2025 AI Sakhee. All rights reserved.
      </p>
      <p className="text-center text-sm max-w-2xl font-semibold">
        By creating an account you agree to our Terms of Service and Privacy Policy. Your health
        data is stored securely and never shared without your consent.
      </p>
    </footer>
  );
};

export default Footer;
