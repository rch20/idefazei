// Slugs (subdomínios) que NÃO podem ser usados por uma igreja, porque colidem
// com o domínio principal, com subdomínios de infraestrutura/ambiente, ou com
// caminhos reservados do produto. Sem essa trava, o auto-cadastro público
// poderia registrar uma igreja com slug "idefazei" (o próprio apex é resolvido
// como esse slug), "www", "api", "homolog" etc. e interceptar a resolução de
// tenant desses hosts.
export const RESERVED_CHURCH_SLUGS: ReadonlySet<string> = new Set([
  // Marca / apex
  "idefazei", "ide-fazei", "idefazei-app", "ide",
  // Subdomínios de infraestrutura e roteamento
  "www", "admin", "api", "app", "apps", "mail", "email", "webmail", "smtp",
  "imap", "pop", "ftp", "ns", "ns1", "ns2", "mx", "cdn", "static", "assets",
  "img", "images", "media", "files", "download", "downloads", "upload", "uploads",
  // Ambientes
  "demo", "homolog", "homologacao", "staging", "stage", "dev", "test", "teste",
  "qa", "sandbox", "preview", "beta", "alpha", "local", "localhost",
  // Caminhos / produto reservados
  "status", "suporte", "support", "ajuda", "help", "docs", "doc", "blog", "loja",
  "store", "pay", "pagamento", "pagamentos", "checkout", "billing", "cobranca",
  "conta", "account", "login", "logout", "entrar", "sair", "signup", "signin",
  "cadastro", "auth", "oauth", "sso", "painel", "dashboard", "portal", "system",
  "sys", "internal", "private", "public", "secure", "security", "root", "me",
  "null", "undefined", "none", "false", "true",
]);

/** Normaliza o slug para comparação (minúsculas, sem espaços nas pontas). */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Verdadeiro se o slug é reservado e não pode ser usado por uma igreja. */
export function isReservedChurchSlug(slug: string): boolean {
  return RESERVED_CHURCH_SLUGS.has(normalizeSlug(slug));
}

export const RESERVED_SLUG_MESSAGE =
  "Este subdomínio é reservado. Escolha outro nome para o endereço da igreja.";
