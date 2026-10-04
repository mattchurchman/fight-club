import { useState } from 'react';
import type { EventStatus } from '@shared/index.ts';
import type { ScoresPlan } from '@shared/lifecycle/index.ts';
import { Button } from '../../../components/ui/Button.tsx';
import { Card } from '../../../components/ui/Card.tsx';
import { Sheet } from '../../../components/ui/Sheet.tsx';
import { useSession } from '../../auth/SessionProvider.tsx';
import { canCancel, canFinalize, canRescore } from './permissions.ts';
import {
  applyCancel,
  applyFinalize,
  applyRescore,
  previewCancel,
  previewFinalize,
  previewRescore,
  type CancelPreview,
  type FinalizePreview,
} from './actions.ts';
import { applyEspnRefresh, previewEspnRefresh, type EspnRefreshPreview } from './espnRefresh.ts';

const confirmInputClass =
  'min-h-11 rounded-chip border border-line bg-surface-2 px-4 text-sm text-text placeholder-muted focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

interface ActionsPanelProps {
  eventId: string;
  status: EventStatus;
  /** Called after any action writes successfully, so the page can re-fetch its live data if it wants to. */
  onDone: () => void;
}

type ActiveAction = 'espn' | 'rescore' | 'finalize' | 'cancel' | null;

