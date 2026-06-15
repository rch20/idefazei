/**
 * Geração de relatórios PDF usando HTML → base64
 * Os relatórios são gerados no servidor e retornados como base64 para download no frontend.
 */

export type ReportData = {
  churchName: string;
  generatedAt: string;
  title: string;
  subtitle?: string;
  sections: ReportSection[];
};

export type ReportSection = {
  title: string;
  type: "kpi" | "table" | "list";
  kpis?: { label: string; value: string | number; color?: string }[];
  headers?: string[];
  rows?: (string | number)[][];
  items?: string[];
};

export function generateReportHTML(data: ReportData): string {
  const sections = data.sections.map((section) => {
    if (section.type === "kpi" && section.kpis) {
      const kpiCards = section.kpis.map((k) => `
        <div style="background:#f5f0e8;border:1px solid #e8dcc8;border-radius:8px;padding:16px;text-align:center;flex:1;min-width:120px">
          <div style="font-size:28px;font-weight:700;color:${k.color || "#1e3a5f"}">${k.value}</div>
          <div style="font-size:11px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
        </div>
      `).join("");
      return `
        <div style="margin-bottom:24px">
          <h3 style="font-family:Georgia,serif;color:#1e3a5f;font-size:14px;margin-bottom:12px;border-bottom:1px solid #e8dcc8;padding-bottom:6px">${section.title}</h3>
          <div style="display:flex;gap:12px;flex-wrap:wrap">${kpiCards}</div>
        </div>
      `;
    }
    if (section.type === "table" && section.headers && section.rows) {
      const headerRow = section.headers.map((h) => `<th style="background:#1e3a5f;color:#fff;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${h}</th>`).join("");
      const bodyRows = section.rows.map((row, i) => {
        const cells = row.map((cell) => `<td style="padding:8px 12px;font-size:12px;color:#333;border-bottom:1px solid #f0ebe0">${cell}</td>`).join("");
        return `<tr style="background:${i % 2 === 0 ? "#fff" : "#faf8f4"}">${cells}</tr>`;
      }).join("");
      return `
        <div style="margin-bottom:24px">
          <h3 style="font-family:Georgia,serif;color:#1e3a5f;font-size:14px;margin-bottom:12px;border-bottom:1px solid #e8dcc8;padding-bottom:6px">${section.title}</h3>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e8dcc8;border-radius:8px;overflow:hidden">
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      `;
    }
    if (section.type === "list" && section.items) {
      const items = section.items.map((item) => `<li style="padding:6px 0;font-size:12px;color:#333;border-bottom:1px solid #f0ebe0">${item}</li>`).join("");
      return `
        <div style="margin-bottom:24px">
          <h3 style="font-family:Georgia,serif;color:#1e3a5f;font-size:14px;margin-bottom:12px;border-bottom:1px solid #e8dcc8;padding-bottom:6px">${section.title}</h3>
          <ul style="list-style:none;padding:0;margin:0;background:#fff;border:1px solid #e8dcc8;border-radius:8px;padding:8px 16px">${items}</ul>
        </div>
      `;
    }
    return "";
  }).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #333; padding: 32px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #c9a84c">
    <div>
      <div style="font-family:Georgia,serif;font-size:10px;color:#c9a84c;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">LAMPAS — PLATAFORMA MINISTERIAL</div>
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#1e3a5f;font-weight:700;margin-bottom:4px">${data.title}</h1>
      ${data.subtitle ? `<p style="font-size:13px;color:#666">${data.subtitle}</p>` : ""}
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#999">Igreja</div>
      <div style="font-size:14px;font-weight:600;color:#1e3a5f">${data.churchName}</div>
      <div style="font-size:11px;color:#999;margin-top:4px">Gerado em</div>
      <div style="font-size:12px;color:#666">${data.generatedAt}</div>
    </div>
  </div>

  <!-- Sections -->
  ${sections}

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e8dcc8;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:10px;color:#999">Lampas — Plataforma de Crescimento e Discipulado</div>
    <div style="font-size:10px;color:#c9a84c;font-style:italic">Ganhar · Consolidar · Discipular · Multiplicar</div>
  </div>
</body>
</html>`;
}

export function htmlToBase64(html: string): string {
  return Buffer.from(html, "utf-8").toString("base64");
}
