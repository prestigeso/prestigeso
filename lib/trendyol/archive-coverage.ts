export type ArchiveJob = { starts_at: number | string; ends_at: number | string; status: string };

export function archiveCoverage(start: number, end: number, jobs: ArchiveJob[]) {
  const intervals = jobs.filter(job => job.status === 'complete')
    .map(job => ({ start: Number(job.starts_at), end: Number(job.ends_at) }))
    .filter(job => Number.isSafeInteger(job.start) && Number.isSafeInteger(job.end) && job.end > job.start)
    .sort((a, b) => a.start - b.start);
  const firstAvailableAt = intervals.length ? intervals[0].start : null;
  let cursor = start;
  for (const interval of intervals) {
    if (interval.start > cursor) break;
    cursor = Math.max(cursor, interval.end);
    if (cursor >= end) break;
  }
  // A few minutes of provider lag are not a missing historical day.
  return { complete: cursor >= end - 15 * 60000, firstAvailableAt, checkedThrough: cursor > start ? cursor : null };
}
