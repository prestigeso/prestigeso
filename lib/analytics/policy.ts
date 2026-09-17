export const ANALYTICS_POLICY = {
  version: "2026-09-17",
  idleMinutes: 30,
  abandonmentHours: 24,
  retentionDays: 30,
  // No permanent anonymous rollups yet: avoids extending retention without approval.
  maxReportDays: 30,
} as const;
