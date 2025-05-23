// === duel.js (VERSION FINALE 100% PRO, MIRROIR SOLO & AFFICHAGE MINITURE/CADRE) ===
import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, getDocs, query, where
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
const path = window.location.pathname;

// ===== LOGIQUE MATCHMAKING RANDOM (duel_random.html) =====
if (path.includes("duel_random.html")) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    const oldRoomId = localStorage.getItem("duel_random_room");
    if (oldRoomId) {
      const ref = doc(db, "duels", oldRoomId);
      const snap = await getDoc(ref);
      if (snap.exists() && (snap.data().status === "waiting" || snap.data().status === "playing")) {
        window.location.href = `duel_game.html?room=${oldRoomId}`;
        return;
      } else {
        localStorage.removeItem("duel_random_room");
      }
    }
    await startMatchmaking(user.uid);
  });

  async function startMatchmaking(uid) {
    const duelsCol = collection(db, "duels");
    const q = query(duelsCol, where("status", "==", "waiting"), where("player1", "!=", uid));
    const qsnap = await getDocs(q);

    if (!qsnap.empty) {
      const first = qsnap.docs[0];
      const roomId = first.id;
      const duelRef = doc(db, "duels", roomId);
      await updateDoc(duelRef, {
        player2: uid,
        status: "playing",
        startTime: Date.now()
      });
      localStorage.setItem("duel_random_room", roomId);
      window.location.href = `duel_game.html?room=${roomId}`;
    } else {
      const roomId = Math.random().toString(36).substring(2, 9);
      const duelRef = doc(collection(db, "duels"), roomId);

      const defisCol = collection(db, "defis");
      const defisSnap = await getDocs(defisCol);
      let allDefis = defisSnap.docs.map(doc => doc.data().intitule);
      const shuffled = [...allDefis].sort(() => 0.5 - Math.random());
      const defisChoisis = shuffled.slice(0, 3);

      await setDoc(duelRef, {
        player1: uid,
        player2: null,
        score1: 0,
        score2: 0,
        status: "waiting",
        createdAt: Date.now(),
        defis: defisChoisis,
        startTime: null,
        photosA: {},
        photosB: {}
      });

      localStorage.setItem("duel_random_room", roomId);

      onSnapshot(duelRef, (snap) => {
        const data = snap.data();
        if (data && data.status === "playing") {
          window.location.href = `duel_game.html?room=${roomId}`;
        }
      });
    }
  }
}

