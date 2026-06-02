import { supabase } from "@/integrations/supabase/client";

const BUCKET = "manutencao-midias";

export async function uploadFiles(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    urls.push(path);
  }
  return urls;
}

export async function uploadFile(file: File, folder: string): Promise<string> {
  const [url] = await uploadFiles([file], folder);
  return url;
}

/** Get a signed URL for a private file (valid 1h). */
export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  // path may already be a full URL from old data; handle that
  if (path.startsWith("http")) return path;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) {
    console.error("signed url error", error);
    return null;
  }
  return data.signedUrl;
}

export async function getSignedUrls(paths: string[]): Promise<string[]> {
  if (!paths?.length) return [];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => Boolean(u));
}
