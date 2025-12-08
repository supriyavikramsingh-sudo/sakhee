import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AboutUsPage from './AboutUsPage';
import JoinCommunityPage from './JoinCommunityPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<JoinCommunityPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
