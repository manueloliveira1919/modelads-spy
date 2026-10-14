/** No user content is interpolated into script code; all state is scoped to one page root. */
export function installPageInteractions(root: HTMLElement) {
  function click(event: Event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.closest<HTMLElement>("[data-sp-action]");
    if (!action || !root.contains(action)) return;
    const quiz = action.closest<HTMLElement>("[data-sp-quiz]");
    if (quiz) {
      const steps = Array.from(quiz.querySelectorAll<HTMLElement>("[data-sp-question]"));
      const result = quiz.querySelector<HTMLElement>("[data-sp-result]");
      let index = Number(quiz.dataset.index || 0);
      if (action.dataset.spAction === "restart") index = 0;
      else if (action.dataset.spAction === "back") index = Math.max(0, index - 1);
      else if (action.dataset.spAction === "option") {
        steps[index]?.querySelectorAll("[data-sp-action='option']").forEach(el => el.setAttribute("aria-pressed", el === action ? "true" : "false"));
        index = Math.min(steps.length, index + 1);
      } else return;
      quiz.dataset.index = String(index);
      steps.forEach((step, i) => { step.hidden = i !== index; });
      if (result) result.hidden = index < steps.length;
      const counter = quiz.querySelector<HTMLElement>("[data-sp-counter]");
      if (counter) counter.textContent = index < steps.length ? `Etapa ${index + 1} de ${steps.length}` : "Concluído";
      const progress = quiz.querySelector<HTMLElement>("[data-sp-progress]");
      if (progress) { progress.style.width = `${steps.length ? Math.round(index / steps.length * 100) : 100}%`; progress.parentElement?.setAttribute("aria-valuenow", String(steps.length ? Math.round(index / steps.length * 100) : 100)); }
      const back = quiz.querySelector<HTMLElement>("[data-sp-action='back']");
      if (back) back.hidden = index === 0;
      const heading = (index < steps.length ? steps[index] : result)?.querySelector<HTMLElement>("[data-sp-focus]");
      heading?.focus({ preventScroll: true });
      return;
    }
    const carousel = action.closest<HTMLElement>("[data-sp-carousel]");
    if (!carousel) return;
    const slides = Array.from(carousel.querySelectorAll<HTMLElement>("[data-sp-slide]"));
    if (!slides.length) return;
    const old = Number(carousel.dataset.index || 0);
    const index = action.dataset.spAction === "dot" ? Number(action.dataset.slide || 0) : (old + (action.dataset.spAction === "prev" ? -1 : 1) + slides.length) % slides.length;
    carousel.dataset.index = String(index);
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    carousel.querySelectorAll("[data-sp-action='dot']").forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === index)));
    const counter = carousel.querySelector<HTMLElement>("[data-sp-slide-counter]");
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  }
  root.addEventListener("click", click);
  root.querySelectorAll<HTMLElement>("[data-sp-today]").forEach(el => { el.textContent = new Date().toLocaleDateString("pt-BR"); });
  return () => root.removeEventListener("click", click);
}

// The serialized function has no external dependencies and works in sandboxed exported HTML.
export const PAGE_INTERACTIONS_SCRIPT = `document.querySelectorAll('.sp-root').forEach(function(root){(${installPageInteractions.toString()})(root)});`;