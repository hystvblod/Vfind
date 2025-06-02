// js/userData.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://swmdepiukfginzhbeccz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bWRlcGl1a2ZnaW56aGJlY2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjEyNTksImV4cCI6MjA2Mzk5NzI1OX0.--VONIyPdx1tTi45nd4e-F-ZuKNgbDSY1pP0rXHyJgI';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let userDataCache = null;
let userIdCache = null;

// ---------- AUTH ANONYME AUTOMATIQUE SUPABASE ----------
async function ensureAuth() {
  let session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    let res = await supabase.auth.signInAnonymously();
    if (res.error) throw new Error("Erreur de connexion anonyme Supabase : " + res.error.message);
    session = (await supabase.auth.getSession()).data.session;
  }
  userIdCache = session.user.id;
  return session.user.id;
}

// --------- UTILS CACHE LOCAL CADRES POSSÉDÉS ----------
function getCachedOwnedFrames() {
  try { return JSON.parse(localStorage.getItem("ownedFrames")) || null; }
  catch(e){ return null; }
}
function setCachedOwnedFrames(frames) {
  localStorage.setItem("ownedFrames", JSON.stringify(frames));
}

// --------- CHARGEMENT ET REFRESH DU CACHE UTILISATEUR ----------
export async function loadUserData(force = false) {
  await ensureAuth();
  if (userDataCache && !force) return userDataCache;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userIdCache)
    .single();
  if (error || !data) {
    userDataCache = {
      id: userIdCache,
      pseudo: "Toi",
      points: 100,
      jetons: 3,
      cadres: ["polaroid_01", "polaroid_02"],
      cadreActif: "polaroid_01",
      historique: [],
      likedPhotos: [],
      signaledPhotos: [],
      premium: false,
      votesConcours: {},
      hasDownloadedVZone: false,
      hasDownloadedVBlocks: false,
      friendsInvited: 0
    };
    await supabase.from('users').insert([userDataCache]);
  } else {
    userDataCache = data;
  }
  setCachedOwnedFrames(userDataCache.cadres || []);
  return userDataCache;
}

// --------- FONCTIONS LECTURE ÉCLAIR (accès cache) ----------
export function getPseudoCached()        { return userDataCache?.pseudo ?? "Toi"; }
export function getPointsCached()        { return userDataCache?.points ?? 0; }
export function getJetonsCached()        { return userDataCache?.jetons ?? 0; }
export function getCadresPossedesCached(){ return userDataCache?.cadres ?? []; }
export function getCadreSelectionneCached() { return userDataCache?.cadreActif ?? "polaroid_01"; }
export function isPremiumCached()        { return !!userDataCache?.premium; }
export function getLikedPhotosCached()   { return userDataCache?.likedPhotos ?? []; }
export function getSignaledPhotosCached(){ return userDataCache?.signaledPhotos ?? []; }
export function getHistoriqueCached()    { return userDataCache?.historique ?? []; }
export function getVotesConcoursCached(){ return userDataCache?.votesConcours ?? {}; }
export function hasDownloadedVZoneCached() { return userDataCache?.hasDownloadedVZone ?? false; }
export function hasDownloadedVBlocksCached() { return userDataCache?.hasDownloadedVBlocks ?? false; }
export function getFriendsInvitedCached() { return userDataCache?.friendsInvited ?? 0; }

// ---------- FONCTIONS CLOUD ----------
export async function getPseudo() { await loadUserData(); return getPseudoCached(); }
export async function setPseudo(pseudo) {
  await loadUserData();
  userDataCache.pseudo = pseudo;
  await supabase.from('users').update({ pseudo }).eq('id', userIdCache);
}

export async function getPoints() { await loadUserData(); return getPointsCached(); }
export async function addPoints(n) {
  await loadUserData();
  userDataCache.points += n;
  await supabase.from('users').update({ points: userDataCache.points }).eq('id', userIdCache);
}
export async function removePoints(n) {
  await loadUserData();
  if (userDataCache.points < n) return false;
  userDataCache.points -= n;
  await supabase.from('users').update({ points: userDataCache.points }).eq('id', userIdCache);
  return true;
}

