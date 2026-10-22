import { useEffect, useRef } from "react";

/**
 * Observa os elementos marcados com a classe "reveal-on-scroll" dentro do nó retornado
 * e adiciona "is-visible" com um leve atraso em cascata, uma única vez por elemento.
 * Não anima nada quando o visitante pediu menos movimento (ver .reveal-on-scroll no CSS).
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    if (items.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      items.forEach(item => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const index = items.indexOf(target);
          const delay = Math.min(index, 8) * 60;
          window.setTimeout(() => target.classList.add("is-visible"), delay);
          observer.unobserve(target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return ref;
}
