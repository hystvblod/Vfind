// === userData.js (Firebase PRO) ===
import { db, auth, initFirebaseUser } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// Utils : accès au doc utilisateur courant
async function getUserRef() {
  await initFirebaseUser();
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");
  return doc(db, "users", user.uid);
}

// Utilitaire ID cadre (inchangé)
export function formatCadreId(id) {
  const num = id.replace(/[^\d]/g, "");
  const padded = num.padStart(2, "0");
  return "polaroid_" + padded;
}

// ======================
// Données utilisateur
// ======================

// Pseudo
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
// Permet d'accéder à toutes les infos Firestore de l'utilisateur courant
export async function getUserDataCloud() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}
