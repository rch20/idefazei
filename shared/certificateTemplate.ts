export type CertificateType = "fundamentos" | "batismo" | "lideres";

export type CertificateTemplateCopy = {
  title: string;
  subtitle: string;
  body: string;
  course: string;
};

export type CertificateTemplateOverride = Pick<CertificateTemplateCopy, "title" | "subtitle" | "body"> & {
  modelKey?: string;
};

export const CERTIFICATE_TEMPLATE_COPY: Record<CertificateType, CertificateTemplateCopy> = {
  fundamentos: {
    title: "CERTIFICADO DE CONCLUSÃO",
    subtitle: "Escola de Fundamentos",
    body: "concluiu com êxito o curso de",
    course: "Escola de Fundamentos",
  },
  batismo: {
    title: "CERTIFICADO DE BATISMO",
    subtitle: "Batismo nas Águas",
    body: "foi batizado(a) nas águas em obediência ao mandamento de Cristo, professando publicamente sua fé e compromisso com o Evangelho.",
    course: "Batismo nas Águas",
  },
  lideres: {
    title: "CERTIFICADO DE FORMAÇÃO",
    subtitle: "Escola de Líderes",
    body: "concluiu com distinção o programa de formação de líderes",
    course: "Escola de Líderes",
  },
};

export function getCertificateTemplateCopy(type: CertificateType): CertificateTemplateCopy {
  return CERTIFICATE_TEMPLATE_COPY[type];
}

export const CERTIFICATE_TEMPLATE_VERSION = "modern-v1";

export const CERTIFICATE_BRAND = {
  navy: "#1e3a5f",
  gold: "#b8892e",
  cream: "#f8f4eb",
  lightNavy: "#365b8a",
  darkGold: "#8c6e2f",
};
