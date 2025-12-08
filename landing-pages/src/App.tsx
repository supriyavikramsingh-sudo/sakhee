import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AboutUsPage from './AboutUsPage';
import JoinCommunityPage from './JoinCommunityPage';
import ScrollToTop from './ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<JoinCommunityPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
