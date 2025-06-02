// js/supabase.js

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://swmdepiukfginzhbeccz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bWRlcGl1a2ZnaW56aGJlY2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjEyNTksImV4cCI6MjA2Mzk5NzI1OX0.--VONIyPdx1tTi45nd4e-F-ZuKNgbDSY1pP0rXHyJgI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const defaultProfile = () => ({
  pseudoPublic: null,
  points: 100,
  jetons: 3,
  idFixe: false,
  cadres: [],
  filleuls: 0,
  amis: [],
  demandesRecues: [],
  demandesEnvoyees: [],
  historique: [],
  historiqueDuel: [],
  photosAimees: []
});

export async function getCurrentUser() {
  let pseudoPublic = localStorage.getItem('pseudoPublic');
  if (!pseudoPublic) {
    pseudoPublic = await generateUniquePseudo();
    localStorage.setItem('pseudoPublic', pseudoPublic);
    await createProfile(pseudoPublic);
  }
  return pseudoPublic;
}

async function generateUniquePseudo() {
  let pseudo;
  let exists = true;
  while (exists) {
    pseudo = "user_" + Math.random().toString(36).substring(2, 8);
    const { data } = await supabase
      .from("users")
      .select("pseudoPublic")
      .eq("pseudoPublic", pseudo)
      .single();
    exists = !!data;
  }
  return pseudo;
}

export async function createProfile(pseudoPublic) {
  const profile = defaultProfile();
  profile.pseudoPublic = pseudoPublic;
  await supabase.from("users").insert([profile]);
}

export async function getProfile(pseudoPublic) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("pseudoPublic", pseudoPublic)
    .single();
  return data;
}

export async function updateProfile(pseudoPublic, updates) {
  await supabase
    .from("users")
    .update(updates)
    .eq("pseudoPublic", pseudoPublic);
}
