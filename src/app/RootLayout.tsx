import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../features/auth/SessionProvider.tsx';

/** Wraps the whole route tree so `useSession()` works on every screen, including /login. */
export function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
