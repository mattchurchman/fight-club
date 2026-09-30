import { useState } from 'react';
import { useSession } from '../auth/SessionProvider';
import { Button } from '../../components/ui/Button';
import { LedgerList } from './LedgerList';
import { TokenRequestSheet } from './TokenRequestSheet';
import { useLedger, useTokenRequests } from './hooks';

export function WalletPage() {
  const { profile } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { rows: ledgerRows, loading: ledgerLoading } = useLedger();
  const { requests } = useTokenRequests();

  const balance = profile?.balance ?? 0;
  const isBroke = balance === 0;

  return (
    <div className="flex flex-col">
      {/* Balance */}
      <div className="border-b border-line bg-surface px-4 py-8 text-center">
        <div className="mb-2 text-sm uppercase text-muted">Your balance</div>
        <div className="font-display text-5xl text-gold tabular-nums">{balance}</div>
        {isBroke && <div className="mt-4 text-sm text-muted">You're broke. Beg the admin.</div>}
      </div>

      {/* Request button */}
      <div className="border-b border-line px-4 py-3">
        <Button onClick={() => setSheetOpen(true)} className="w-full" variant="secondary">
          Request Tokens
        </Button>
      </div>

      {/* Ledger list */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-2 border-b border-line px-4 py-3 text-xs font-semibold uppercase text-muted">
          Transaction history
        </div>
        <LedgerList rows={ledgerRows} loading={ledgerLoading} />
      </div>

      {/* Request sheet */}
      <TokenRequestSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        requests={requests}
        onSuccess={() => setSheetOpen(false)}
      />
    </div>
  );
}
