export function getWhatsAppLinkWithMessage(contact: string | null | undefined, message: string) {
  const number = (contact ?? "").replace(/\D/g, "");
  if (number.length < 10) return null;
  const internationalNumber = number.startsWith("55") ? number : `55${number}`;
  return `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppLink(contact: string | null | undefined, personName = "") {
  const greeting = personName.trim() ? `Olá, ${personName.trim()}!` : "Olá!";
  return getWhatsAppLinkWithMessage(
    contact,
    `${greeting} Aqui é da equipe da igreja. Recebemos seu pedido de oração e gostaríamos de conversar com você.`,
  );
}

export function formatContactPhone(contact: string | null | undefined) {
  return contact?.trim() || null;
}
