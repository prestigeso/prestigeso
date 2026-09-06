export class RefundError extends Error {
  readonly status: number;
  /** True only when this attempt is known not to have transferred money. */
  readonly retrySafe: boolean;

  constructor(message: string, status: number, retrySafe = false) {
    super(message);
    this.name = "RefundError";
    this.status = status;
    this.retrySafe = retrySafe;
  }
}