// ===== DUEL GAME (duel_game.html) =====
if (path.includes("duel_game.html") && roomId) {
  currentRoomId = roomId;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    currentUserId = user.uid;
    listenRoom(roomId);
  });

  function listenRoom(roomId) {
    const duelRef = doc(db, "duels", roomId);
    onSnapshot(duelRef, async (snap) => {
      if (!snap.exists()) {
        localStorage.removeItem("duel_random_room");
        alert("Room supprimée ou introuvable !");
        window.location.href = "duel.html";
        return;
      }
      roomData = snap.data();
      await updateDuelUI();
    });
  }

  async function updateDuelUI() {
    let advPseudo = "Adversaire";
    let advID = "";
    let myID = "";
    isPlayer1 = false;

    if (currentUserId && roomData) {
      isPlayer1 = (currentUserId === roomData.player1);
      myID = isPlayer1 ? roomData.player1 : roomData.player2;
      advID = isPlayer1 ? roomData.player2 : roomData.player1;
      if (advID) {
        const userRef = doc(db, "users", advID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) advPseudo = userSnap.data().pseudo || advPseudo;
      }
    }

    if ($("nom-adversaire")) $("nom-adversaire").textContent = advPseudo;
    if (roomData.startTime && $("timer")) startGlobalTimer(roomData.startTime);
    else if ($("timer")) $("timer").textContent = "--:--:--";

    // ==== RECUP CADRE ACTIF DE CHAQUE JOUEUR ====
    let cadreActifMoi = "polaroid_01";
    let cadreActifAdv = "polaroid_01";
    try {
      if (myID) {
        const userRef = doc(db, "users", myID);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().cadreActif) cadreActifMoi = snap.data().cadreActif;
      }
      if (advID) {
        const advRef = doc(db, "users", advID);
        const snap = await getDoc(advRef);
        if (snap.exists() && snap.data().cadreActif) cadreActifAdv = snap.data().cadreActif;
      }
    } catch(e) { /* ignore */ }

    renderDefis({myID, advID, advPseudo, cadreActifMoi, cadreActifAdv});
  }

  function startGlobalTimer(startTime) {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const duration = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = Math.max(0, (startTime + duration) - now);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      $("timer").textContent = `${h}h ${m}m ${s}s`;
      if (diff <= 0) clearInterval(timerInterval);
    }, 1000);
  }

  // ========== AFFICHAGE DES DÉFIS, CADRES DYNAMIQUES, PHOTOS, etc. ==========
  async function renderDefis({myID, advID, advPseudo, cadreActifMoi, cadreActifAdv}) {
    const ul = $("duel-defi-list");
    if (!ul || !roomData || !roomData.defis || roomData.defis.length === 0) {
      if (ul) ul.innerHTML = `<li>Aucun défi.</li>`;
      return;
    }

    // Récupération correcte des photos (string !)
    const myPhotos = isPlayer1 ? (roomData.photosA || {}) : (roomData.photosB || {});
    const advPhotos = isPlayer1 ? (roomData.photosB || {}) : (roomData.photosA || {});

    ul.innerHTML = '';
    for (let idx = 0; idx < roomData.defis.length; idx++) {
      const defi = roomData.defis[idx];
      const idxStr = String(idx);
      const li = document.createElement('li');
      li.className = 'defi-item';

      // Cartouche défi (en haut)
      const cartouche = document.createElement('div');
      cartouche.className = 'defi-cartouche-center';
      cartouche.textContent = defi;
      li.appendChild(cartouche);

      // Ligne deux colonnes
      const row = document.createElement('div');
      row.className = 'duel-defi-row';

      // ======== Colonne Joueur (gauche) ========
      const colJoueur = document.createElement('div');
      colJoueur.className = 'joueur-col';

      // Titre
      const titreJoueur = document.createElement('div');
      titreJoueur.className = 'col-title';
      titreJoueur.textContent = "Toi";
      colJoueur.appendChild(titreJoueur);

      // Si photo, structure SOLO (miniature/cadre)
      if (myPhotos[idxStr]) {
        const cadreDiv = document.createElement("div");
        cadreDiv.className = "cadre-item";
        const preview = document.createElement("div");
        preview.className = "cadre-preview";
        const cadreImg = document.createElement("img");
        cadreImg.className = "photo-cadre";
        cadreImg.src = "./assets/cadres/" + cadreActifMoi + ".webp";
        const photoImg = document.createElement("img");
        photoImg.className = "photo-user";
        photoImg.src = myPhotos[idxStr];
        photoImg.onclick = () => agrandirPhoto(myPhotos[idxStr], cadreActifMoi);

        preview.appendChild(cadreImg);
        preview.appendChild(photoImg);
        cadreDiv.appendChild(preview);
        colJoueur.appendChild(cadreDiv);
      }

      // Boutons sous le cadre/miniature (ou seuls si pas de photo)
      const btnRow = document.createElement('div');
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";
      btnRow.style.justifyContent = "center";
      btnRow.style.marginTop = "10px";

      // Jeton P (toujours affiché)
      const jetonBtn = document.createElement('button');
      jetonBtn.className = 'btn-jeton-p';
      jetonBtn.textContent = "🅿️";
      jetonBtn.title = "Valider avec un jeton";
      jetonBtn.onclick = () => alert("Jeton P utilisé !");
      btnRow.appendChild(jetonBtn);

      // Bouton photo
      const photoBtn = document.createElement('button');
      photoBtn.textContent = myPhotos[idxStr] ? "📸 Reprendre une photo" : "📸 Prendre une photo";
      photoBtn.onclick = () => ouvrirCameraPourDuel(idx);
      btnRow.appendChild(photoBtn);

      colJoueur.appendChild(btnRow);

      // ======== Colonne Adversaire (droite) ========
      const colAdv = document.createElement('div');
      colAdv.className = 'adversaire-col';
      const titreAdv = document.createElement('div');
      titreAdv.className = 'col-title';
      titreAdv.textContent = advPseudo || "Joueur";
      colAdv.appendChild(titreAdv);

      // Miniature ADVERSAIRE si dispo
      if (advPhotos[idxStr]) {
        const cadreDiv = document.createElement("div");
        cadreDiv.className = "cadre-item";
        const preview = document.createElement("div");
        preview.className = "cadre-preview";
        const cadreImg = document.createElement("img");
        cadreImg.className = "photo-cadre";
        cadreImg.src = "./assets/cadres/" + cadreActifAdv + ".webp";
        const photoImg = document.createElement("img");
        photoImg.className = "photo-user";
        photoImg.src = advPhotos[idxStr];
        photoImg.onclick = () => agrandirPhoto(advPhotos[idxStr], cadreActifAdv);

        preview.appendChild(cadreImg);
        preview.appendChild(photoImg);
        cadreDiv.appendChild(preview);
        colAdv.appendChild(cadreDiv);
      }

      // Ajout des colonnes à la row
      row.appendChild(colJoueur);
      row.appendChild(colAdv);

      // Ajout row à l'item li
      li.appendChild(row);
      ul.appendChild(li);
    }
  }

  // ==== Camera ====
  window.ouvrirCameraPourDuel = function(idx) {
    window.cameraOuvrirCameraPourDuel && window.cameraOuvrirCameraPourDuel(idx);
  };

  window.savePhotoDuel = async function(idx, dataUrl) {
    const duelRef = doc(db, "duels", currentRoomId);
    const data = (await getDoc(duelRef)).data();
    const field = isPlayer1 ? "photosA" : "photosB";
    const photos = data[field] || {};
    photos[String(idx)] = dataUrl; // IMPORTANT : clé string
    await updateDoc(duelRef, { [field]: photos });
  };

  // Agrandir la photo (popup)
  window.agrandirPhoto = function(dataUrl, cadre) {
    document.getElementById("photo-affichee").src = dataUrl;
    document.getElementById("cadre-affiche").src = `./assets/cadres/${cadre}.webp`;
    const popup = document.getElementById("popup-photo");
    popup.classList.remove("hidden");
    popup.classList.add("show");
  };
}

// ==== Utils ====
function $(id) {
  return document.getElementById(id);
}
