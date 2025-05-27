import { db, auth, initFirebaseUser } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// ======== UTILS FIRESTORE USER ========

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

// ========== DONNÉES UTILISATEUR CLASSIQUES ==========

export async function getPseudo() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().pseudo || "Toi" : "Toi";
}
export async function setPseudo(pseudo) {
  const ref = await getUserRef();
  await updateDoc(ref, { pseudo });
}

// Points (Vcoins)
export async function getPoints() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().points || 0) : 0;
}
export async function addPoints(n) {
  const ref = await getUserRef();
  const points = await getPoints();
  await updateDoc(ref, { points: points + n });
}
export async function removePoints(n) {
  const points = await getPoints();
  if (points < n) return false;
  const ref = await getUserRef();
  await updateDoc(ref, { points: points - n });
  return true;
}

// Jetons
export async function getJetons() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().jetons || 0) : 0;
}
export async function addJetons(n) {
  const ref = await getUserRef();
  const jetons = await getJetons();
  await updateDoc(ref, { jetons: jetons + n });
}
export async function removeJeton() {
  const jetons = await getJetons();
  if (jetons <= 0) return false;
  const ref = await getUserRef();
  await updateDoc(ref, { jetons: jetons - 1 });
  return true;
}

// Cadres possédés
export function formatCadreId(id) {
  const num = id.replace(/[^\d]/g, "");
  const padded = num.padStart(2, "0");
  return "polaroid_" + padded;
}
export async function getCadresPossedes() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().cadres || []) : [];
}
export async function possedeCadre(id) {
  const idClean = formatCadreId(id);
  const cadres = await getCadresPossedes();
  return cadres.includes(idClean);
}
export async function acheterCadre(id) {
  const ref = await getUserRef();
  const idClean = formatCadreId(id);
  await updateDoc(ref, { cadres: arrayUnion(idClean) });
}
export async function getCadreSelectionne() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().cadreActif || "polaroid_01") : "polaroid_01";
}
export async function setCadreSelectionne(id) {
  const ref = await getUserRef();
  const idClean = formatCadreId(id);
  await updateDoc(ref, { cadreActif: idClean });
}

// Historique
export async function sauvegarderPhoto(base64, defi) {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  const historique = snap.exists() ? (snap.data().historique || []) : [];
  historique.push({ base64, defi, date: new Date().toISOString() });
  await updateDoc(ref, { historique });
}
export async function getHistoriquePhotos() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().historique || []) : [];
}

// Likes photos
export async function likePhoto(photoId) {
  const ref = await getUserRef();
  await updateDoc(ref, { likedPhotos: arrayUnion(photoId) });
}
export async function unlikePhoto(photoId) {
  const ref = await getUserRef();
  await updateDoc(ref, { likedPhotos: arrayRemove(photoId) });
}
export async function getLikedPhotos() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().likedPhotos || []) : [];
}

// Signalements photos
export async function signalerPhoto(photoId) {
  const ref = await getUserRef();
  await updateDoc(ref, { signaledPhotos: arrayUnion(photoId) });
}
export async function getSignaledPhotos() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().signaledPhotos || []) : [];
}

// Premium
export async function isPremium() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().premium === true) : false;
}
export async function setPremium(status) {
  const ref = await getUserRef();
  await updateDoc(ref, { premium: !!status });
}

// Réinitialisation complète (ATTENTION : efface tout le doc Firestore !)
export async function resetUserData() {
  const ref = await getUserRef();
  await setDoc(ref, {
    pseudo: "Toi",
    points: 0,
    jetons: 0,
    cadres: [],
    cadreActif: "polaroid_01",
    historique: [],
    likedPhotos: [],
    signaledPhotos: [],
    premium: false
  });
}

// Mise à jour partielle (patch)
export async function updateUserData(update) {
  const ref = await getUserRef();
  await updateDoc(ref, update);
}

// Accès à toutes les infos Firestore de l'utilisateur courant
export async function getUserDataCloud() {
  try {
    const ref = await getUserRef();
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    } else {
      // Création automatique du doc si absent
      const baseData = {
        pseudo: "Toi",
        points: 100,
        jetons: 3,
        cadres: ["polaroid_01", "polaroid_02"],
        cadreActif: "polaroid_01",
        historique: [],
        likedPhotos: [],
        signaledPhotos: [],
        premium: false
      };
      await setDoc(ref, baseData);
      return baseData;
    }
  } catch (e) {
    console.error("Erreur getUserDataCloud:", e);
    return {
      pseudo: "Toi",
      points: 0,
      jetons: 0,
      cadres: ["polaroid_01"],
      cadreActif: "polaroid_01",
      historique: [],
      likedPhotos: [],
      signaledPhotos: [],
      premium: false
    };
  }
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
  const concoursId = getConcoursId();
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  let userData = snap.exists() ? snap.data() : {};
  const maxVotes = userData.premium ? 6 : 3;

  if (!userData.votesConcours) userData.votesConcours = {};
  if (!userData.votesConcours[concoursId]) userData.votesConcours[concoursId] = {};

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  if (userData.votesConcours[concoursId].lastReset !== dateStr) {
    userData.votesConcours[concoursId].lastReset = dateStr;
    userData.votesConcours[concoursId].votesToday = maxVotes;
    userData.votesConcours[concoursId].votes = userData.votesConcours[concoursId].votes || {};
    userData.votesConcours[concoursId].votes[dateStr] = [];
    await updateDoc(ref, { votesConcours: userData.votesConcours });
  }

  const dejaVotees = userData.votesConcours[concoursId].votes?.[dateStr] || [];
  const votesToday = userData.votesConcours[concoursId].votesToday ?? maxVotes;

  return {
    votesToday,
    maxVotes,
    dejaVotees
  };
}

// Voter pour une photo (ajoute le vote Firestore, pas de retrait possible)
export async function voterPourPhoto(photoId) {
  const concoursId = getConcoursId();
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  let userData = snap.exists() ? snap.data() : {};
  const maxVotes = userData.premium ? 6 : 3;

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  if (!userData.votesConcours) userData.votesConcours = {};
  if (!userData.votesConcours[concoursId]) userData.votesConcours[concoursId] = {};
  if (!userData.votesConcours[concoursId].votes) userData.votesConcours[concoursId].votes = {};
  if (!userData.votesConcours[concoursId].votes[dateStr]) userData.votesConcours[concoursId].votes[dateStr] = [];

  // Reset auto si date différente
  if (userData.votesConcours[concoursId].lastReset !== dateStr) {
    userData.votesConcours[concoursId].lastReset = dateStr;
    userData.votesConcours[concoursId].votesToday = maxVotes;
    userData.votesConcours[concoursId].votes[dateStr] = [];
  }

  const votesToday = userData.votesConcours[concoursId].votesToday;
  const dejaVotees = userData.votesConcours[concoursId].votes[dateStr];

  if (votesToday <= 0) throw new Error("Tu as utilisé tous tes votes aujourd'hui !");
  if (dejaVotees.includes(photoId)) throw new Error("Tu as déjà voté pour cette photo aujourd'hui.");

  // MAJ user
  userData.votesConcours[concoursId].votesToday -= 1;
  userData.votesConcours[concoursId].votes[dateStr].push(photoId);
  userData.votesConcours[concoursId].lastReset = dateStr;
  await updateDoc(ref, { votesConcours: userData.votesConcours });

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
