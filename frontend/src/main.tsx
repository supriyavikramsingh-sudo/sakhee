import { ConfigProvider } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './app/App';
import './styles/index.css';
import { ToastContainer } from 'react-toastify';

// Create React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for 5 mins
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus (can be enabled per-query)
      retry: 1, // Retry failed requests once
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#ff8d8d',
        borderRadius: 4,
      },
    }}
  >
    <QueryClientProvider client={queryClient}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <StrictMode>
        <App />
      </StrictMode>
    </QueryClientProvider>
  </ConfigProvider>
);
