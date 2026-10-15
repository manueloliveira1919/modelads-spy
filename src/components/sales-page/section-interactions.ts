/** No user content is interpolated into script code; all state is scoped to one page root. */
export function installPageInteractions(root: HTMLElement) {
  function click(event: Event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.closest<HTMLElement>("[data-sp-action], [data-sp-popular]");
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
    if (carousel) advance(carousel, action.dataset.spAction === "dot" ? Number(action.dataset.slide || 0) : Number(carousel.dataset.index || 0) + (action.dataset.spAction === "prev" ? -1 : 1));
    if (action.dataset.spPopular) {
      const targetPlan = root.querySelector<HTMLElement>(action.getAttribute("href") || "#missing");
      targetPlan?.classList.add("sp-plan-highlight");
      window.setTimeout(() => targetPlan?.classList.remove("sp-plan-highlight"), 2200);
    }
  }
  const cleanup: (() => void)[] = [];
  function advance(carousel: HTMLElement, next: number) {
    const slides = Array.from(carousel.querySelectorAll<HTMLElement>("[data-sp-slide]"));
    if (!slides.length) return;
    const per = Number(getComputedStyle(carousel).getPropertyValue("--sp-per-view")) || 1;
    const max = Math.max(0, slides.length - per);
    const index = next < 0 ? max : next > max ? 0 : next;
    carousel.dataset.index = String(index);
    const track = carousel.querySelector<HTMLElement>(".sp-carousel-track");
    if (track) track.style.transform = `translateX(-${index * 100 / per}%)`;
    carousel.querySelectorAll("[data-sp-action='dot']").forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === index)));
    const counter = carousel.querySelector<HTMLElement>("[data-sp-slide-counter]");
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  }
  root.querySelectorAll<HTMLElement>("[data-sp-carousel]").forEach(carousel => {
    let paused = false; let startX = 0; let activePointer = false;
    const enter = () => { paused = true; }; const leave = () => { paused = false; };
    const down = (e: PointerEvent) => { if ((e.target as Element)?.closest("button,a")) return; paused = true; activePointer = true; startX = e.clientX; carousel.setPointerCapture(e.pointerId); };
    const up = (e: PointerEvent) => { if (activePointer && Math.abs(e.clientX - startX) > 40) advance(carousel, Number(carousel.dataset.index || 0) + (e.clientX < startX ? 1 : -1)); activePointer = false; paused = true; };
    const cancel = () => { activePointer = false; };
    carousel.addEventListener("mouseenter", enter); carousel.addEventListener("mouseleave", leave); carousel.addEventListener("pointerdown", down); carousel.addEventListener("pointerup", up); carousel.addEventListener("pointercancel", cancel);
    const timer = carousel.dataset.auto === "true" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? window.setInterval(() => { if (!paused && !document.hidden) advance(carousel, Number(carousel.dataset.index || 0) + 1); }, Math.max(1, Number(carousel.dataset.interval) || 5) * 1000) : 0;
    const resize = () => advance(carousel, Number(carousel.dataset.index || 0)); window.addEventListener("resize", resize);
    cleanup.push(() => { if (timer) clearInterval(timer); window.removeEventListener("resize", resize); carousel.removeEventListener("mouseenter", enter); carousel.removeEventListener("mouseleave", leave); carousel.removeEventListener("pointerdown", down); carousel.removeEventListener("pointerup", up); carousel.removeEventListener("pointercancel", cancel); });
    advance(carousel, 0);
  });
  root.querySelectorAll<HTMLElement>("[data-sp-accordion]").forEach(accordion => {
    const toggle = (event: Event) => { const current = event.target; if (!(current instanceof HTMLDetailsElement) || !current.open || accordion.dataset.multiple === "true") return; accordion.querySelectorAll("details").forEach(details => { if (details !== current) details.open = false; }); };
    accordion.addEventListener("toggle", toggle, true); cleanup.push(() => accordion.removeEventListener("toggle", toggle, true));
  });
  root.querySelectorAll<HTMLElement>("[data-sp-announcement][data-mode='countdown']").forEach(bar => {
    const timer = bar.querySelector<HTMLElement>("[data-sp-timer]"); if (!timer) return;
    const end = timer.dataset.duration ? Date.now() + Math.max(0, Number(timer.dataset.duration)) * 1000 : new Date(timer.dataset.end || "").getTime();
    const tick = () => { const left = Math.max(0, end - Date.now()); const value = timer.querySelector("[data-sp-timer-value]"); if (value) value.textContent = `${Math.floor(left / 864e5)}d ${String(Math.floor(left / 36e5) % 24).padStart(2, '0')}h ${String(Math.floor(left / 6e4) % 60).padStart(2, '0')}m ${String(Math.floor(left / 1e3) % 60).padStart(2, '0')}s`;
      if (left === 0 || !Number.isFinite(left)) { if (bar.dataset.expiry === "hide") { const section = bar.closest<HTMLElement>("section"); if (section) section.hidden = true; } else { const main = bar.querySelector<HTMLElement>("[data-sp-announcement-main]"); const expired = bar.querySelector<HTMLElement>("[data-sp-expired]"); if (main) main.hidden = true; if (expired) expired.hidden = false; } }
    }; tick(); const interval = window.setInterval(tick, 1000); cleanup.push(() => clearInterval(interval));
  });
  root.addEventListener("click", click);
  root.querySelectorAll<HTMLElement>("[data-sp-today]").forEach(el => { el.textContent = new Date().toLocaleDateString("pt-BR"); });
  return () => { root.removeEventListener("click", click); cleanup.forEach(fn => fn()); };
}

// The serialized function has no external dependencies and works in sandboxed exported HTML.
export const PAGE_INTERACTIONS_SCRIPT = `document.querySelectorAll('.sp-root').forEach(function(root){(${installPageInteractions.toString()})(root)});`;