/** Numéro WhatsApp des mariés (facultatif) : NEXT_PUBLIC_CONTACT_WHATSAPP, au format international (ex. +4512345678). */
export function contactWhatsappUrl(text?: string): string | null {
  const digits = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
