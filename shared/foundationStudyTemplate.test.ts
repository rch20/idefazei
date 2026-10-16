import { describe, expect, it } from "vitest";
import { FOUNDATION_STUDY_TEMPLATE_BLOCKS } from "./foundationStudyTemplate";

describe("modelo simples de estudo", () => {
  it("começa com Leia, Entenda, Responda e Aplique", () => {
    expect(FOUNDATION_STUDY_TEMPLATE_BLOCKS.map(block => block.title)).toEqual([
      "Leia",
      "Entenda",
      "Responda",
      "Aplique",
    ]);
  });
});
