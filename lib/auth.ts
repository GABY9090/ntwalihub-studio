import { supabaseServer, supabaseAdmin } from "./supabase";

// Renvoie l'utilisateur connecté (ou null)
export async function currentUser() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Renvoie le projet seulement s'il appartient à l'utilisateur
export async function ownProject(projectId: string, userId: string) {
  const { data } = await supabaseAdmin().from("projects").select("*")
    .eq("id", projectId).eq("user_id", userId).maybeSingle();
  return data;
}