export function ActionsPanel({ eventId, status, onDone }: ActionsPanelProps) {
  const { user } = useSession();
  const [active, setActive] = useState<ActiveAction>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [espnPreview, setEspnPreview] = useState<EspnRefreshPreview | null>(null);
  const [rescorePlan, setRescorePlan] = useState<ScoresPlan | null>(null);
  const [finalizePreview, setFinalizePreview] = useState<FinalizePreview | null>(null);
  const [cancelPreview, setCancelPreview] = useState<CancelPreview | null>(null);
  const [finalizeConfirm, setFinalizeConfirm] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState('');

  const reset = () => {
    setActive(null);
    setLoading(false);
    setError('');
    setEspnPreview(null);
    setRescorePlan(null);
    setFinalizePreview(null);
    setCancelPreview(null);
    setFinalizeConfirm('');
    setCancelConfirm('');
  };

  async function openPreview(action: ActiveAction, load: () => Promise<void>) {
    setActive(action);
    setLoading(true);
    setError('');
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  }

  async function confirm(run: () => Promise<void>) {
    setLoading(true);
    setError('');
    try {
      await run();
      reset();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase text-muted">Actions</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!canRescore(status)}
          onClick={() => openPreview('espn', async () => setEspnPreview(await previewEspnRefresh(eventId)))}
          className="min-h-9 px-3 text-xs"
        >
          Check ESPN now
        </Button>
        <Button
          variant="secondary"
          disabled={!canRescore(status)}
          onClick={() => openPreview('rescore', async () => setRescorePlan(await previewRescore(eventId)))}
          className="min-h-9 px-3 text-xs"
        >
          Rescore now
        </Button>
        <Button
          disabled={!canFinalize(status)}
          onClick={() => openPreview('finalize', async () => setFinalizePreview(await previewFinalize(eventId)))}
          className="min-h-9 px-3 text-xs"
        >
          Finalize now
        </Button>
        <Button
          variant="danger"
          disabled={!canCancel(status)}
          onClick={() => openPreview('cancel', async () => setCancelPreview(await previewCancel(eventId)))}
          className="min-h-9 px-3 text-xs"
        >
          Cancel event
        </Button>
      </div>

      <Sheet open={active === 'espn'} onClose={reset} title="Check ESPN now">
        {loading && !espnPreview ? (
          <p className="text-sm text-muted">Checking ESPN…</p>
        ) : espnPreview ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text">
              Checked {espnPreview.checked} {espnPreview.checked === 1 ? 'bout' : 'bouts'} still in play.
            </p>
            {espnPreview.plan.applies ? (
              <ul className="flex flex-col gap-1 text-sm text-text">
                {espnPreview.plan.bouts.map((write) => (
                  <li key={write.boutId}>
                    {write.boutId.replace(/^bout_/, '')}: {write.result.winner} by {write.result.method}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No new results from ESPN yet.</p>
            )}
            {error ? <p className="text-sm text-red">{error}</p> : null}
            <Button
              disabled={loading || !espnPreview.plan.applies}
              onClick={() => confirm(() => applyEspnRefresh(eventId, espnPreview))}
            >
              {loading ? 'Applying…' : `Apply ${espnPreview.plan.bouts.length} result${espnPreview.plan.bouts.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={active === 'rescore'} onClose={reset} title="Rescore now">
        {loading && !rescorePlan ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rescorePlan ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text">
              {rescorePlan.applies
                ? `${rescorePlan.entries.length} ${rescorePlan.entries.length === 1 ? 'entry' : 'entries'}' scores will change.`
                : rescorePlan.reason === 'no-entries'
                  ? 'No live entries to score.'
                  : 'Nothing to rescore right now — scores already match the card.'}
            </p>
            {error ? <p className="text-sm text-red">{error}</p> : null}
            <Button
              disabled={loading || !rescorePlan.applies}
              onClick={() => confirm(() => applyRescore(eventId, rescorePlan))}
            >
              {loading ? 'Rescoring…' : 'Rescore'}
            </Button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={active === 'finalize'} onClose={reset} title="Finalize now">
        {loading && !finalizePreview ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : finalizePreview ? (
          <div className="flex flex-col gap-3">
            {finalizePreview.plan.applies ? (
              <>
                <p className="text-sm text-text">
                  Pays out {finalizePreview.plan.payouts.length} of {finalizePreview.plan.ranked.length}{' '}
                  {finalizePreview.plan.ranked.length === 1 ? 'entry' : 'entries'}, totalling{' '}
                  {finalizePreview.plan.payouts.reduce((sum, p) => sum + p.amount, 0)} tokens.
                </p>
                <p className="text-sm text-muted">
                  This is a one-way door — payouts post immediately and a second finalize is blocked.
                  Type FINALIZE to confirm.
                </p>
                <input
                  type="text"
                  value={finalizeConfirm}
                  onChange={(e) => setFinalizeConfirm(e.target.value)}
                  placeholder="FINALIZE"
                  className={confirmInputClass}
                />
              </>
            ) : (
              <p className="text-sm text-text">
                {finalizePreview.plan.reason === 'bouts-pending'
                  ? 'Not every main-card bout has a result yet.'
                  : finalizePreview.plan.reason === 'awaiting-first-blood'
                    ? 'Waiting on first blood (up to 12h after the last result) before finalizing.'
                    : finalizePreview.plan.reason === 'already-final'
                      ? 'This event is already final.'
                      : 'This event is not in play.'}
              </p>
            )}
            {error ? <p className="text-sm text-red">{error}</p> : null}
            <Button
              variant="danger"
              disabled={loading || !finalizePreview.plan.applies || finalizeConfirm !== 'FINALIZE' || !user?.uid}
              onClick={() => user?.uid && confirm(() => applyFinalize(eventId, finalizePreview, user.uid))}
            >
              {loading ? 'Finalizing…' : 'Finalize'}
            </Button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={active === 'cancel'} onClose={reset} title="Cancel event">
        {loading && !cancelPreview ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : cancelPreview ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text">
              Refunds {cancelPreview.paidCount} paid {cancelPreview.paidCount === 1 ? 'entry' : 'entries'}. This
              cannot be undone. Type CANCEL to confirm.
            </p>
            <input
              type="text"
              value={cancelConfirm}
              onChange={(e) => setCancelConfirm(e.target.value)}
              placeholder="CANCEL"
              className={confirmInputClass}
            />
            {error ? <p className="text-sm text-red">{error}</p> : null}
            <Button
              variant="danger"
              disabled={loading || cancelConfirm !== 'CANCEL' || !user?.uid}
              onClick={() => user?.uid && confirm(() => applyCancel(eventId, user.uid).then(() => undefined))}
            >
              {loading ? 'Cancelling…' : 'Cancel event & refund'}
            </Button>
          </div>
        ) : null}
      </Sheet>
    </Card>
  );
}
