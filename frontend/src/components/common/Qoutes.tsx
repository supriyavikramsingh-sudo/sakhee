import { Typewriter } from 'react-simple-typewriter';
import { Quotes } from '../../utils/quotes';

const Qoutes = () => {
  return (
    <div className="border-primary border rounded-lg mt-6 p-3 text-lg max-w-[400px] text-center text-primary">
      🌸{' '}
      <Typewriter
        words={Quotes}
        loop={0}
        cursor
        cursorStyle="|"
        typeSpeed={70}
        deleteSpeed={50}
        delaySpeed={1500}
      />
    </div>
  );
};

export default Qoutes;
