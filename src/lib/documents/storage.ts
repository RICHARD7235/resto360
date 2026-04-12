import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo

export async function uploadDocumentFile(
  restaurantId: string,
  documentId: string,
  versionNumber: number,
  file: File
): Promise<{ path: string; size: number; mime: string; name: string }> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Type de fichier non autorisé");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Fichier trop volumineux (max 20 Mo)");
  }

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
