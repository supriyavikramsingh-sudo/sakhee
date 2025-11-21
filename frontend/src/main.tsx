import { ConfigProvider } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import { ToastContainer } from 'react-toastify';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#ff8d8d',
        borderRadius: 4,
      },
    }}
  >
    <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    <StrictMode>
      <App />
    </StrictMode>
  </ConfigProvider>
);
