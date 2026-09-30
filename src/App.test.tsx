// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from './components/ui/Toast';
import { routeTree } from './app/routes';

const paths = [
  '/',
  '/live',
  '/standings',
  '/wallet',
  '/me',
  '/admin',
  '/admin/anything',
  '/install',
  '/login',
  '/dev/ui',
  '/this-does-not-exist',
];

describe('router', () => {
  it.each(paths)('renders %s without crashing', async (path) => {
    const router = createMemoryRouter(routeTree, { initialEntries: [path] });
    const { container } = render(
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>,
    );
    await waitFor(() => expect(container).not.toBeEmptyDOMElement());
  });
});
