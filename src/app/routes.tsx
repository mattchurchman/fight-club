import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell, BareLayout } from './AppShell';
import { RootLayout } from './RootLayout';
import { RequireAdmin, RequireReady } from './RouteGuards';
import { EventPage } from '../features/events/EventPage';
import { LivePage } from '../features/live/LivePage';
import { StandingsPlaceholder } from '../pages/StandingsPlaceholder';
import { WalletPage } from '../features/wallet/WalletPage';
import { AdminHomePage } from '../features/admin/AdminHomePage';
import { PeoplePage } from '../features/admin/PeoplePage';
import { TokensPage } from '../features/admin/TokensPage';
import { NotFoundPlaceholder } from '../pages/NotFoundPlaceholder';
import { InstallPage } from '../features/install/InstallPage';
import { LoginPage } from '../features/auth/LoginPage';
import { MePage } from '../features/auth/MePage';

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        lazy: async () => {
          const { UiGallery } = await import('./dev/UiGallery');
          return { Component: UiGallery };
        },
      },
    ]
  : [];

export const routeTree: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: (
          <RequireReady>
            <AppShell />
          </RequireReady>
        ),
        children: [
          { path: '/', element: <EventPage /> },
          { path: '/event/:id', element: <EventPage /> },
          { path: '/live', element: <LivePage /> },
          { path: '/standings', element: <StandingsPlaceholder /> },
          { path: '/wallet', element: <WalletPage /> },
          { path: '/me', element: <MePage /> },
          {
            path: '/admin',
            element: (
              <RequireAdmin>
                <AdminHomePage />
              </RequireAdmin>
            ),
          },
          {
            path: '/admin/people',
            element: (
              <RequireAdmin>
                <PeoplePage />
              </RequireAdmin>
            ),
          },
          {
            path: '/admin/tokens',
            element: (
              <RequireAdmin>
                <TokensPage />
              </RequireAdmin>
            ),
          },
        ],
      },
      {
        element: <BareLayout />,
        children: [
          { path: '/install', element: <InstallPage /> },
          { path: '/login', element: <LoginPage /> },
          ...devRoutes,
          { path: '*', element: <NotFoundPlaceholder /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routeTree);
