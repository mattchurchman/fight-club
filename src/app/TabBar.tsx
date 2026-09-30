import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { FightsIcon, LiveIcon, MeIcon, StandingsIcon, WalletIcon } from './icons';

const tabs = [
  { to: '/', label: 'Fights', Icon: FightsIcon },
  { to: '/live', label: 'Live', Icon: LiveIcon },
  { to: '/standings', label: 'Standings', Icon: StandingsIcon },
  { to: '/wallet', label: 'Wallet', Icon: WalletIcon },
  { to: '/me', label: 'Me', Icon: MeIcon },
];

export function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom sticky bottom-0 z-40 border-t border-line bg-surface"
    >
      <div className="mx-auto flex max-w-[640px] items-stretch justify-between px-2">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
                isActive ? 'text-red' : 'text-muted hover:text-text',
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
