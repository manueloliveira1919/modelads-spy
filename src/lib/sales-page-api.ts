import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_PAGE_SETTINGS,
  PAGE_TEMPLATES,
  mergePageSettings,
  slugify,
  type PageSection,
  type PageSettings,
  type SalesPage,
} from "./sales-page-types";

const db = () => (supabase as any).from("sales_pages");

function normalize(row: any): SalesPage {
  return { ...row, settings: mergePageSettings(row.settings), sections: Array.isArray(row.sections) ? row.sections : [] };
}

export async function listPages(): Promise<SalesPage[]> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await db().select("*").eq("user_id", u.user?.id).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getPage(id: string): Promise<SalesPage> {
  const { data, error } = await db().select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("not_found");
  return normalize(data);
}

export async function getPublishedPage(slug: string): Promise<SalesPage | null> {
  const { data, error } = await db().select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

async function freeSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "pagina";
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? root : `${root}-${i + 1}`;
    let q = db().select("id").eq("slug", s);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.limit(1);
    // RLS só mostra páginas próprias ou publicadas; a constraint UNIQUE garante o resto.
    if (!data?.length) return s;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function createPage(userId: string, name: string, templateKey: string | null) {
  const tpl = PAGE_TEMPLATES.find((t) => t.key === templateKey);
  const settings: PageSettings = { ...DEFAULT_PAGE_SETTINGS, ...(tpl?.settings ?? {}), seo: { ...DEFAULT_PAGE_SETTINGS.seo, title: name } };
  const sections = tpl ? tpl.build() : [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await freeSlug(attempt ? `${name}-${Date.now().toString(36)}` : name);
    const { data, error } = await db().insert({ user_id: userId, name, slug, settings, sections }).select("id").single();
    if (!error) return data.id as string;
    if (error.code !== "23505") throw error;
  }
  throw new Error("slug");
}

export async function updatePage(id: string, patch: Partial<Pick<SalesPage, "name" | "slug" | "status" | "settings" | "sections">>) {
  const { error } = await db().update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("slug_taken");
    throw error;
  }
}

export async function duplicatePage(id: string, userId: string) {
  const p = await getPage(id);
  const name = `${p.name} (cópia)`;
  const slug = await freeSlug(name);
  const { error } = await db().insert({ user_id: userId, name, slug, settings: p.settings, sections: p.sections as PageSection[], status: "draft" });
  if (error) throw error;
}

export async function deletePage(id: string) {
  const { error } = await db().delete().eq("id", id);
  if (error) throw error;
}

export async function uploadPageImage(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const bucket = supabase.storage.from("sales-page-assets");
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  // Bucket privado: link assinado de longa duração (10 anos) para uso na página pública.
  const { data, error: e2 } = await bucket.createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2 || !data) throw e2 ?? new Error("url");
  return data.signedUrl;
}
