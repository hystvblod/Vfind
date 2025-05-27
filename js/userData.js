import { db, auth, initFirebaseUser } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// ======== CACHE GLOBAL UTILISATEUR ========
let userDataCache = null;

// ==== ACCÈS REF UTILISATEUR FIRESTORE ====
async function getUserRef() {
  await initFirebaseUser();
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged(async user => {
      unsub();
      if (!user) reject("Utilisateur non connecté");
      else resolve(doc(db, "users", user.uid));
    });
  });
}

// ==== CHARGEMENT ET REFRESH DU CACHE UTILISATEUR ====
export async function loadUserData(force = false) {
  if (userDataCache && !force) return userDataCache;
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  if (snap.exists()) {
    userDataCache = snap.data();
  } else {
    // Création automatique du doc si absent
    userDataCache = {
      pseudo: "Toi",
      points: 100,
      jetons: 3,
      cadres: ["polaroid_01", "polaroid_02"],
      cadreActif: "polaroid_01",
      historique: [],
      likedPhotos: [],
      signaledPhotos: [],
      premium: false,
      votesConcours: {}
    };
    await setDoc(ref, userDataCache);
  }
  return userDataCache;
}

// ==== FONCTIONS LECTURE ÉCLAIR (accès cache) ====
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

// ========== GET/SET/UPDATE VERS FIRESTORE (+ cache MAJ) ==========

// PSEUDO
export async function getPseudo() {
  await loadUserData();
  return getPseudoCached();
}
export async function setPseudo(pseudo) {
  const ref = await getUserRef();
  await updateDoc(ref, { pseudo });
  userDataCache.pseudo = pseudo;
}

// POINTS (Vcoins)
export async function getPoints() {
  await loadUserData();
  return getPointsCached();
}
export async function addPoints(n) {
  await loadUserData();
  userDataCache.points = getPointsCached() + n;
  const ref = await getUserRef();
  await updateDoc(ref, { points: userDataCache.points });
}
export async function removePoints(n) {
  await loadUserData();
  if (getPointsCached() < n) return false;
  userDataCache.points -= n;
  const ref = await getUserRef();
  await updateDoc(ref, { points: userDataCache.points });
  return true;
}

// JETONS
export async function getJetons() {
  await loadUserData();
  return getJetonsCached();
}
export async function addJetons(n) {
  await loadUserData();
  userDataCache.jetons = getJetonsCached() + n;
  const ref = await getUserRef();
  await updateDoc(ref, { jetons: userDataCache.jetons });
}
export async function removeJeton() {
  await loadUserData();
  if (getJetonsCached() <= 0) return false;
  userDataCache.jetons -= 1;
  const ref = await getUserRef();
  await updateDoc(ref, { jetons: userDataCache.jetons });
  return true;
}

// CADRES
export function formatCadreId(id) {
  const num = id.replace(/[^\d]/g, "");
  const padded = num.padStart(2, "0");
  return "polaroid_" + padded;
}
export async function getCadresPossedes() {
  await loadUserData();
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
  const ref = await getUserRef();
  await updateDoc(ref, { cadres: userDataCache.cadres });
}
export async function getCadreSelectionne() {
  await loadUserData();
  return getCadreSelectionneCached();
}
export async function setCadreSelectionne(id) {
  const idClean = formatCadreId(id);
  const ref = await getUserRef();
  await updateDoc(ref, { cadreActif: idClean });
  userDataCache.cadreActif = idClean;
}

// HISTORIQUE
export async function sauvegarderPhoto(base64, defi) {
  await loadUserData();
  const historique = [...(userDataCache.historique || []), { base64, defi, date: new Date().toISOString() }];
  userDataCache.historique = historique;
  const ref = await getUserRef();
  await updateDoc(ref, { historique });
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
  const ref = await getUserRef();
  await updateDoc(ref, { likedPhotos: userDataCache.likedPhotos });
}
export async function unlikePhoto(photoId) {
  await loadUserData();
  userDataCache.likedPhotos = (userDataCache.likedPhotos || []).filter(id => id !== photoId);
  const ref = await getUserRef();
  await updateDoc(ref, { likedPhotos: userDataCache.likedPhotos });
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
  const ref = await getUserRef();
  await updateDoc(ref, { signaledPhotos: userDataCache.signaledPhotos });
}
export async function getSignaledPhotos() {
  await loadUserData();
  return getSignaledPhotosCached();
}

// PREMIUM
export async function isPremium() {
  await loadUserData();
  return isPremiumCached();
}
export async function setPremium(status) {
  const ref = await getUserRef();
  await updateDoc(ref, { premium: !!status });
  userDataCache.premium = !!status;
}

// RESET/UPDATE
export async function resetUserData() {
  const ref = await getUserRef();
  userDataCache = {
    pseudo: "Toi",
    points: 0,
    jetons: 0,
    cadres: [],
    cadreActif: "polaroid_01",
    historique: [],
    likedPhotos: [],
    signaledPhotos: [],
    premium: false,
    votesConcours: {}
  };
  await setDoc(ref, userDataCache);
}
export async function updateUserData(update) {
  await loadUserData();
  Object.assign(userDataCache, update);
  const ref = await getUserRef();
  await updateDoc(ref, update);
}

// ACCÈS GLOBAL À TOUTES LES DONNÉES (depuis le cache)
export async function getUserDataCloud() {
  await loadUserData();
  return { ...userDataCache };
}

// ========== LOGIQUE CONCOURS ==========

// Donne l'ID concours (ex: "2024-22" pour la semaine 22 de 2024)
export function getConcoursId() {
  const now = new Date();
  const year = now.getFullYear();
  const firstJan = new Date(year, 0, 1);
  const days = Math.floor((now - firstJan) / 86400000);
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${year}-${week}`;
}

// Nombre de votes restants aujourd'hui (et photos déjà votées ce jour)
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
    const ref = await getUserRef();
    await updateDoc(ref, { votesConcours: userDataCache.votesConcours });
  }

  const dejaVotees = userDataCache.votesConcours[concoursId].votes?.[dateStr] || [];
  const votesToday = userDataCache.votesConcours[concoursId].votesToday ?? maxVotes;

  return {
    votesToday,
    maxVotes,
    dejaVotees
  };
}

// Voter pour une photo (ajoute le vote Firestore, pas de retrait possible)
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

  // MAJ user (cache & firestore)
  userDataCache.votesConcours[concoursId].votesToday -= 1;
  userDataCache.votesConcours[concoursId].votes[dateStr].push(photoId);
  userDataCache.votesConcours[concoursId].lastReset = dateStr;
  const ref = await getUserRef();
  await updateDoc(ref, { votesConcours: userDataCache.votesConcours });

  // MAJ votes sur la photo
  const photoRef = doc(db, "concoursPhotos", photoId);
  const photoSnap = await getDoc(photoRef);
  let votesTotal = photoSnap.exists() ? (photoSnap.data().votesTotal || 0) : 0;
  votesTotal += 1;
  await updateDoc(photoRef, { votesTotal });

  return true;
}

// Récupère toutes les photos du concours actuel (triées par votes décroissant)
export async function getPhotosConcours() {
  const concoursId = getConcoursId();
  const photosRef = collection(db, "concoursPhotos");
  const q = query(photosRef, where("concoursId", "==", concoursId));
  const snap = await getDocs(q);
  let photos = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    photos.push({
      id: docSnap.id,
      url: d.url,
      user: d.user || "Inconnu",
      votesTotal: d.votesTotal || 0
    });
  });
  // Tri décroissant (plus de votes en haut)
  photos.sort((a, b) => b.votesTotal - a.votesTotal);
  return photos;
}