export async function getJetons() { await loadUserData(); return getJetonsCached(); }
export async function addJetons(n) {
  await loadUserData();
  userDataCache.jetons += n;
  await supabase.from('users').update({ jetons: userDataCache.jetons }).eq('id', userIdCache);
}
export async function removeJeton() {
  await loadUserData();
  if (userDataCache.jetons <= 0) return false;
  userDataCache.jetons -= 1;
  await supabase.from('users').update({ jetons: userDataCache.jetons }).eq('id', userIdCache);
  return true;
}

// CADRES
export function formatCadreId(id) {
  const num = id.replace(/[^\d]/g, "");
  const padded = num.padStart(2, "0");
  return "polaroid_" + padded;
}
export async function getCadresPossedes(force = false) {
  if (!force) {
    const cached = getCachedOwnedFrames();
    if (cached) return cached;
  }
  await loadUserData();
  setCachedOwnedFrames(getCadresPossedesCached());
  return getCadresPossedesCached();
}
export async function possedeCadre(id) {
  await loadUserData();
  const idClean = formatCadreId(id);
  return getCadresPossedesCached().includes(idClean);
}
export async function acheterCadre(id) {
  await loadUserData();
  const idClean = formatCadreId(id);
  userDataCache.cadres = Array.from(new Set([...(userDataCache.cadres || []), idClean]));
  await supabase.from('users').update({ cadres: userDataCache.cadres }).eq('id', userIdCache);
  setCachedOwnedFrames(userDataCache.cadres);
}
export async function getCadreSelectionne() {
  await loadUserData();
  return getCadreSelectionneCached();
}
export async function setCadreSelectionne(id) {
  const idClean = formatCadreId(id);
  await loadUserData();
  userDataCache.cadreActif = idClean;
  await supabase.from('users').update({ cadreActif: idClean }).eq('id', userIdCache);
}

// HISTORIQUE PHOTOS (chaque entrée = {base64, defi, date, type, defis})
export async function sauvegarderPhoto(base64, defi, type = "solo") {
  await loadUserData();
  const historique = [...(userDataCache.historique || []), { base64, defi, date: new Date().toISOString(), type, defis: [defi] }];
  userDataCache.historique = historique;
  await supabase.from('users').update({ historique }).eq('id', userIdCache);
}
export async function getHistoriquePhotos() {
  await loadUserData();
  return getHistoriqueCached();
}

// LIKES PHOTOS
export async function likePhoto(photoId) {
  await loadUserData();
  if (!userDataCache.likedPhotos.includes(photoId))
    userDataCache.likedPhotos.push(photoId);
  await supabase.from('users').update({ likedPhotos: userDataCache.likedPhotos }).eq('id', userIdCache);
}
export async function unlikePhoto(photoId) {
  await loadUserData();
  userDataCache.likedPhotos = (userDataCache.likedPhotos || []).filter(id => id !== photoId);
  await supabase.from('users').update({ likedPhotos: userDataCache.likedPhotos }).eq('id', userIdCache);
}
export async function getLikedPhotos() {
  await loadUserData();
  return getLikedPhotosCached();
}

// SIGNALER PHOTOS
export async function signalerPhoto(photoId) {
  await loadUserData();
  if (!userDataCache.signaledPhotos.includes(photoId))
    userDataCache.signaledPhotos.push(photoId);
  await supabase.from('users').update({ signaledPhotos: userDataCache.signaledPhotos }).eq('id', userIdCache);
}
export async function getSignaledPhotos() {
  await loadUserData();
  return getSignaledPhotosCached();
}

// PREMIUM
export async function isPremium() { await loadUserData(); return isPremiumCached(); }
export async function setPremium(status) {
  await loadUserData();
  userDataCache.premium = !!status;
  await supabase.from('users').update({ premium: !!status }).eq('id', userIdCache);
}

