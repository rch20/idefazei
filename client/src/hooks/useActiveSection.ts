import { useEffect, useState } from "react";

/**
 * Observa as seções cujo id está em `ids` e devolve o id da que está mais visível no momento,
 * para destacar o item correspondente na navegação fixa do cabeçalho.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const id of ids) {
          const ratio = visible.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestRatio > 0) setActive(bestId);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
