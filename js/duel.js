// === duel.js (version PRO full Firebase, matchmaking + bot, plus de localStorage) ===
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc,
  onSnapshot, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Initialisation Firebase
const db = getFirestore();
const auth = getAuth();
let currentUser = null;

// Nom de la room actuel (stocké en mémoire session)
let currentRoomId = null;

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

// ====== MATCHMAKING + MODE BOT ======

async function checkOrCreateDuelRoom() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");
  if (roomId) {
    currentRoomId = roomId;
    await joinDuelRoom(roomId);
  } else {
    // 1. CHERCHER UNE ROOM "WAITING" qui n'est PAS soi-même
    const duelsCol = collection(db, "duels");
    const q = query(duelsCol, where("status", "==", "waiting"), where("player1", "!=", currentUser.uid));
    const qsnap = await getDocs(q);
    let joined = false;
    if (!qsnap.empty) {
      // Prendre la première dispo
      const first = qsnap.docs[0];
      const foundRoomId = first.id;
      currentRoomId = foundRoomId;
      await joinDuelRoom(foundRoomId);
      // Rediriger pour avoir l’URL propre
      window.location.href = `duel.html?room=${foundRoomId}`;
      joined = true;
    }
    if (!joined) {
      // Si aucune room "waiting", en créer une nouvelle
      const newRoomId = await createDuelRoom();
      // Lancer le mode bot si personne ne rejoint en 10s
      autoJoinAsBotIfAlone(newRoomId);
      window.location.href = `duel.html?room=${newRoomId}`;
    }
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

// BOT: Si après 10s il n'y a toujours pas de player2, remplir avec "BOT" (pour test/démo solo)
async function autoJoinAsBotIfAlone(roomId) {
  setTimeout(async () => {
    const duelRef = doc(db, "duels", roomId);
    const snap = await getDoc(duelRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.status === "waiting" && !data.player2) {
        await updateDoc(duelRef, {
          player2: "BOT",
          status: "playing"
        });
      }
    }
  }, 10000); // 10 secondes
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
  // Exemple d’affichage (à adapter selon ton HTML réel)
  if(document.getElementById("score1")) document.getElementById("score1").textContent = data.score1 || 0;
  if(document.getElementById("score2")) document.getElementById("score2").textContent = data.score2 || 0;
  if(document.getElementById("statut-duel")) document.getElementById("statut-duel").textContent = {
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
