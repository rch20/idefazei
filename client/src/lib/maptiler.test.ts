import { describe, expect, it } from "vitest";
import { buildMapLocationQuery, isSuspiciousCoordinatePair } from "./maptiler";

describe("MapTiler location fallback", () => {
  it("não duplica número ou complemento quando o endereço já os contém", () => {
    expect(buildMapLocationQuery({
      address: "Rua José da Costa Lima, Nº 359, portão de grade",
      addressNumber: "359",
      addressComplement: "portão de grade",
      neighborhood: "Jardim Copacabana",
      city: "São Paulo",
      state: "SP",
      zipCode: "04939-140",
    })).toBe("Rua José da Costa Lima, 359, portão de grade, Jardim Copacabana, São Paulo, SP, 04939-140, Brasil");
  });

  it("identifica pares próximos de 0,0 como suspeitos sem invalidar coordenadas normais", () => {
    expect(isSuspiciousCoordinatePair(0.0608955, 0.0106411)).toBe(true);
    expect(isSuspiciousCoordinatePair(-23.691, -46.769)).toBe(false);
  });
});
