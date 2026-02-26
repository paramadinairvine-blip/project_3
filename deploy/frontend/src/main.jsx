import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import toast, { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { getErrorMessage } from './utils/handleError'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Don't toast for 401 (handled by interceptor redirect)
      if (error.response?.status === 401) return;
      toast.error(getErrorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Only show global toast if mutation has NO individual onError handler
      if (mutation.options.onError) return;
      if (error.response?.status === 401) return;
      toast.error(getErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on auth/permission/validation errors
        if (error.response?.status === 401 || error.response?.status === 403 ||
            error.response?.status === 404 || error.response?.status === 422) return false;
        return failureCount < 1;
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
