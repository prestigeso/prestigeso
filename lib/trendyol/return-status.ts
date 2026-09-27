export type ReturnState = 'none' | 'requested' | 'refunded';

export function returnState(orderNumber: string, claims: { order_number: string; statuses: string[] }[], settlements: { order_number: string }[]): ReturnState {
  if (settlements.some(row => row.order_number === orderNumber)) return 'refunded';
  return claims.some(row => row.order_number === orderNumber && row.statuses.some(status => status !== 'Cancelled' && status !== 'Rejected')) ? 'requested' : 'none';
}

export function visiblePackageStatus(packageStatus: string, state: ReturnState): string {
  if (state === 'refunded') return 'İade edildi';
  if (state === 'requested') return 'İade talebi';
  return packageStatus;
}
