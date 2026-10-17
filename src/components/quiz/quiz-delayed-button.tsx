import { useEffect, useState, type ReactNode } from "react";
import { quizButtonDelay } from "@/lib/quiz-button";
import { cn } from "@/lib/utils";
/** Preserve layout; inert and visibility prevent all keyboard/pointer access before reveal. */
export function QuizDelayedButton({ delaySeconds, ready = true, editable = false, children }: { delaySeconds: unknown; ready?: boolean; editable?: boolean; children: ReactNode }) {
  const delay = quizButtonDelay(delaySeconds);
  const [elapsed, setElapsed] = useState(delay === 0);
  useEffect(() => {
    setElapsed(delay === 0);
    if (!ready || editable || delay === 0) return;
    const timer = setTimeout(() => setElapsed(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay, ready, editable]);
  const visible = editable || ready && elapsed;
  return <div className={cn("q-delayed-button w-full", !visible && "q-button-hidden", visible && !editable && delay > 0 && "q-button-reveal")} aria-hidden={!visible || undefined} inert={!visible || undefined} data-button-delay={delay} data-button-ready={visible}>
    {children}
    {editable && delay > 0 && <span className="q-delay-label">⏱ {delay}s</span>}
  </div>;
}