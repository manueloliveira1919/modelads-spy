import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => vi.unstubAllGlobals());
function browser(writeText?: (text: string) => Promise<void>, success = true) {
  const textarea = { value: "", style: { cssText: "" }, setAttribute: vi.fn(), focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn(), remove: vi.fn() };
  const execCommand = vi.fn(() => success);
  vi.stubGlobal("navigator", { clipboard: writeText ? { writeText } : undefined });
  vi.stubGlobal("document", { activeElement: null, createElement: () => textarea, querySelector: () => null, body: { append: vi.fn() }, execCommand });
  vi.stubGlobal("HTMLElement", class {});
  return { textarea, execCommand };
}
describe("Reliable clipboard", () => {
  it("uses the clipboard API when available", async () => {
    const write = vi.fn().mockResolvedValue(undefined); const { execCommand } = browser(write);
    expect(await copyText("Pedido do quiz")).toBe(true);
    expect(write).toHaveBeenCalledWith("Pedido do quiz"); expect(execCommand).not.toHaveBeenCalled();
  });
  it("copies through selected textarea without clipboard API", async () => {
    const { textarea, execCommand } = browser();
    expect(await copyText("JSON completo")).toBe(true);
    expect(textarea.value).toBe("JSON completo"); expect(textarea.setSelectionRange).toHaveBeenCalledWith(0, 13);
    expect(execCommand).toHaveBeenCalledWith("copy"); expect(textarea.remove).toHaveBeenCalled();
  });
  it("falls back after an API failure", async () => {
    const { execCommand } = browser(vi.fn().mockRejectedValue(new Error("Denied")));
    expect(await copyText("Instruções")).toBe(true); expect(execCommand).toHaveBeenCalledWith("copy");
  });
  it("reports both copy methods failing for manual copy", async () => {
    const { textarea } = browser(vi.fn().mockRejectedValue(new Error("Denied")), false);
    expect(await copyText("Texto manual")).toBe(false); expect(textarea.remove).toHaveBeenCalled();
  });
});