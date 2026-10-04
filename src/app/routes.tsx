import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell, BareLayout } from './AppShell';
import { RootLayout } from './RootLayout';
import { RequireAdmin, RequireReady } from './RouteGuards';
import { EventPage } from '../features/events/EventPage';
import { LivePage } from '../features/live/LivePage';
import { MyProfilePage } from '../features/profile/MyProfilePage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { StandingsPage } from '../features/standings/StandingsPage';
import { WalletPage } from '../features/wallet/WalletPage';
import { AdminHomePage } from '../features/admin/AdminHomePage';
import { AdminHelpPage } from '../features/admin/AdminHelpPage';
import { PeoplePage } from '../features/admin/PeoplePage';
import { TokensPage } from '../features/admin/TokensPage';
import { EventDetailPage as AdminEventDetailPage } from '../features/admin/events/EventDetailPage';
import { EventsListPage as AdminEventsListPage } from '../features/admin/events/EventsListPage';
import { NotFoundPlaceholder } from '../pages/NotFoundPlaceholder';
import { InstallPage } from '../features/install/InstallPage';
import { LoginPage } from '../features/auth/LoginPage';
import { HelpPage } from '../features/help/HelpPage';

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
          { path: '/standings', element: <StandingsPage /> },
          { path: '/wallet', element: <WalletPage /> },
          { path: '/me', element: <MyProfilePage /> },
          { path: '/u/:username', element: <ProfilePage /> },
          { path: '/help', element: <HelpPage /> },
          {
            path: '/admin',
            element: (
              <RequireAdmin>
                <AdminHomePage />
              </RequireAdmin>
            ),
          },
          {
            path: '/admin/help',
            element: (
              <RequireAdmin>
                <AdminHelpPage />
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
          {
            path: '/admin/events',
            element: (
              <RequireAdmin>
                <AdminEventsListPage />
              </RequireAdmin>
            ),
          },
          {
            path: '/admin/events/:id',
            element: (
              <RequireAdmin>
                <AdminEventDetailPage />
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
