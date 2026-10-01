import { Card } from '../../components/ui/Card.tsx';
import { formatH2HRecord, orientH2H, sortH2HRecords } from './h2h.ts';
import type { H2HDocLike } from './h2h.ts';
import type { UserWithId } from './hooks.ts';

interface H2HSectionProps {
  docs: H2HDocLike[];
  profileUid: string;
  /** null when signed out (never happens behind `RequireReady`, but keeps this honest). */
  viewerUid: string | null;
  usersById: Record<string, UserWithId>;
}

function nameOf(usersById: Record<string, UserWithId>, uid: string): string {
  return usersById[uid]?.displayName ?? 'Unknown';
}

/** The profile owner's full H2H record; viewing someone else also gets a "you vs. them" card up top. */
export function H2HSection({ docs, profileUid, viewerUid, usersById }: H2HSectionProps) {
  const records = sortH2HRecords(
    docs.map((d) => orientH2H(d, profileUid)),
    (uid) => nameOf(usersById, uid),
  );

  const isSelf = viewerUid === profileUid;
  const versusDoc = docs.find(
    (d) =>
      (d.a === viewerUid && d.b === profileUid) || (d.a === profileUid && d.b === viewerUid),
  );
  const versusRecord =
    !isSelf && viewerUid
      ? versusDoc
        ? orientH2H(versusDoc, viewerUid)
        : { otherUid: profileUid, wins: 0, losses: 0, ties: 0 }
      : null;

  return (
    <div className="flex flex-col gap-3">
      {versusRecord && (
        <Card className="border-gold bg-gold/10 text-center">
          <p className="font-display text-lg uppercase text-text">
            {formatH2HRecord(versusRecord, nameOf(usersById, profileUid))}
          </p>
        </Card>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-muted">No head-to-head history yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {records.map((record) => (
            <div
              key={record.otherUid}
              className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2"
            >
              <p className="text-sm text-text">{nameOf(usersById, record.otherUid)}</p>
              <p className="text-sm font-semibold tabular-nums text-muted">
                {record.wins}–{record.losses}
                {record.ties > 0 ? `–${record.ties}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