// Flags pour conditions spécifiques (ex: téléchargements et invitations)
export async function setHasDownloadedVZone(value) {
  await loadUserData();
  userDataCache.hasDownloadedVZone = !!value;
  await supabase.from('users').update({ hasDownloadedVZone: !!value }).eq('id', userIdCache);
}
export async function hasDownloadedVZone() {
  await loadUserData();
  return !!userDataCache.hasDownloadedVZone;
}
export async function setHasDownloadedVBlocks(value) {
  await loadUserData();
  userDataCache.hasDownloadedVBlocks = !!value;
  await supabase.from('users').update({ hasDownloadedVBlocks: !!value }).eq('id', userIdCache);
}
export async function hasDownloadedVBlocks() {
  await loadUserData();
  return !!userDataCache.hasDownloadedVBlocks;
}
export async function setFriendsInvited(count) {
  await loadUserData();
  userDataCache.friendsInvited = count;
  await supabase.from('users').update({ friendsInvited: count }).eq('id', userIdCache);
}
export async function getNbAmisInvites() {
  await loadUserData();
  return userDataCache.friendsInvited || 0;
}
export async function incrementFriendsInvited() {
  await loadUserData();
  userDataCache.friendsInvited = (userDataCache.friendsInvited || 0) + 1;
  await supabase.from('users').update({ friendsInvited: userDataCache.friendsInvited }).eq('id', userIdCache);
}

// ========== CONDITIONS CADRES SPÉCIAUX ==========

export async function getJoursDefisRealises() {
  await loadUserData();
  const historique = userDataCache?.historique || [];

  // Regroupe par date et type
  const defisParJourType = {};
  historique.forEach(entry => {
    let dateISO = entry.date && entry.date.length === 10 ? entry.date : (entry.date || '').slice(0, 10);
    if (!defisParJourType[dateISO]) defisParJourType[dateISO] = { solo: 0, duel_random: 0, duel_amis: 0 };
    if (entry.type === "solo") defisParJourType[dateISO].solo += (entry.defis?.length || 0);
    if (entry.type === "duel_random") defisParJourType[dateISO].duel_random += (entry.defis?.length || 0);
    if (entry.type === "duel_amis") defisParJourType[dateISO].duel_amis += (entry.defis?.length || 0);
  });

  // Compte 1 jour validé si une des catégories a 3 défis ce jour-là
  let joursValides = 0;
  for (const date in defisParJourType) {
    const { solo, duel_random, duel_amis } = defisParJourType[date];
    if (solo >= 3 || duel_random >= 3 || duel_amis >= 3) joursValides++;
  }
  return joursValides;
}

export async function getConcoursParticipationStatus() {
  await loadUserData();
  const concoursId = getConcoursId();
  // Vérifier photo postée cette semaine
  const aPoste = (userDataCache.concoursPhotosPostees || []).includes(concoursId);
  // Vérifier votes sur au moins 3 jours
  const votes = userDataCache.votesConcours?.[concoursId]?.votes || {};
  const joursVotés = Object.keys(votes).filter(date => (votes[date]?.length ?? 0) > 0);
  const aVote3Jours = joursVotés.length >= 3;
  return aPoste && aVote3Jours;
}

// ========== LOGIQUE CONCOURS ==========

