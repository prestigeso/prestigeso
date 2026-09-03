export type CustomerName = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
};

function words(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

export function formatCustomerDisplayName(customer: CustomerName | null) {
  if (!customer) return "Müşteri";

  const firstNameParts = words(customer.first_name);
  const lastNameParts = words(customer.last_name);
  const fullNameParts = words(customer.full_name);
  const firstName = (firstNameParts[0] || fullNameParts[0] || "").slice(0, 80);
  const lastName =
    lastNameParts.at(-1) ||
    (fullNameParts.length > 1 ? fullNameParts.at(-1) : "");

  if (!firstName) return "Müşteri";
  if (!lastName) return firstName;

  const initial = Array.from(lastName)[0]?.toLocaleUpperCase("tr-TR");
  return initial ? `${firstName} ${initial}.` : firstName;
}
