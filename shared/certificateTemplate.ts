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
  paper: "#fcf9f3",
  muted: "#6d7785",
};

/**
 * Logical artboard used by both the browser preview and the PDF renderer.
 * The preview renders it as an SVG viewBox; the PDF maps it proportionally
 * to A4 landscape points. Coordinates use a top-left origin.
 */
export const CERTIFICATE_ARTBOARD = {
  width: 1123,
  height: 794,
  pdfWidth: 841.89,
  pdfHeight: 595.28,
} as const;

export const CERTIFICATE_LAYOUT = {
  frame: {
    outerInset: 24,
    innerInset: 40,
    contentInset: 74,
  },
  brand: {
    x: 82,
    y: 70,
    width: 390,
    logoSize: 62,
  },
  verse: {
    x: 866,
    y: 61,
    width: 178,
    height: 106,
    maxLines: 5,
  },
  content: {
    title: { x: 150, y: 190, width: 823, maxLines: 1 },
    subtitle: { x: 115, y: 238, width: 893, maxLines: 1 },
    intro: { x: 215, y: 365, width: 693, maxLines: 1 },
    member: { x: 145, y: 397, width: 833, maxLines: 1 },
    body: { x: 205, y: 493, width: 713, maxLines: 3 },
    course: { x: 205, y: 566, width: 713, maxLines: 1 },
  },
  footer: {
    dividerY: 626,
    dateY: 648,
    signatureLineY: 689,
    signatureNameY: 707,
    signatureLabelY: 724,
    leftSignatureX: 342,
    rightSignatureX: 781,
    signatureWidth: 224,
    noteY: 760,
  },
} as const;

export const CERTIFICATE_TEXT_LIMITS = {
  title: 90,
  subtitle: 90,
  body: 260,
  memberName: 90,
  verse: 280,
  churchName: 100,
  pastorName: 90,
  signatureLabel: 70,
} as const;

export type CertificateRenderInput = {
  type: CertificateType;
  memberName: string;
  churchName: string;
  pastorName?: string;
  signatureLabel?: string;
  verse?: string;
  courseName?: string;
  dateLabel: string;
  template?: CertificateTemplateOverride;
};

export type CertificateRenderLine = {
  text: string;
  lineCount: number;
  fontSize: number;
};

export type CertificateRenderModel = {
  copy: CertificateTemplateCopy;
  memberName: CertificateRenderLine;
  body: CertificateRenderLine;
  subtitle: CertificateRenderLine;
  verse: CertificateRenderLine;
  title: CertificateRenderLine;
  course: CertificateRenderLine;
  churchName: string;
  pastorName: string;
  signatureLabel: string;
  dateLabel: string;
};

function cleanText(value: string | undefined, fallback: string, limit: number): string {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

export function wrapCertificateText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  const remaining = lines.slice(maxLines - 1).join(" ");
  visible[maxLines - 1] = `${remaining.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  return visible;
}

function buildLine(text: string, maxChars: number, maxLines: number, preferredSize: number, minSize: number): CertificateRenderLine {
  const lines = wrapCertificateText(text, maxChars, maxLines);
  const longest = Math.max(1, ...lines.map((line) => line.length));
  const reduction = Math.max(0, Math.ceil((longest - maxChars * 0.72) / 8));
  return {
    text: lines.join("\n"),
    lineCount: lines.length,
    fontSize: Math.max(minSize, preferredSize - reduction),
  };
}

export function createCertificateRenderModel(input: CertificateRenderInput): CertificateRenderModel {
  const base = getCertificateTemplateCopy(input.type);
  const copy = { ...base, ...(input.template ?? {}) };
  const courseName = cleanText(input.courseName, copy.course || copy.subtitle, CERTIFICATE_TEXT_LIMITS.subtitle);
  return {
    copy: { ...copy, course: courseName },
    title: buildLine(cleanText(copy.title, base.title, CERTIFICATE_TEXT_LIMITS.title), 34, 1, 18, 12),
    subtitle: buildLine(cleanText(copy.subtitle, base.subtitle, CERTIFICATE_TEXT_LIMITS.subtitle), 42, 1, 42, 26),
    memberName: buildLine(cleanText(input.memberName, "Nome do Membro", CERTIFICATE_TEXT_LIMITS.memberName), 38, 1, 40, 22),
    body: buildLine(cleanText(copy.body, base.body, CERTIFICATE_TEXT_LIMITS.body), 54, 3, 17, 12),
    verse: buildLine(cleanText(input.verse, "", CERTIFICATE_TEXT_LIMITS.verse), 31, CERTIFICATE_LAYOUT.verse.maxLines, 10, 8),
    course: buildLine(courseName, 42, 1, 17, 12),
    churchName: cleanText(input.churchName, "Igreja", CERTIFICATE_TEXT_LIMITS.churchName),
    pastorName: cleanText(input.pastorName, "Nome do Pastor / Líder", CERTIFICATE_TEXT_LIMITS.pastorName),
    signatureLabel: cleanText(input.signatureLabel, "Pastor(a) Presidente", CERTIFICATE_TEXT_LIMITS.signatureLabel),
    dateLabel: input.dateLabel,
  };
}

export const CERTIFICATE_TEMPLATE_COPY_KEYS = Object.keys(CERTIFICATE_TEMPLATE_COPY) as CertificateType[];
