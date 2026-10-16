import React from "react";
import {
  CERTIFICATE_ARTBOARD,
  CERTIFICATE_BRAND,
  CERTIFICATE_LAYOUT,
  createCertificateRenderModel,
  type CertificateRenderInput,
} from "@shared/certificateTemplate";

type CertificateArtboardProps = CertificateRenderInput & {
  logoUrl?: string;
  className?: string;
};

function lines(text: string): string[] {
  return text.split("\n").filter(Boolean);
}

function SvgTextLines({
  text,
  x,
  y,
  lineHeight,
  anchor = "middle",
  size,
  family,
  weight,
  style,
  fill,
  letterSpacing,
}: {
  text: string;
  x: number;
  y: number;
  lineHeight: number;
  anchor?: "start" | "middle" | "end";
  size: number;
  family: string;
  weight?: number;
  style?: "normal" | "italic";
  fill: string;
  letterSpacing?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={family}
      fontSize={size}
      fontWeight={weight}
      fontStyle={style}
      fill={fill}
      letterSpacing={letterSpacing}
    >
      {lines(text).map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function CertificateArtboard({ logoUrl, className, ...input }: CertificateArtboardProps) {
  const model = createCertificateRenderModel(input);
  const { width, height } = CERTIFICATE_ARTBOARD;
  const footer = CERTIFICATE_LAYOUT.footer;
  const title = CERTIFICATE_LAYOUT.content.title;
  const subtitle = CERTIFICATE_LAYOUT.content.subtitle;
  const intro = CERTIFICATE_LAYOUT.content.intro;
  const member = CERTIFICATE_LAYOUT.content.member;
  const body = CERTIFICATE_LAYOUT.content.body;
  const course = CERTIFICATE_LAYOUT.content.course;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Prévia do certificado ${model.copy.subtitle}`}
    >
      <defs>
        <linearGradient id="certificate-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={CERTIFICATE_BRAND.paper} />
          <stop offset="1" stopColor={CERTIFICATE_BRAND.cream} />
        </linearGradient>
        <filter id="certificate-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1e3a5f" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect width={width} height={height} fill={CERTIFICATE_BRAND.cream} />
      <ellipse cx={-30} cy={-4} rx={194} ry={218} fill="none" stroke={CERTIFICATE_BRAND.gold} strokeWidth={12} opacity="0.56" />
      <ellipse cx={width + 34} cy={height + 18} rx={194} ry={218} fill="none" stroke={CERTIFICATE_BRAND.gold} strokeWidth={12} opacity="0.56" />
      <rect x={24} y={24} width={width - 48} height={height - 48} rx={2} fill="url(#certificate-paper)" stroke={CERTIFICATE_BRAND.gold} strokeWidth={2.6} filter="url(#certificate-shadow)" />
      <rect x={40} y={40} width={width - 80} height={height - 80} fill="none" stroke={CERTIFICATE_BRAND.darkGold} strokeWidth={0.9} />
      <line x1={78} y1={167} x2={width - 78} y2={167} stroke={CERTIFICATE_BRAND.gold} strokeWidth={0.8} opacity="0.55" />

      {logoUrl ? (
        <image href={logoUrl} x={CERTIFICATE_LAYOUT.brand.x} y={CERTIFICATE_LAYOUT.brand.y} width={CERTIFICATE_LAYOUT.brand.logoSize} height={CERTIFICATE_LAYOUT.brand.logoSize} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <circle cx={CERTIFICATE_LAYOUT.brand.x + 31} cy={CERTIFICATE_LAYOUT.brand.y + 31} r={30} fill={CERTIFICATE_BRAND.navy} opacity="0.08" />
      )}
      <SvgTextLines
        text={model.churchName}
        x={CERTIFICATE_LAYOUT.brand.x + 78}
        y={93}
        lineHeight={20}
        anchor="start"
        size={18}
        family="Georgia, serif"
        fill={CERTIFICATE_BRAND.navy}
      />
      <SvgTextLines
        text="AMAR · SERVIR · TRANSFORMAR"
        x={CERTIFICATE_LAYOUT.brand.x + 80}
        y={116}
        lineHeight={9}
        anchor="start"
        size={7}
        family="Arial, sans-serif"
        fill={CERTIFICATE_BRAND.darkGold}
        letterSpacing="2.8"
      />

      {model.verse.text ? (
        <SvgTextLines
          text={`“${model.verse.text}”`}
          x={CERTIFICATE_LAYOUT.verse.x + CERTIFICATE_LAYOUT.verse.width}
          y={78}
          lineHeight={13}
          anchor="end"
          size={10}
          family="Georgia, serif"
          style="italic"
          fill={CERTIFICATE_BRAND.darkGold}
        />
      ) : null}

      <SvgTextLines
        text={model.title.text}
        x={title.x + title.width / 2}
        y={title.y}
        lineHeight={18}
        size={model.title.fontSize}
        family="Arial, sans-serif"
        weight={700}
        fill={CERTIFICATE_BRAND.navy}
        letterSpacing="3.4"
      />
      <SvgTextLines
        text={model.subtitle.text}
        x={subtitle.x + subtitle.width / 2}
        y={subtitle.y + 34}
        lineHeight={46}
        size={model.subtitle.fontSize}
        family="Georgia, serif"
        weight={700}
        fill={CERTIFICATE_BRAND.gold}
      />

      <line x1={315} y1={319} x2={808} y2={319} stroke={CERTIFICATE_BRAND.gold} strokeWidth={1.1} />
      <SvgTextLines
        text="CERTIFICAMOS QUE"
        x={intro.x + intro.width / 2}
        y={intro.y}
        lineHeight={17}
        size={16}
        family="Georgia, serif"
        style="italic"
        fill={CERTIFICATE_BRAND.lightNavy}
        letterSpacing="2.3"
      />
      <SvgTextLines
        text={model.memberName.text}
        x={member.x + member.width / 2}
        y={member.y + 37}
        lineHeight={43}
        size={model.memberName.fontSize}
        family="Georgia, serif"
        weight={700}
        fill={CERTIFICATE_BRAND.navy}
      />
      <line x1={462} y1={470} x2={661} y2={470} stroke={CERTIFICATE_BRAND.gold} strokeWidth={1.35} />

      <SvgTextLines
        text={model.body.text}
        x={body.x + body.width / 2}
        y={body.y + 18}
        lineHeight={22}
        size={model.body.fontSize}
        family="Arial, sans-serif"
        fill={CERTIFICATE_BRAND.lightNavy}
      />
      <SvgTextLines
        text={`“${model.course.text}”`}
        x={course.x + course.width / 2}
        y={course.y + 19}
        lineHeight={20}
        size={model.course.fontSize}
        family="Georgia, serif"
        weight={700}
        fill={CERTIFICATE_BRAND.darkGold}
      />

      <line x1={78} y1={footer.dividerY} x2={width - 78} y2={footer.dividerY} stroke={CERTIFICATE_BRAND.gold} strokeWidth={0.9} opacity="0.7" />
      <SvgTextLines
        text={`${model.churchName} · ${model.dateLabel}`}
        x={width / 2}
        y={footer.dateY + 12}
        lineHeight={13}
        size={11}
        family="Arial, sans-serif"
        fill={CERTIFICATE_BRAND.lightNavy}
      />

      <line x1={footer.leftSignatureX - footer.signatureWidth / 2} y1={footer.signatureLineY} x2={footer.leftSignatureX + footer.signatureWidth / 2} y2={footer.signatureLineY} stroke={CERTIFICATE_BRAND.navy} strokeWidth={1} />
      <line x1={footer.rightSignatureX - footer.signatureWidth / 2} y1={footer.signatureLineY} x2={footer.rightSignatureX + footer.signatureWidth / 2} y2={footer.signatureLineY} stroke={CERTIFICATE_BRAND.navy} strokeWidth={1} />
      <SvgTextLines text={model.pastorName} x={footer.leftSignatureX} y={footer.signatureNameY + 12} lineHeight={13} size={11} family="Arial, sans-serif" weight={700} fill={CERTIFICATE_BRAND.navy} />
      <SvgTextLines text={model.signatureLabel} x={footer.leftSignatureX} y={footer.signatureLabelY + 11} lineHeight={12} size={9} family="Arial, sans-serif" fill={CERTIFICATE_BRAND.lightNavy} />
      <SvgTextLines text={model.churchName} x={footer.rightSignatureX} y={footer.signatureNameY + 12} lineHeight={13} size={11} family="Arial, sans-serif" weight={700} fill={CERTIFICATE_BRAND.navy} />
      <SvgTextLines text="Igreja" x={footer.rightSignatureX} y={footer.signatureLabelY + 11} lineHeight={12} size={9} family="Arial, sans-serif" fill={CERTIFICATE_BRAND.lightNavy} />
      <SvgTextLines text="Certificado emitido pela igreja" x={width / 2} y={footer.noteY + 7} lineHeight={10} size={7} family="Arial, sans-serif" fill={CERTIFICATE_BRAND.darkGold} />
    </svg>
  );
}
