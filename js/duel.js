// === duel.js (VERSION FINALE STABLE 100% PRO) ===
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc,
  onSnapshot, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Initialisation Firebase
const db = getFirestore();
const auth = getAuth();
let currentRoomId = null;
let firebaseReady = false;

// Timer pour échec
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

// Authentification
auth.onAuthStateChanged(user => {
  if (user) {
    firebaseReady = true;
    console.log("✅ Utilisateur Firebase :", user.uid);
    checkOrCreateDuelRoom();
  } else {
    firebaseReady = false;
    console.warn("❌ Aucune session Firebase active");
    window.location.href = "login.html";
  }
});

// Vérifie si prêt
async function waitUntilReady(callback) {
  if (firebaseReady && auth.currentUser && auth.currentUser.uid) {
    callback();
  } else {
    setTimeout(() => waitUntilReady(callback), 200);
  }
}

// Matchmaking pur
async function tryMatchmaking(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!auth.currentUser?.uid) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const duelsCol = collection(db, "duels");
    const q = query(duelsCol,
      where("status", "==", "waiting"),
      where("player1", "!=", auth.currentUser.uid)
    );

    const qsnap = await getDocs(q);
    if (!qsnap.empty) {
      const first = qsnap.docs[0];
      const foundRoomId = first.id;
      currentRoomId = foundRoomId;
      console.log("🤝 Room rejointe :", foundRoomId);
      await joinDuelRoom(foundRoomId);
      return true;
    }

    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

// Crée ou rejoint une room
async function checkOrCreateDuelRoom() {
  if (!firebaseReady || !auth.currentUser?.uid) {
    console.warn("⏳ Firebase non prêt...");
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
  const uid = auth.currentUser.uid;
  console.log("📦 Création room avec :", uid);

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

// Rejoint une room existante
async function joinDuelRoom(roomId) {
  const duelRef = doc(db, "duels", roomId);
  const snap = await getDoc(duelRef);

  if (!snap.exists()) {
    alert("Room introuvable !");
    window.location.href = "duel.html";
    return;
  }

  const data = snap.data();
  if (!data.player2 && data.player1 !== auth.currentUser.uid) {
    console.log("🙋‍♂️ Je deviens player2 dans :", roomId);
    await updateDoc(duelRef, {
      player2: auth.currentUser.uid,
      status: "playing"
    });
  }

  startDuelListener(roomId);
}

// Écouteur temps réel
function startDuelListener(roomId) {
  const duelRef = doc(db, "duels", roomId);
  onSnapshot(duelRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();

    if (data.status === "playing") {
      console.log("🎮 Duel prêt, redirection...");
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
      if (failedDiv) failedDiv.style.display = "none";
      clearWaitingTimeout();
    }
  });
}

// Génère un ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 9);
}

// Score
async function updateScore(points) {
  if (!currentRoomId || !auth.currentUser?.uid) return;

  const duelRef = doc(db, "duels", currentRoomId);
  const snap = await getDoc(duelRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const uid = auth.currentUser.uid;

  if (data.player1 === uid) {
    await updateDoc(duelRef, { score1: points });
  } else if (data.player2 === uid) {
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

// ================== MINIATURES PHOTOS POUR CHAQUE DÉFI ==================
// À intégrer dans la page duel_game.html (ou là où tu affiches les photos des joueurs)

export function afficherPhotoCadreDuel(container, photoUrl, cadre = "polaroid_01") {
  if (!container || !photoUrl) return;
  container.innerHTML = `
    <div class="cadre-item">
      <div class="cadre-preview">
        <img src="assets/cadres/${cadre}.webp" class="photo-cadre" />
        <img src="${photoUrl}" class="photo-user" onclick="toggleFit(this)" />
      </div>
    </div>
  `;
}

// Utilisation (exemple) : 
//   const container = document.querySelector('[data-photo-joueur="..."]');
//   afficherPhotoCadreDuel(container, urlPhotoJoueur, cadreActuel);

// Pour adversaire idem :
//   const container = document.querySelector('[data-photo-adversaire="..."]');
//   afficherPhotoCadreDuel(container, urlPhotoAdversaire, cadreActuel);

// Le CSS miniature sera toujours appliqué comme attendu.
// ========================================================================
