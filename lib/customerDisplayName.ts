import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatCustomerDisplayName } from "@/lib/customerDisplayNameValue";

export { formatCustomerDisplayName } from "@/lib/customerDisplayNameValue";

export async function getCustomerDisplayName(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("first_name,last_name,full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("Müşteri profili okunamadı.");
  return formatCustomerDisplayName(data);
}
