import { createClient } from "@/lib/supabase/server";

export async function uploadDocumentFile(
  restaurantId: string,
  documentId: string,
  versionNumber: number,
  file: File
): Promise<{ path: string; size: number; mime: string; name: string }> {
  const supabase = await createClient();
  const path = `${restaurantId}/${documentId}/${versionNumber}-${file.name}`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, size: file.size, mime: file.type, name: file.name };
}

export async function getSignedUrl(
  path: string,
  expiresIn = 300
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocumentFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from("documents").remove(paths);
}
