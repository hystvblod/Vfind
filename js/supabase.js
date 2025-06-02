// js/supabase.js

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://swmdepiukfginzhbeccz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bWRlcGl1a2ZnaW56aGJlY2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjEyNTksImV4cCI6MjA2Mzk5NzI1OX0.--VONIyPdx1tTi45nd4e-F-ZuKNgbDSY1pP0rXHyJgI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------- LOGIQUE ID UNIQUE -----------
export function getUserId() {
  let id = localStorage.getItem("id");
  if (!id) {
    id = "user_" + Math.random().toString(36).substring(2, 10); // Simple ID lisible, modifiable
    localStorage.setItem("id", id);
    createProfile(id);
  }
  return id;
}

// ----------- CRÉATION DU PROFIL -----------
export async function createProfile(id) {
  // Ne crée QUE si absent dans Supabase !
  const { data } = await supabase.from("users").select("id").eq("id", id);
  if (data && data.length) return;
  const profile = {
    id,
    points: 100,
    jetons: 3,
    cadres: [],
    historique: [],
    amis: [],
    // Ajoute ici tous les champs utiles !
  };
  await supabase.from("users").insert([profile]);
}

// ----------- LECTURE PROFIL -----------
export async function getProfile(id = getUserId()) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

// ----------- UPDATE PROFIL -----------
export async function updateProfile(updates, id = getUserId()) {
  await supabase
    .from("users")
    .update(updates)
    .eq("id", id);
}

// ----------- CHANGEMENT D'ID -----------
export async function changeUserId(newId) {
  // Vérifie unicité
  const { data } = await supabase.from("users").select("id").eq("id", newId);
  if (data && data.length) throw new Error("Cet ID existe déjà !");
  const oldId = getUserId();

  // Met à jour dans Supabase (il faut migrer toutes les relations si tu en as dans d'autres tables !)
  await supabase.from("users").update({ id: newId }).eq("id", oldId);

  // Si tu veux gérer le changement d'ID dans d'autres tables (photos, duels...), ajoute ici les migrations
  // Exemple :
  // await supabase.from("photos").update({ userId: newId }).eq("userId", oldId);

  // Mets à jour en local
  localStorage.setItem("id", newId);
}

