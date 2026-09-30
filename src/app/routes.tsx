import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell, BareLayout } from './AppShell';
import { FightsPlaceholder } from '../pages/FightsPlaceholder';
import { LivePlaceholder } from '../pages/LivePlaceholder';
import { StandingsPlaceholder } from '../pages/StandingsPlaceholder';
import { WalletPlaceholder } from '../pages/WalletPlaceholder';
import { MePlaceholder } from '../pages/MePlaceholder';
import { AdminPlaceholder } from '../pages/AdminPlaceholder';
import { LoginPlaceholder } from '../pages/LoginPlaceholder';
import { NotFoundPlaceholder } from '../pages/NotFoundPlaceholder';
import { InstallPage } from '../features/install/InstallPage';

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
    element: <AppShell />,
    children: [
      { path: '/', element: <FightsPlaceholder /> },
      { path: '/live', element: <LivePlaceholder /> },
      { path: '/standings', element: <StandingsPlaceholder /> },
      { path: '/wallet', element: <WalletPlaceholder /> },
      { path: '/me', element: <MePlaceholder /> },
      { path: '/admin/*', element: <AdminPlaceholder /> },
    ],
  },
  {
    element: <BareLayout />,
    children: [
      { path: '/install', element: <InstallPage /> },
      { path: '/login', element: <LoginPlaceholder /> },
      ...devRoutes,
      { path: '*', element: <NotFoundPlaceholder /> },
    ],
  },
];

export const router = createBrowserRouter(routeTree);
