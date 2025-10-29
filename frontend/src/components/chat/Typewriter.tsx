import { useEffect, useState } from 'react';

interface TypewriterProps {
  setIsGeneratedCompletly: (value: boolean) => void;
  text: string;
  speed?: number;
}

const Typewriter = ({ setIsGeneratedCompletly, text, speed = 10 }: TypewriterProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const words = text.split(' ');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < words.length) {
        setDisplayedText((prev) => prev + (index > 0 ? ' ' : '') + words[index]);
        index++;
      } else {
        setIsGeneratedCompletly(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {displayedText}
      <span className="animate-pulse">|</span>
    </p>
  );
};

export default Typewriter;
