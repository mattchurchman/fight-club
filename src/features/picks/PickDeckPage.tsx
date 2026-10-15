import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useBouts, useEvent } from '../events/hooks.ts';
import { PickDeck } from './PickDeck.tsx';
import { usePickDraft } from './usePickDraft.ts';

function DeckSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/** Mounted at /event/:id/picks inside `DeckLayout` (docs/tasks/T31). */
export function PickDeckPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const event = useEvent(id ?? null);
  const bouts = useBouts(id ?? null);
  const draft = usePickDraft(id ?? null, event, bouts);

  if (!id) return <Navigate to="/" replace />;
  if (event === undefined || bouts === undefined || draft.loading) return <DeckSkeleton />;
  if (event === null) return <Navigate to="/" replace />;
  if (event.status !== 'open') return <Navigate to={`/event/${id}`} replace />;

  return (
    <PickDeck event={event} bouts={bouts} draft={draft} initialBoutId={searchParams.get('fight')} />
  );
}
