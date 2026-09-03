import "server-only";

import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type EvidenceIdentity = {
  orderId: number;
  userId: string;
  paths: string[];
};

type ReleaseClaim = {
  claimId: string;
  paths: string[];
};

function readObjectPath(row: unknown) {
  if (typeof row === "string") return row;
  if (!row || typeof row !== "object") return "";
  return String((row as { object_path?: unknown }).object_path || "");
}

async function cancelReleaseClaim({ claimId, paths }: ReleaseClaim) {
  if (paths.length === 0) return;
  await supabaseAdmin.rpc("cancel_return_evidence_release", {
    p_deletion_claim_id: claimId,
    p_object_paths: paths,
  });
}

async function removeClaimedEvidence({ claimId, paths }: ReleaseClaim) {
  const { error: removeError } = await supabaseAdmin.storage
    .from("return-evidence")
    .remove(paths);
  if (removeError) {
    await cancelReleaseClaim({ claimId, paths }).catch(() => undefined);
    throw new Error("RETURN_EVIDENCE_STORAGE_REMOVE_FAILED");
  }

  const { error: completeError } = await supabaseAdmin.rpc(
    "complete_return_evidence_release",
    {
      p_deletion_claim_id: claimId,
      p_object_paths: paths,
    },
  );
  // Do not cancel after Storage accepted the delete. If this final database
  // step fails, the timed-out claim is safely retried by maintenance.
  if (completeError) throw new Error("RETURN_EVIDENCE_RELEASE_FINALIZE_FAILED");
}

export async function reserveReturnEvidenceUploads({
  orderId,
  userId,
  paths,
}: EvidenceIdentity) {
  const { data, error } = await supabaseAdmin.rpc(
    "reserve_return_evidence_uploads",
    {
      p_order_id: orderId,
      p_user_id: userId,
      p_object_paths: paths,
    },
  );
  if (error) throw new Error(error.message);
  return data === true;
}

export async function releaseReturnEvidenceUploads({
  orderId,
  userId,
  paths,
}: EvidenceIdentity) {
  if (paths.length === 0) return;

  const { data, error } = await supabaseAdmin.rpc(
    "release_return_evidence_uploads",
    {
      p_order_id: orderId,
      p_user_id: userId,
      p_object_paths: paths,
    },
  );
  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? data : [];
  const released = rows.map(readObjectPath).filter(Boolean);
  const claimIds = new Set(
    rows
      .map((row) =>
        row && typeof row === "object"
          ? String(
              (row as { deletion_claim_id?: unknown }).deletion_claim_id || "",
            )
          : "",
      )
      .filter(Boolean),
  );
  const claimMatches =
    released.length === paths.length &&
    new Set(released).size === paths.length &&
    released.every((path) => paths.includes(path)) &&
    claimIds.size === 1;
  if (!claimMatches) {
    if (claimIds.size === 1 && released.length > 0)
      await cancelReleaseClaim({
        claimId: [...claimIds][0],
        paths: [...new Set(released)],
      }).catch(() => undefined);
    throw new Error("RETURN_EVIDENCE_RELEASE_CLAIM_INVALID");
  }

  await removeClaimedEvidence({ claimId: [...claimIds][0], paths: released });
}

export async function cleanupStaleReturnEvidenceUploads(limit = 100) {
  const claimId = randomUUID();
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit)));
  const { data, error } = await supabaseAdmin.rpc(
    "claim_stale_return_evidence_uploads",
    {
      p_deletion_claim_id: claimId,
      p_limit: safeLimit,
    },
  );
  if (error) throw new Error("RETURN_EVIDENCE_CLEANUP_CLAIM_FAILED");

  const paths = (Array.isArray(data) ? data : [])
    .map(readObjectPath)
    .filter(Boolean);
  if (paths.length === 0) return 0;
  if (new Set(paths).size !== paths.length || paths.length > safeLimit) {
    await cancelReleaseClaim({ claimId, paths: [...new Set(paths)] }).catch(
      () => undefined,
    );
    throw new Error("RETURN_EVIDENCE_CLEANUP_CLAIM_INVALID");
  }

  await removeClaimedEvidence({ claimId, paths });
  return paths.length;
}
