import "server-only";
import { createAdminClient } from "./supabase/admin";

export const EIGHT_D_BUCKET = "rpg-paid-publications";
export const EIGHT_D_DIRECTORY = "8d-that-works/v1";
export const EIGHT_D_FILES = Object.freeze({
  guide: "RPG_8D_That_Works.pdf",
  posters: "RPG_8D_Practical_Posters.pdf",
});

export function eightDFilePath(filename) {
  return EIGHT_D_DIRECTORY + "/" + filename;
}

export async function eightDFilesAreReady() {
  try {
    const storage = createAdminClient().storage;
    const { data: bucket, error: bucketError } = await storage.getBucket(EIGHT_D_BUCKET);
    if (bucketError || bucket?.public !== false) return false;
    const { data, error } = await storage.from(EIGHT_D_BUCKET).list(EIGHT_D_DIRECTORY);
    return !error && Object.values(EIGHT_D_FILES).every((filename) =>
      data?.some((file) => file.name === filename && file.metadata?.size > 0),
    );
  } catch {
    return false;
  }
}
