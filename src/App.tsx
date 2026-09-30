import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { router } from './app/routes';
import { useSwUpdateToast } from './app/useSwUpdateToast';

function SwUpdateWatcher() {
  useSwUpdateToast();
  return null;
}

function App() {
  return (
    <ToastProvider>
      <SwUpdateWatcher />
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export default App;
