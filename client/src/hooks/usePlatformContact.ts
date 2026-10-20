import { trpc } from "@/lib/trpc";
import { buildPlatformWhatsAppLink, EMPTY_PLATFORM_CONTACT, type PlatformContact } from "@shared/platformContact";

/** Contatos públicos cadastrados pelo Super Admin. Enquanto carrega (ou se falhar), nada é exibido. */
export function usePlatformContact(): { contact: PlatformContact; whatsappLink: string | null; isLoading: boolean } {
  const query = trpc.platform.publicContact.useQuery(undefined, { staleTime: 5 * 60 * 1000, retry: 1 });
  const contact = query.data ?? EMPTY_PLATFORM_CONTACT;
  return { contact, whatsappLink: buildPlatformWhatsAppLink(contact), isLoading: query.isLoading };
}
