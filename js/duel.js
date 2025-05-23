import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

let currentRoomId = null;
let currentUserId = null;
let isPlayer1 = false;
let roomData = null;
let timerInterval = null;

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

function $(id) { return document.getElementById(id); }

if (roomId) {
  currentRoomId = roomId;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    currentUserId = user.uid;
    listenRoom(roomId);
  });
}

// ==== Écoute la room en temps réel (défis, photos, timer, adversaire, etc.) ====
function listenRoom(roomId) {
  const duelRef = doc(db, "duels", roomId);
  onSnapshot(duelRef, async (snap) => {
    if (!snap.exists()) {
      alert("Room supprimée ou introuvable !");
      window.location.href = "duel.html";
      return;
    }
    roomData = snap.data();
    updateDuelUI();
  });
}

// ==== Met à jour tout l'affichage en fonction des données Firestore ====
async function updateDuelUI() {
  // 1. Adversaire
  let advPseudo = "Adversaire";
  if (currentUserId && roomData) {
    isPlayer1 = (currentUserId === roomData.player1);
    const advUid = isPlayer1 ? roomData.player2 : roomData.player1;
    if (advUid) {
      const userRef = doc(db, "users", advUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) advPseudo = userSnap.data().pseudo || advPseudo;
    }
  }
  $("nom-adversaire").textContent = advPseudo;

  // 2. Timer global (24h à partir du startTime, ou ce que tu veux)
  if (roomData.startTime) startGlobalTimer(roomData.startTime);
  else $("timer").textContent = "--:--:--";

  // 3. Affichage défis et photos
  renderDefis();
}

// ==== TIMER GLOBAL DUEL ====
function startGlobalTimer(startTime) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const duration = 24 * 60 * 60 * 1000; // 24h en ms
    const now = Date.now();
    const diff = Math.max(0, (startTime + duration) - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    $("timer").textContent = `${h}h ${m}m ${s}s`;
    if (diff <= 0) clearInterval(timerInterval);
  }, 1000);
}

// ==== RENDU DES DÉFIS EN MODE DUEL A/B, CLASSES SOLO ====
async function renderDefis() {
  const ul = $("duel-defi-list");
  if (!roomData || !roomData.defis || roomData.defis.length === 0) {
    ul.innerHTML = `<li>Aucun défi.</li>`;
    return;
  }
  // Photos des deux joueurs
  const myPhotos = isPlayer1 ? (roomData.photosA || {}) : (roomData.photosB || {});
  const advPhotos = isPlayer1 ? (roomData.photosB || {}) : (roomData.photosA || {});

  ul.innerHTML = '';
  for (let idx = 0; idx < roomData.defis.length; idx++) {
    const defi = roomData.defis[idx];
    // Bloc principal structure SOLO
    const li = document.createElement('li');
    li.className = 'defi-item';

    const content = document.createElement('div');
    content.className = 'defi-content split'; // split pour deux colonnes
    // COLONNE JOUEUR
    const colJoueur = document.createElement('div');
    colJoueur.className = 'joueur-col';

    const cadreJoueur = document.createElement('div');
    cadreJoueur.className = 'cadre-item';
    const cadrePreviewJoueur = document.createElement('div');
    cadrePreviewJoueur.className = 'cadre-preview';

    // Affichage photo joueur (miniature SOLO)
    const cadreImgJoueur = document.createElement('img');
    cadreImgJoueur.className = 'photo-cadre';
    cadreImgJoueur.src = 'assets/cadres/polaroid_01.webp'; // ou ton cadre dynamique

    cadrePreviewJoueur.appendChild(cadreImgJoueur);

    if (myPhotos[idx]) {
      const photoJoueur = document.createElement('img');
      photoJoueur.className = 'photo-user';
      photoJoueur.src = myPhotos[idx];
      photoJoueur.onclick = () => agrandirPhoto(myPhotos[idx]);
      cadrePreviewJoueur.appendChild(photoJoueur);
      cadreJoueur.classList.add("done");
    }

    cadreJoueur.appendChild(cadrePreviewJoueur);

    // Bouton photo
    const boutonPhoto = document.createElement('button');
    boutonPhoto.textContent = myPhotos[idx] ? "📸 Reprendre une photo" : "📸 Prendre une photo";
    boutonPhoto.onclick = () => ouvrirCameraPourDuel(idx);

    colJoueur.appendChild(cadreJoueur);
    colJoueur.appendChild(boutonPhoto);

    // COLONNE TEXTE
    const colTexte = document.createElement('div');
    colTexte.className = 'defi-texte';
    const p = document.createElement('p');
    p.textContent = defi;
    colTexte.appendChild(p);

    // COLONNE ADVERSAIRE
    const colAdv = document.createElement('div');
    colAdv.className = 'adversaire-col';

    const cadreAdv = document.createElement('div');
    cadreAdv.className = 'cadre-item';
    const cadrePreviewAdv = document.createElement('div');
    cadrePreviewAdv.className = 'cadre-preview';

    const cadreImgAdv = document.createElement('img');
    cadreImgAdv.className = 'photo-cadre';
    cadreImgAdv.src = 'assets/cadres/polaroid_01.webp'; // ou dynamique
    cadrePreviewAdv.appendChild(cadreImgAdv);

    if (advPhotos[idx]) {
      const photoAdv = document.createElement('img');
      photoAdv.className = 'photo-user';
      photoAdv.src = advPhotos[idx];
      photoAdv.onclick = () => agrandirPhoto(advPhotos[idx]);
      cadrePreviewAdv.appendChild(photoAdv);
      cadreAdv.classList.add("done");
    }

    cadreAdv.appendChild(cadrePreviewAdv);
    colAdv.appendChild(cadreAdv);

    // ASSEMBLAGE
    content.appendChild(colJoueur);
    content.appendChild(colTexte);
    content.appendChild(colAdv);
    li.appendChild(content);
    ul.appendChild(li);
  }
}

// ==== Camera ====
window.ouvrirCameraPourDuel = function(idx) {
  // Ouverture de la caméra (appelle ta logique caméra, puis save la photo en base)
  // Ici, on part du principe que tu récupères un dataURL de la photo
  // Après capture, appelle savePhotoDuel(idx, dataUrl);
  window.cameraOuvrirCameraPourDuel && window.cameraOuvrirCameraPourDuel(idx);
};

window.savePhotoDuel = async function(idx, dataUrl) {
  // Stocke la photo dans photosA ou photosB de la room
  const duelRef = doc(db, "duels", currentRoomId);
  const data = (await getDoc(duelRef)).data();
  const field = isPlayer1 ? "photosA" : "photosB";
  const photos = data[field] || {};
  photos[idx] = dataUrl;
  await updateDoc(duelRef, { [field]: photos });
};

// ==== Popup zoom ====
window.agrandirPhoto = function(dataUrl) {
  $("photo-affichee").src = dataUrl;
  $("cadre-affiche").src = 'assets/cadres/polaroid_01.webp';
  $("popup-photo").classList.remove("hidden");
  $("popup-photo").classList.add("show");
};
$("close-popup")?.addEventListener("click", () => {
  $("popup-photo").classList.add("hidden");
  $("popup-photo").classList.remove("show");
});
