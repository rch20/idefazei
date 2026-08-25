export function getWhatsAppLink(contact: string | null | undefined, personName = "") {
  const number = (contact ?? "").replace(/\D/g, "");
  if (number.length < 10) return null;

  const internationalNumber = number.startsWith("55") ? number : `55${number}`;
  const greeting = personName.trim() ? `Olá, ${personName.trim()}!` : "Olá!";
  const message = encodeURIComponent(
    `${greeting} Aqui é da equipe da igreja. Recebemos seu pedido de oração e gostaríamos de conversar com você.`
  );

  return `https://wa.me/${internationalNumber}?text=${message}`;
}

export function formatContactPhone(contact: string | null | undefined) {
  return contact?.trim() || null;
}
