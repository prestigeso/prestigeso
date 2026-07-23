import crypto from "node:crypto";

export function createPaytrCallbackHash({
  merchantOid,
  merchantSalt,
  status,
  totalAmount,
  merchantKey,
}: {
  merchantOid: string;
  merchantSalt: string;
  status: "success" | "failed";
  totalAmount: string;
  merchantKey: string;
}) {
  return crypto
    .createHmac("sha256", merchantKey)
    .update(merchantOid + merchantSalt + status + totalAmount)
    .digest("base64");
}

export function verifyPaytrCallbackHash(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function createPaytrRefundToken({
  merchantId,
  merchantOid,
  returnAmount,
  merchantSalt,
  merchantKey,
}: {
  merchantId: string;
  merchantOid: string;
  returnAmount: string;
  merchantSalt: string;
  merchantKey: string;
}) {
  return crypto
    .createHmac("sha256", merchantKey)
    .update(merchantId + merchantOid + returnAmount + merchantSalt)
    .digest("base64");
}

export function createOrderTrackingToken(
  merchantOid: string,
  merchantKey: string,
) {
  return crypto
    .createHmac("sha256", merchantKey)
    .update(`tracking:${merchantOid}`)
    .digest("base64url");
}
