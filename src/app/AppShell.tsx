import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { TabBar } from './TabBar';

const titles: Record<string, string> = {
  '/': 'Fights',
  '/live': 'Live',
  '/standings': 'Standings',
  '/wallet': 'Wallet',
  '/me': 'Me',
  '/help': 'How It Works',
};

function titleFor(pathname: string): string {
  if (pathname === '/admin/help') return 'Admin Help';
  if (pathname.startsWith('/admin')) return 'Admin';
  return titles[pathname] ?? 'Fight Club';
}

export function AppShell() {
  const location = useLocation();

  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col bg-bg">
      <Header title={titleFor(location.pathname)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

export function BareLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col bg-bg">
      <main className="safe-top safe-bottom flex-1">
        <Outlet />
      </main>
    </div>
  );
}
