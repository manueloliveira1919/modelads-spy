// Verificação (com atraso) da disponibilidade global do endereço público do quiz.
import { useEffect, useRef, useState } from "react";
import { isSlugAvailable, suggestSlug } from "@/lib/quiz-api";
import { slugify } from "@/lib/quiz-types";

export type SlugStatus = "empty" | "checking" | "available" | "taken" | "error";

export function useSlugAvailability(rawSlug: string, excludeId?: string | null) {
  const slug = slugify(rawSlug);
  const [status, setStatus] = useState<SlugStatus>("empty");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    setSuggestion(null);
    if (!slug) {
      setStatus("empty");
      return;
    }
    setStatus("checking");
    const t = setTimeout(async () => {
      try {
        const ok = await isSlugAvailable(slug, excludeId ?? null);
        if (seq.current !== id) return;
        setStatus(ok ? "available" : "taken");
        if (!ok) {
          const alt = await suggestSlug(slug, excludeId ?? null);
          if (seq.current === id) setSuggestion(alt);
        }
      } catch {
        if (seq.current === id) setStatus("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug, excludeId]);

  return { slug, status, suggestion };
}
