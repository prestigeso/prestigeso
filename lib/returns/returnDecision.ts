export type ReturnDecisionMutation = {
  data: { id: unknown } | null;
  error: { message: string } | null;
};

export class ReturnDecisionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReturnDecisionError";
    this.status = status;
  }
}

type ReturnDecisionOperations<Result> = {
  claim: () => PromiseLike<ReturnDecisionMutation>;
  perform: () => Promise<Result>;
  complete?: () => PromiseLike<ReturnDecisionMutation>;
  reset?: () => PromiseLike<ReturnDecisionMutation>;
  canRetry: (error: unknown) => boolean;
};

/** A successful pending-state CAS is required before any refund or order mutation. */
export async function runReturnDecision<Result>(
  operations: ReturnDecisionOperations<Result>,
): Promise<Result> {
  const claim = await operations.claim();
  if (claim.error)
    throw new ReturnDecisionError(
      "İade kararı kaydı doğrulanamadı. İşlem tekrarlanmadan önce talep durumunu kontrol edin.",
      500,
    );
  if (!claim.data)
    throw new ReturnDecisionError(
      "Bu iade talebi başka bir işlem tarafından ele alındı. Listeyi yenileyin.",
      409,
    );

  let result: Result;
  try {
    result = await operations.perform();
  } catch (error) {
    // Unknown outcomes stay claimed. Only an explicit, confirmed safe failure can reopen a request.
    if (operations.reset && operations.canRetry(error)) {
      let reset: ReturnDecisionMutation;
      try {
        reset = await operations.reset();
      } catch {
        throw new ReturnDecisionError(
          "İade talebinin yeniden beklemeye alınması doğrulanamadı. Manuel mutabakat gerekiyor; işlemi tekrarlamayın.",
          500,
        );
      }
      if (reset.error || !reset.data)
        throw new ReturnDecisionError(
          "İade talebi güvenli biçimde yeniden beklemeye alınamadı. Manuel mutabakat gerekiyor; işlemi tekrarlamayın.",
          500,
        );
    }
    throw error;
  }

  // A payment may already have completed here. Never reopen the request after a completion error.
  if (operations.complete) {
    let completed: ReturnDecisionMutation;
    try {
      completed = await operations.complete();
    } catch {
      throw new ReturnDecisionError(
        "Para iadesi işlendi ancak talebin tamamlanma kaydı doğrulanamadı. Manuel mutabakat gerekiyor; işlemi tekrarlamayın.",
        500,
      );
    }
    if (completed.error || !completed.data)
      throw new ReturnDecisionError(
        "Para iadesi işlendi ancak talep tamamlandı olarak kaydedilemedi. Manuel mutabakat gerekiyor; işlemi tekrarlamayın.",
        500,
      );
  }
  return result;
}
