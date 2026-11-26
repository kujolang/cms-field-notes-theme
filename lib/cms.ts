import { cache } from "react";

const MAX_CMS_JSON = 32 * 1024 * 1024;

type CmsEnvelope<T> = {
  ok: boolean;
  data: T;
};

export type CmsEntry = {
  id: number;
  content_type_key: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string;
  body: string;
  meta_json: string;
  author_id: string;
  published_at: string | number | null;
  updated_at: string | number;
  terms?: Array<{ id: number; name: string; slug: string }>;
};

export type CmsList<T> = {
  items: T[];
  count: number;
  total: number;
};

export type CmsHealth = {
  status: string;
  db: string;
  counts: Record<string, number>;
};

export type CmsContentType = {
  id: number;
  type_key: string;
  label: string;
  singular_label: string;
  description: string;
  is_system: number;
};

export type CmsTaxonomy = {
  id: number;
  taxonomy_key: string;
  label: string;
  description: string;
};

class CmsHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`CMS request failed with ${status}`);
    this.status = status;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const length = response.headers.get("content-length");
  if (length !== null && Number(length) > MAX_CMS_JSON) {
    void response.body?.cancel().catch(() => {});
    throw new Error("CMS response exceeds the 32 MiB size limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("CMS returned an empty response.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts: string[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_CMS_JSON) throw new Error("CMS response exceeds the 32 MiB size limit.");
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(parts.join("")) as T;
}

async function cmsGet<T>(path: string): Promise<T> {
  const base = new URL(process.env.CMS_BASE_URL ?? "http://127.0.0.1:4200");
  const url = new URL(path, base);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || url.origin !== base.origin) {
    throw new Error("CMS_BASE_URL must be an HTTP(S) endpoint without URL credentials.");
  }
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new CmsHttpError(response.status);
  }
  const payload = await readJson<CmsEnvelope<T>>(response);
  if (!payload?.ok || payload.data === undefined) throw new Error("CMS returned an unsuccessful response");
  return payload.data;
}

export const getArticles = cache(function getArticles() {
  return cmsGet<CmsList<CmsEntry>>(
    "/v1/entries?content_type=article&include=terms&sort_by=published_at&sort_dir=desc",
  );
});

export const getPages = cache(function getPages() {
  return cmsGet<CmsList<CmsEntry>>("/v1/entries?content_type=page&sort_by=title&sort_dir=asc");
});

async function getEntry(type: "article" | "page", slug: string) {
  try {
    return await cmsGet<CmsEntry>(`/v1/entries/by-slug/${type}/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof CmsHttpError && error.status === 404) return null;
    throw error;
  }
}

export const getArticle = cache((slug: string) => getEntry("article", slug));
export const getPage = cache((slug: string) => getEntry("page", slug));

export function getEntryMeta(entry: CmsEntry): Record<string, unknown> {
  try {
    const value = JSON.parse(entry.meta_json || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function getEntrySeo(entry: CmsEntry) {
  const meta = getEntryMeta(entry);
  const seo = meta.seo && typeof meta.seo === "object" ? meta.seo as Record<string, unknown> : {};
  return {
    title: typeof seo.title === "string" && seo.title ? seo.title : entry.title,
    description: typeof seo.description === "string" && seo.description ? seo.description : entry.excerpt,
    socialTitle: typeof seo.social_title === "string" && seo.social_title ? seo.social_title : typeof seo.title === "string" && seo.title ? seo.title : entry.title,
    socialDescription: typeof seo.social_description === "string" && seo.social_description ? seo.social_description : typeof seo.description === "string" && seo.description ? seo.description : entry.excerpt,
    canonicalUrl: typeof seo.canonical_url === "string" ? seo.canonical_url : "",
    image: typeof seo.og_image_url === "string" && seo.og_image_url
      ? seo.og_image_url
      : typeof meta.cover_image === "string" ? meta.cover_image : "",
    schemaType: typeof seo.schema_type === "string" ? seo.schema_type : "",
  };
}

export function getCmsHealth() {
  return cmsGet<CmsHealth>("/health");
}

export function getContentTypes() {
  return cmsGet<CmsList<CmsContentType>>(
    "/v1/content-types?sort_by=type_key&sort_dir=asc",
  );
}

export function getTaxonomies() {
  return cmsGet<CmsList<CmsTaxonomy>>(
    "/v1/taxonomies?sort_by=taxonomy_key&sort_dir=asc",
  );
}

export function formatCmsDate(value: string | number | null) {
  if (value === null || value === "") return "Unscheduled";
  const numeric = Number(value);
  const timestamp = Number.isFinite(numeric) && numeric < 1_000_000_000_000
    ? numeric * 1000
    : numeric;
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
