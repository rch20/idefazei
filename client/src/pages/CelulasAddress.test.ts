import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const pageSource = compactSource(
  readFileSync(resolve(root, "client/src/pages/Celulas.tsx"), "utf8")
);
const routerSource = compactSource(
  readFileSync(resolve(root, "server/routers.ts"), "utf8")
);
const dbSource = compactSource(
  readFileSync(resolve(root, "server/db.ts"), "utf8")
);
const schemaSource = compactSource(
  readFileSync(resolve(root, "drizzle/schema.ts"), "utf8")
);
const migrationSource = compactSource(
  readFileSync(resolve(root, "drizzle/0056_cell_address_cep.sql"), "utf8")
);

describe("Cadastro de Células com endereço por CEP", () => {
  it("usa o Formulário Adaptativo em Nova Célula e no detalhe da Célula", () => {
    expect(
      pageSource.match(/AdaptiveFormDialogContent/g)?.length
    ).toBeGreaterThanOrEqual(2);
    expect(pageSource).toContain(compactSource("AdaptiveFormDialogBody"));
    expect(pageSource).toContain(compactSource("AdaptiveFormDialogFooter"));
    expect(pageSource).toContain(compactSource("Nova Célula"));
    expect(pageSource).toContain(compactSource("Criar Célula"));
    expect(pageSource).toContain(compactSource("min-w-0 truncate"));
    expect(pageSource).toContain(
      compactSource("onClick={() => setSelectedCell(null)}>Fechar</Button>")
    );
  });

  it("mantém o detalhe da Célula organizado em cabeçalho, corpo rolável e ações fixas", () => {
    expect(pageSource).toContain(
      compactSource("adaptiveFormDialogHeaderClassName")
    );
    expect(pageSource).toContain(
      compactSource(
        '<AdaptiveFormDialogBody className="space-y-5 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">'
      )
    );
    expect(pageSource).toContain(compactSource("<AdaptiveFormDialogFooter>"));
    expect(pageSource).toContain(
      compactSource("onClick={openAttendanceDialog}")
    );
    expect(pageSource).toContain(compactSource("Registrar encontro"));
  });

  it("oferece busca por CEP e mantém preenchimento manual como fallback", () => {
    expect(pageSource).toContain(compactSource("https://viacep.com.br/ws/"));
    expect(pageSource).toContain(compactSource('id="cell-zip-code"'));
    expect(pageSource).toContain(compactSource("Consultando endereço..."));
    expect(pageSource).toContain(compactSource("Endereço encontrado"));
    expect(pageSource).toContain(
      compactSource("preencha o endereço manualmente")
    );
    expect(pageSource).toContain(compactSource('id="cell-address-number"'));
    expect(pageSource).toContain(compactSource('id="cell-address-complement"'));
    expect(pageSource).toContain(compactSource('id="cell-state"'));
  });

  it("persiste o endereço estruturado no mesmo modelo de Célula", () => {
    expect(schemaSource).toContain(
      compactSource('addressNumber: varchar("addressNumber", { length: 20 })')
    );
    expect(schemaSource).toContain(
      compactSource(
        'addressComplement: varchar("addressComplement", { length: 120 })'
      )
    );
    expect(schemaSource).toContain(
      compactSource('zipCode: varchar("zipCode", { length: 9 })')
    );
    expect(schemaSource).toContain(
      compactSource('state: varchar("state", { length: 2 })')
    );
    expect(routerSource).toContain(
      compactSource("addressNumber: z.string().trim().max(20).optional()")
    );
    expect(routerSource).toContain(
      compactSource("zipCode: z.string().trim().regex")
    );
    expect(routerSource).toContain(
      compactSource("Informe um CEP válido com 8 números.")
    );
    expect(routerSource).toContain(
      compactSource('zipCode: input.zipCode?.replace(/\\D/g, "") || null')
    );
    expect(routerSource).toContain(
      compactSource("Toda liderança deve pertencer a esta igreja.")
    );
  });

  it("não desenha Células sem coordenadas válidas no ponto 0,0", () => {
    const dialogSource = compactSource(
      readFileSync(
        resolve(root, "client/src/components/CellPublicSettingsDialog.tsx"),
        "utf8"
      )
    );
    expect(pageSource).toContain(
      compactSource('latitudeValue === "" || longitudeValue === ""')
    );
    expect(pageSource).toContain(
      compactSource("latitudeValue === null || latitudeValue === undefined")
    );
    expect(pageSource).toContain(
      compactSource("latitude >= -90 && latitude <= 90")
    );
    expect(pageSource).toContain(
      compactSource("if (!hasPublicCellLocation(cell)) return [];")
    );
    expect(pageSource).toContain(
      compactSource("isSuspiciousCoordinatePair(latitude, longitude)")
    );
    expect(dialogSource).toContain(
      compactSource("rawLatitude < -90 || rawLatitude > 90")
    );
    expect(dialogSource).toContain(
      compactSource("rawLongitude < -180 || rawLongitude > 180")
    );
    expect(dialogSource).toContain(
      compactSource(
        "isSuspiciousCoordinatePair(latitudeNumber, longitudeNumber)"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "isSuspiciousCoordinatePair(input.latitude, input.longitude)"
      )
    );
  });

  it("explica o status público e leva o administrador para Visite-nos", () => {
    const dialogSource = compactSource(
      readFileSync(
        resolve(root, "client/src/components/CellPublicSettingsDialog.tsx"),
        "utf8"
      )
    );
    expect(pageSource).toContain(compactSource("Pública · sem localização"));
    expect(pageSource).toContain(
      compactSource("Marcada como pública, mas falta um ponto no mapa")
    );
    expect(pageSource).toContain(compactSource('href="/visite-nos"'));
    expect(dialogSource).toContain(
      compactSource("trpc.tenantPublic.adminPreview.useQuery")
    );
    expect(dialogSource).toContain(
      compactSource("A Célula só aparecerá em “Visite-nos”")
    );
    expect(dialogSource).toContain(
      compactSource(
        "O CEP preenche o endereço, mas não substitui a localização geográfica."
      )
    );
  });

  it("não descarta no backend uma Célula pública antiga que precisa de revisão do mapa", () => {
    expect(dbSource).not.toContain(
      compactSource("cell.latitude !== 0 || cell.longitude !== 0")
    );
  });

  it("usa migration nullable para preservar Células existentes", () => {
    expect(migrationSource).toContain(
      compactSource("ALTER TABLE `cells` ADD `addressNumber` varchar(20);")
    );
    expect(migrationSource).toContain(
      compactSource("ALTER TABLE `cells` ADD `addressComplement` varchar(120);")
    );
    expect(migrationSource).toContain(
      compactSource("ALTER TABLE `cells` ADD `zipCode` varchar(9);")
    );
    expect(migrationSource).toContain(
      compactSource("ALTER TABLE `cells` ADD `state` varchar(2);")
    );
    expect(migrationSource).not.toContain(compactSource("NOT NULL"));
  });
});
