// === duel.js (version PRO full Firebase, plus de localStorage) ===
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Initialisation Firebase
const db = getFirestore();
const auth = getAuth();
let currentUser = null;

// Récupère l'utilisateur actuel
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    // Charger ou créer une room
    checkOrCreateDuelRoom();
  } else {
    // Rediriger vers login si besoin
    window.location.href = "login.html";
  }
});

// Nom de la room actuel (stocké en mémoire session, pas localStorage)
let currentRoomId = null;

// Fonction pour créer/rejoindre une room de duel
async function checkOrCreateDuelRoom() {
  // Ex : on prend l’id dans l’URL : duel.html?room=XXXX
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");
  if (roomId) {
    currentRoomId = roomId;
    await joinDuelRoom(roomId);
  } else {
    // Si pas de room, on en crée une nouvelle et on redirige
    const newRoomId = await createDuelRoom();
    window.location.href = `duel.html?room=${newRoomId}`;
  }
}

// Crée une nouvelle room de duel dans Firestore
async function createDuelRoom() {
  const roomId = generateRoomId();
  const duelRef = doc(collection(db, "duels"), roomId);
  await setDoc(duelRef, {
    player1: currentUser.uid,
    player2: null,
    score1: 0,
    score2: 0,
    status: "waiting", // waiting, playing, finished
    createdAt: Date.now()
  });
  return roomId;
}

// Rejoint une room de duel existante (Firestore)
async function joinDuelRoom(roomId) {
  const duelRef = doc(db, "duels", roomId);
  const snap = await getDoc(duelRef);
  if (!snap.exists()) {
    alert("Room introuvable !");
    window.location.href = "duel.html";
    return;
  }
  const data = snap.data();
  // Si la room attend un joueur 2
  if (!data.player2 && data.player1 !== currentUser.uid) {
    await updateDoc(duelRef, {
      player2: currentUser.uid,
      status: "playing"
    });
  }
  // Démarre la synchro temps réel sur cette room
  startDuelListener(roomId);
}

// Ecouteur temps réel sur la room de duel
function startDuelListener(roomId) {
  const duelRef = doc(db, "duels", roomId);
  onSnapshot(duelRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    // MAJ l’affichage (score, statut, tour, etc.)
    updateDuelUI(data);
  });
}

// Génère un ID de room aléatoire
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

// Met à jour le score du joueur actuel
async function updateScore(points) {
  if (!currentRoomId || !currentUser) return;
  const duelRef = doc(db, "duels", currentRoomId);
  const snap = await getDoc(duelRef);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.player1 === currentUser.uid) {
    await updateDoc(duelRef, { score1: points });
  } else if (data.player2 === currentUser.uid) {
    await updateDoc(duelRef, { score2: points });
  }
}

// Met à jour l'affichage du duel (fonction à compléter selon ton UI)
function updateDuelUI(data) {
  // Exemple d’affichage :
  document.getElementById("score1").textContent = data.score1 || 0;
  document.getElementById("score2").textContent = data.score2 || 0;
  document.getElementById("statut-duel").textContent = {
    waiting: "En attente d'un joueur...",
    playing: "En cours",
    finished: "Terminé"
  }[data.status] || "En attente";
  // À adapter selon les autres champs de ta room
}

// Action : envoyer son score (ex: bouton "Valider score")
document.getElementById("btn-valider-score")?.addEventListener("click", async () => {
  const points = parseInt(document.getElementById("input-score").value, 10);
  if (!isNaN(points)) {
    await updateScore(points);
  }
});

// Si tu veux finir le duel :
async function finishDuel() {
  if (!currentRoomId) return;
  const duelRef = doc(db, "duels", currentRoomId);
  await updateDoc(duelRef, { status: "finished" });
}

// Action : bouton "Finir le duel"
document.getElementById("btn-finir-duel")?.addEventListener("click", async () => {
  await finishDuel();
});

// --- Fin de duel.js ---

