// === duel.js (VERSION FINALE STABLE 100% PRO) ===
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc,
  onSnapshot, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Initialisation Firebase
const db = getFirestore();
const auth = getAuth();
let currentUser = null;
let currentRoomId = null;
let firebaseReady = false;

// Timer pour échec attente adversaire (1h)
let waitingTimeout = null;
function startWaitingTimeout(durationMs = 3600000) {
  clearWaitingTimeout();
  waitingTimeout = setTimeout(() => {
    const searchingDiv = document.getElementById("searching-adversary");
    const failedDiv = document.getElementById("searching-failed");
    if (searchingDiv) searchingDiv.style.display = "none";
    if (failedDiv) failedDiv.style.display = "flex";
  }, durationMs);
}
function clearWaitingTimeout() {
  if (waitingTimeout) clearTimeout(waitingTimeout);
  waitingTimeout = null;
}

// Authentification utilisateur
auth.onAuthStateChanged(user => {
  if (user) {
    firebaseReady = true;
    currentUser = user;
    console.log("✅ Utilisateur Firebase connecté :", user.uid);
    checkOrCreateDuelRoom();
  } else {
    firebaseReady = false;
    console.warn("❌ Aucune session Firebase active");
    window.location.href = "login.html";
  }
});

async function waitUntilReady(callback) {
  if (firebaseReady && auth.currentUser && auth.currentUser.uid) {
    callback();
  } else {
    setTimeout(() => waitUntilReady(callback), 200);
  }
}

// MATCHMAKING UNIQUEMENT
async function tryMatchmaking(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!auth.currentUser || !auth.currentUser.uid) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }
    const duelsCol = collection(db, "duels");
    const q = query(duelsCol, where("status", "==", "waiting"), where("player1", "!=", auth.currentUser.uid));
    const qsnap = await getDocs(q);
    if (!qsnap.empty) {
      const first = qsnap.docs[0];
      const foundRoomId = first.id;
      currentRoomId = foundRoomId;
      await joinDuelRoom(foundRoomId);
      return true;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

// Start Duel Flow
async function checkOrCreateDuelRoom() {
  if (!firebaseReady || !auth.currentUser || !auth.currentUser.uid) {
    console.warn("⛔️ Firebase pas prêt. Attente...");
    setTimeout(checkOrCreateDuelRoom, 300);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");

  if (roomId) {
    currentRoomId = roomId;
    await joinDuelRoom(roomId);
  } else {
    const matched = await tryMatchmaking(15000);
    if (!matched) {
      const newRoomId = await createDuelRoom();
      window.location.href = `duel.html?room=${newRoomId}`;
    }
  }
}

// Crée une room
async function createDuelRoom() {
  if (!auth.currentUser || !auth.currentUser.uid) {
    alert("⛔️ Utilisateur non connecté – room bloquée.");
    throw new Error("Firebase Auth non prêt");
  }

  const uid = auth.currentUser.uid;
  console.log("🎯 Création room avec UID :", uid);

  const roomId = generateRoomId();
  const duelRef = doc(collection(db, "duels"), roomId);
  await setDoc(duelRef, {
    player1: uid,
    player2: null,
    score1: 0,
    score2: 0,
    status: "waiting",
    createdAt: Date.now()
  });
  return roomId;
}

async function joinDuelRoom(roomId) {
  if (!auth.currentUser || !auth.currentUser.uid) {
    alert("⛔️ UID manquant pour rejoindre.");
    return;
  }
  const duelRef = doc(db, "duels", roomId);
  const snap = await getDoc(duelRef);
  if (!snap.exists()) {
    alert("Room introuvable !");
    window.location.href = "duel.html";
    return;
  }
  const data = snap.data();
  if (!data.player2 && data.player1 !== auth.currentUser.uid) {
    await updateDoc(duelRef, {
      player2: auth.currentUser.uid,
      status: "playing"
    });
  }
  startDuelListener(roomId);
}

// Listener temps réel
function startDuelListener(roomId) {
  const duelRef = doc(db, "duels", roomId);
  onSnapshot(duelRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.status === "playing") {
      window.location.href = `duel_game.html?room=${roomId}`;
    }

    const searchingDiv = document.getElementById("searching-adversary");
    const failedDiv = document.getElementById("searching-failed");
    if (data.status === "waiting") {
      if (searchingDiv) searchingDiv.style.display = "flex";
      if (failedDiv) failedDiv.style.display = "none";
      startWaitingTimeout();
    } else {
      if (searchingDiv) searchingDiv.style.display = "none";
      if (failedDiv) searchingDiv.style.display = "none";
      clearWaitingTimeout();
    }
  });
}

// Génère un ID aléatoire
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

// Score
async function updateScore(points) {
  if (!currentRoomId || !auth.currentUser || !auth.currentUser.uid) return;
  const duelRef = doc(db, "duels", currentRoomId);
  const snap = await getDoc(duelRef);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.player1 === auth.currentUser.uid) {
    await updateDoc(duelRef, { score1: points });
  } else if (data.player2 === auth.currentUser.uid) {
    await updateDoc(duelRef, { score2: points });
  }
}

// Affichage UI
function updateDuelUI(data) {
  if (document.getElementById("score1")) document.getElementById("score1").textContent = data.score1 || 0;
  if (document.getElementById("score2")) document.getElementById("score2").textContent = data.score2 || 0;
  if (document.getElementById("statut-duel")) document.getElementById("statut-duel").textContent = {
    waiting: "En attente d'un joueur...",
    playing: "En cours",
    finished: "Terminé"
  }[data.status] || "En attente";
}

// Boutons
document.getElementById("btn-valider-score")?.addEventListener("click", async () => {
  const points = parseInt(document.getElementById("input-score").value, 10);
  if (!isNaN(points)) await updateScore(points);
});
document.getElementById("btn-finir-duel")?.addEventListener("click", async () => {
  if (!currentRoomId) return;
  const duelRef = doc(db, "duels", currentRoomId);
  await updateDoc(duelRef, { status: "finished" });
});
