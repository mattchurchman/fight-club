// Pure H2H record math (docs/tasks/T21). `h2h/{uidA__uidB}` (docs/DATA_MODEL.md) stores wins from
// the sorted-uid perspective, not the viewer's — this reorients it and renders the bragging line.

export interface H2HDocLike {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  ties: number;
}

export interface H2HRecord {
  otherUid: string;
  wins: number;
  losses: number;
  ties: number;
}

/** Flips `aWins`/`bWins` onto "my wins" / "their wins" for whichever side `viewerUid` is. */
export function orientH2H(doc: H2HDocLike, viewerUid: string): H2HRecord {
  const viewerIsA = doc.a === viewerUid;
  return {
    otherUid: viewerIsA ? doc.b : doc.a,
    wins: viewerIsA ? doc.aWins : doc.bWins,
    losses: viewerIsA ? doc.bWins : doc.aWins,
    ties: doc.ties,
  };
}

/** "You're 7–3 vs. Dave" (docs/PRODUCT.md) — a tie count only appears when there's at least one. */
export function formatH2HRecord(record: H2HRecord, otherDisplayName: string): string {
  const { wins, losses, ties } = record;
  if (wins === 0 && losses === 0 && ties === 0) {
    return `No games yet vs. ${otherDisplayName}`;
  }
  const score = ties > 0 ? `${wins}–${losses}–${ties}` : `${wins}–${losses}`;
  return `You're ${score} vs. ${otherDisplayName}`;
}

/** Most games played first; ties broken by name so the order is stable. */
export function sortH2HRecords<T extends H2HRecord>(
  records: readonly T[],
  nameOf: (uid: string) => string,
): T[] {
  return [...records].sort((a, b) => {
    const gamesDiff = b.wins + b.losses + b.ties - (a.wins + a.losses + a.ties);
    if (gamesDiff !== 0) return gamesDiff;
    return nameOf(a.otherUid).localeCompare(nameOf(b.otherUid));
  });
}
