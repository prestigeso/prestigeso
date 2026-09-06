type ApprovalDetails = {
  note: string;
  returnShippingCode: string;
};

type ApprovalDialogs = {
  prompt: (message: string) => string | null;
  confirm: (message: string) => boolean;
};

/** An in-flight/uncertain approval takes precedence over another pending entry. */
export function getReviewableReturnRequest<T extends { status: string }>(
  requests: readonly T[] | undefined,
): T | undefined {
  return requests?.find((request) => request.status === "approved") ||
    requests?.find((request) => request.status === "pending");
}

/** Native prompt cancel and Escape both return null; an optional empty field is not cancellation. */
export async function approveReturnWithConfirmation(
  summary: string,
  dialogs: ApprovalDialogs,
  approve: (details: ApprovalDetails) => void | Promise<void>,
): Promise<boolean> {
  const note = dialogs.prompt("Onay notu (isteğe bağlı):");
  if (note === null) return false;

  const returnShippingCode = dialogs.prompt("İade kargo kodu (isteğe bağlı):");
  if (returnShippingCode === null) return false;

  if (!dialogs.confirm(summary)) return false;

  await approve({
    note: note.trim().slice(0, 1000),
    returnShippingCode: returnShippingCode.trim().slice(0, 100),
  });
  return true;
}

export function confirmFinancialStatusChange(
  newStatus: string,
  summary: string,
  confirm: ApprovalDialogs["confirm"],
): boolean {
  return (
    !["İptal Edildi", "İade Edildi"].includes(newStatus) || confirm(summary)
  );
}
