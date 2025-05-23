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
    const myPhotos = isPlayer1 ? (roomData.photosA || {}) : (roomData.photosB || {});
    const advPhotos = isPlayer1 ? (roomData.photosB || {}) : (roomData.photosA || {});

    ul.innerHTML = '';
    for (let idx = 0; idx < roomData.defis.length; idx++) {
      const defi = roomData.defis[idx];

      const li = document.createElement('li');
      li.className = 'defi-item defi-row';
      li.style.display = "flex";
      li.style.alignItems = "stretch";
      li.style.justifyContent = "center";
      li.style.marginBottom = "2rem";

      // COLONNE GAUCHE (TOI)
      const colJoueur = document.createElement('div');
      colJoueur.className = 'joueur-col';
      colJoueur.style.display = "flex";
      colJoueur.style.flexDirection = "column";
      colJoueur.style.alignItems = "center";
      colJoueur.style.flex = "1 1 33%";

      // Affiche cadre SEULEMENT si photo existante
      if (myPhotos[idx]) {
        const cadreJoueur = document.createElement('div');
        cadreJoueur.className = 'cadre-item';
        cadreJoueur.style.margin = "0 auto";

        const cadrePreviewJoueur = document.createElement('div');
        cadrePreviewJoueur.className = 'cadre-preview';

        const cadreImgJoueur = document.createElement('img');
        cadreImgJoueur.className = 'photo-cadre';
        cadreImgJoueur.src = 'assets/cadres/' + cadreActifMoi + '.webp';

        cadrePreviewJoueur.appendChild(cadreImgJoueur);

        const photoJoueur = document.createElement('img');
        photoJoueur.className = 'photo-user';
        photoJoueur.src = myPhotos[idx];
        photoJoueur.onclick = () => agrandirPhoto(myPhotos[idx], cadreActifMoi);
        cadrePreviewJoueur.appendChild(photoJoueur);
        cadreJoueur.appendChild(cadrePreviewJoueur);
        colJoueur.appendChild(cadreJoueur);
      }

      // Bouton photo TOUJOURS visible pour toi
      const boutonPhoto = document.createElement('button');
      boutonPhoto.textContent = myPhotos[idx] ? "📸 Reprendre une photo" : "📸 Prendre une photo";
      boutonPhoto.onclick = () => ouvrirCameraPourDuel(idx);
      boutonPhoto.style.marginTop = "0.7em";
      colJoueur.appendChild(boutonPhoto);

      // Ton ID publique (ou "Moi")
      const labelID = document.createElement('div');
      labelID.className = "id-publique";
      labelID.style.fontSize = "0.95em";
      labelID.style.marginTop = "0.2em";
      labelID.textContent = "Moi";
      colJoueur.appendChild(labelID);

      // Valider par jeton uniquement si tu as pris une photo
      if (myPhotos[idx]) {
        const boutonJeton = document.createElement('button');
        boutonJeton.className = "valider-jeton-btn";
        boutonJeton.innerHTML = `<img src="assets/img/jeton_p.webp" alt="Jeton" style="width:26px;vertical-align:middle;margin-right:2px;" /> Valider avec un jeton`;
        boutonJeton.onclick = () => validerDefiAvecJeton(idx);
        boutonJeton.style.marginTop = "0.5em";
        colJoueur.appendChild(boutonJeton);
      }

      // COLONNE CENTRALE (DÉFI)
      const colTexte = document.createElement('div');
      colTexte.className = 'defi-texte-center';
      colTexte.style.display = "flex";
      colTexte.style.flexDirection = "column";
      colTexte.style.justifyContent = "center";
      colTexte.style.alignItems = "center";
      colTexte.style.flex = "1 1 34%";
      // Cartouche défi centrée
      const cartouche = document.createElement('div');
      cartouche.className = "defi-cartouche";
      cartouche.style.background = "#f2f7fb";
      cartouche.style.borderRadius = "18px";
      cartouche.style.padding = "18px 20px";
      cartouche.style.margin = "0 12px";
      cartouche.style.fontWeight = "bold";
      cartouche.style.fontSize = "1.16em";
      cartouche.style.textAlign = "center";
      cartouche.textContent = defi;
      colTexte.appendChild(cartouche);

      // COLONNE DROITE (ADVERSAIRE)
      const colAdv = document.createElement('div');
      colAdv.className = 'adversaire-col';
      colAdv.style.display = "flex";
      colAdv.style.flexDirection = "column";
      colAdv.style.alignItems = "center";
      colAdv.style.flex = "1 1 33%";

      // Affiche cadre ADV seulement si photo existante
      if (advPhotos[idx]) {
        const cadreAdv = document.createElement('div');
        cadreAdv.className = 'cadre-item';
        cadreAdv.style.margin = "0 auto";

        const cadrePreviewAdv = document.createElement('div');
        cadrePreviewAdv.className = 'cadre-preview';

        const cadreImgAdv = document.createElement('img');
        cadreImgAdv.className = 'photo-cadre';
        cadreImgAdv.src = 'assets/cadres/' + cadreActifAdv + '.webp';

        cadrePreviewAdv.appendChild(cadreImgAdv);

        const photoAdv = document.createElement('img');
        photoAdv.className = 'photo-user';
        photoAdv.src = advPhotos[idx];
        photoAdv.onclick = () => agrandirPhoto(advPhotos[idx], cadreActifAdv);
        cadrePreviewAdv.appendChild(photoAdv);
        cadreAdv.appendChild(cadrePreviewAdv);
        colAdv.appendChild(cadreAdv);
      }
      // ID publique adversaire (ou pseudo)
      const labelAdvID = document.createElement('div');
      labelAdvID.className = "id-publique";
      labelAdvID.style.fontSize = "0.95em";
      labelAdvID.style.marginTop = "0.2em";
      labelAdvID.style.color = "#3682e3";
      labelAdvID.textContent = advPseudo && advPseudo !== "Adversaire" ? advPseudo : (advID || "Adversaire");
      colAdv.appendChild(labelAdvID);

      // ASSEMBLAGE
      const content = document.createElement('div');
      content.className = 'defi-content split';
      content.style.display = "flex";
      content.style.width = "100%";
      content.appendChild(colJoueur);
      content.appendChild(colTexte);
      content.appendChild(colAdv);
      li.appendChild(content);
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
    photos[idx] = dataUrl;
    await updateDoc(duelRef, { [field]: photos });
  };

  // ==== Validation par jeton ====
  window.validerDefiAvecJeton = function(idx) {
    if (typeof ouvrirPopupJeton === "function") {
      ouvrirPopupJeton(idx, "duel");
    } else {
      alert("Fonction popup jeton non branchée !");
    }
  };

  // ==== Popup zoom ====
  window.agrandirPhoto = function(dataUrl, cadreName = "polaroid_01") {
    $("photo-affichee").src = dataUrl;
    $("cadre-affiche").src = 'assets/cadres/' + cadreName + '.webp';
    $("popup-photo").classList.remove("hidden");
    $("popup-photo").classList.add("show");
  };
  $("close-popup")?.addEventListener("click", () => {
    $("popup-photo").classList.add("hidden");
    $("popup-photo").classList.remove("show");
  });
}

// ========== Outil DOM ==========
function $(id) { return document.getElementById(id); }
