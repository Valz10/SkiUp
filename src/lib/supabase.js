import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function uploadStorageObject(bucket, objectPath, file, onProgress) {
  if (!supabase || !supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured.");
  }
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error("Sign in again before uploading this clip.");

  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const endpoint = new URL(`/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`, supabaseUrl);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", endpoint);
    request.setRequestHeader("apikey", supabaseKey);
    request.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("Cache-Control", "max-age=3600");
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = `Video upload failed (${request.status}).`;
      try {
        const response = JSON.parse(request.responseText);
        message = response.message || response.error || message;
      } catch {
        if (request.responseText) message = request.responseText;
      }
      reject(new Error(message));
    });
    request.addEventListener("error", () => reject(new Error("Network error while uploading the video. Check your connection and try again.")));
    request.addEventListener("abort", () => reject(new Error("Video upload was cancelled.")));
    request.send(file);
  });
}
