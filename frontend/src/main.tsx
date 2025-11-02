import { ConfigProvider } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#ff8d8d',
        borderRadius: 4,
      },
    }}
  >
    <StrictMode>
      <App />
    </StrictMode>
  </ConfigProvider>
);