export function getConcoursId() {
  const now = new Date();
  const year = now.getFullYear();
  const firstJan = new Date(year, 0, 1);
  const days = Math.floor((now - firstJan) / 86400000);
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${year}-${week}`;
}

export async function getVotesInfoForConcours() {
  await loadUserData();
  const concoursId = getConcoursId();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const maxVotes = isPremiumCached() ? 6 : 3;

  if (!userDataCache.votesConcours) userDataCache.votesConcours = {};
  if (!userDataCache.votesConcours[concoursId]) userDataCache.votesConcours[concoursId] = {};

  if (userDataCache.votesConcours[concoursId].lastReset !== dateStr) {
    userDataCache.votesConcours[concoursId].lastReset = dateStr;
    userDataCache.votesConcours[concoursId].votesToday = maxVotes;
    userDataCache.votesConcours[concoursId].votes = userDataCache.votesConcours[concoursId].votes || {};
    userDataCache.votesConcours[concoursId].votes[dateStr] = [];
    await supabase.from('users').update({ votesConcours: userDataCache.votesConcours }).eq('id', userIdCache);
  }

  const dejaVotees = userDataCache.votesConcours[concoursId].votes?.[dateStr] || [];
  const votesToday = userDataCache.votesConcours[concoursId].votesToday ?? maxVotes;

  return {
    votesToday,
    maxVotes,
    dejaVotees
  };
}

export async function voterPourPhoto(photoId) {
  await loadUserData();
  const concoursId = getConcoursId();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const maxVotes = isPremiumCached() ? 6 : 3;

  if (!userDataCache.votesConcours) userDataCache.votesConcours = {};
  if (!userDataCache.votesConcours[concoursId]) userDataCache.votesConcours[concoursId] = {};
  if (!userDataCache.votesConcours[concoursId].votes) userDataCache.votesConcours[concoursId].votes = {};
  if (!userDataCache.votesConcours[concoursId].votes[dateStr]) userDataCache.votesConcours[concoursId].votes[dateStr] = [];

  // Reset auto si date différente
  if (userDataCache.votesConcours[concoursId].lastReset !== dateStr) {
    userDataCache.votesConcours[concoursId].lastReset = dateStr;
    userDataCache.votesConcours[concoursId].votesToday = maxVotes;
    userDataCache.votesConcours[concoursId].votes[dateStr] = [];
  }

  const votesToday = userDataCache.votesConcours[concoursId].votesToday;
  const dejaVotees = userDataCache.votesConcours[concoursId].votes[dateStr];

  if (votesToday <= 0) throw new Error("Tu as utilisé tous tes votes aujourd'hui !");
  if (dejaVotees.includes(photoId)) throw new Error("Tu as déjà voté pour cette photo aujourd'hui.");

  // MAJ user (cache & supabase)
  userDataCache.votesConcours[concoursId].votesToday -= 1;
  userDataCache.votesConcours[concoursId].votes[dateStr].push(photoId);
  userDataCache.votesConcours[concoursId].lastReset = dateStr;
  await supabase.from('users').update({ votesConcours: userDataCache.votesConcours }).eq('id', userIdCache);

  // MAJ votes sur la photo (table "concoursPhotos", champ votesTotal)
  const { data: photo, error } = await supabase
    .from('concoursPhotos')
    .select('*')
    .eq('id', photoId)
    .single();
  let votesTotal = photo?.votesTotal || 0;
  votesTotal += 1;
  await supabase.from('concoursPhotos').update({ votesTotal }).eq('id', photoId);

  return true;
}

export async function getPhotosConcours() {
  const concoursId = getConcoursId();
  const { data, error } = await supabase
    .from('concoursPhotos')
    .select('*')
    .eq('concoursId', concoursId);
  let photos = (data || []).map(d => ({
    id: d.id,
    url: d.url,
    user: d.user || "Inconnu",
    votesTotal: d.votesTotal || 0
  }));
  photos.sort((a, b) => b.votesTotal - a.votesTotal);
  return photos;
}

// RESET/UPDATE
export async function resetUserData() {
  await ensureAuth();
  userDataCache = {
    id: userIdCache,
    pseudo: "Toi",
    points: 0,
    jetons: 0,
    cadres: [],
    cadreActif: "polaroid_01",
    historique: [],
    likedPhotos: [],
    signaledPhotos: [],
    premium: false,
    votesConcours: {},
    hasDownloadedVZone: false,
    hasDownloadedVBlocks: false,
    friendsInvited: 0
  };
  await supabase.from('users').upsert([userDataCache]);
  setCachedOwnedFrames([]);
}
export async function updateUserData(update) {
  await loadUserData();
  Object.assign(userDataCache, update);
  await supabase.from('users').update(update).eq('id', userIdCache);
  if ('cadres' in update) setCachedOwnedFrames(update.cadres);
}

// ACCÈS GLOBAL À TOUTES LES DONNÉES (depuis le cache)
export async function getUserDataCloud() {
  await loadUserData();
  return { ...userDataCache };
}
// Récupère la liste des défis (toutes langues)
export async function getDefisFromSupabase(lang = "fr") {
  let { data, error } = await supabase.from("defis").select("*");
  if (error) throw error;
  return (data || []).map(d => ({
    id: d.id,
    texte: lang === "fr" ? d.intitule : (d[lang] || d.intitule),
    done: false
  }));
}
// Alias rétrocompatible pour compatibilité boutique.js
export async function getOwnedFrames(force = false) {
  return await getCadresPossedes(force);
}
