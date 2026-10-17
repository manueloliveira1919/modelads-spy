/** Browser-only copy with a fallback for embedded and mobile browsers. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof document === "undefined") return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Fall through to the legacy selection-based copy. */ }
  const active = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px;pointer-events:none";
  // Keep it inside an active modal so its focus trap permits selection.
  (document.querySelector('[role="dialog"][data-state="open"]') ?? document.body).append(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch { return false; }
  finally {
    textarea.remove();
    if (active instanceof HTMLElement) active.focus({ preventScroll: true });
  }
}