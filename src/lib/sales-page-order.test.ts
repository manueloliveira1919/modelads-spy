import { describe, expect, it } from "vitest";
import { moveElementOrder, resolveElementOrder } from "./sales-page-elements";

describe("Sales page element movement", () => {
  it("keeps every distinct available element movable and appends new ones", () => {
    expect(resolveElementOrder(["title", "subtitle", "image", "button:a"], ["image", "image", "retired", "title"])).toEqual(["image", "title", "subtitle", "button:a"]);
  });
  it("moves a title down one visible line and back up", () => {
    const keys = ["eyebrow", "title", "subtitle", "image", "button:a"];
    const moved = moveElementOrder(keys, "title", "subtitle", true);
    expect(moved).toEqual(["eyebrow", "subtitle", "title", "image", "button:a"]);
    expect(moveElementOrder(moved, "title", "subtitle")).toEqual(keys);
    expect(keys).toEqual(["eyebrow", "title", "subtitle", "image", "button:a"]);
  });
  it("supports dragging before and after an element", () => {
    expect(moveElementOrder(["title", "image", "button:a"], "button:a", "title")).toEqual(["button:a", "title", "image"]);
    expect(moveElementOrder(["title", "image", "button:a"], "title", "button:a", true)).toEqual(["image", "button:a", "title"]);
  });
  it("skips hidden elements rather than consuming a visible movement", () => {
    const keys = resolveElementOrder(["title", "image", "button:a"], ["title", "hidden-subtitle", "image", "button:a"]);
    expect(moveElementOrder(keys, "title", "image", true)).toEqual(["image", "title", "button:a"]);
  });
  it("does not admit elements from another group or a stale drag", () => {
    const keys = ["items.0.title", "items.0.image"];
    expect(moveElementOrder(keys, "items.1.title", "items.0.title")).toBe(keys);
    expect(moveElementOrder(keys, "items.0.title", "retired")).toBe(keys);
    expect(moveElementOrder(keys, "items.0.title", "items.0.title")).toBe(keys);
  });
});