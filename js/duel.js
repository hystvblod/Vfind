// ==== duel.js (SUPABASE + BOUTONS STRICTEMENT IDENTIQUES SOLO, PATCH FIREFOX) ====

import { supabase, getPseudo as getCurrentUser } from './userData.js';

// ========== IndexedDB cache ==========
const VFindDuelDB = {
  db: null,
  async init() {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open('VFindDuelPhotos', 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('photos', { keyPath: 'key' });
      };
      open.onsuccess = () => {
        VFindDuelDB.db = open.result;
        resolve();
      };
      open.onerror = reject;
    });
  },
  async set(key, dataUrl) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put({ key, dataUrl });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  },
  async get(key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = reject;
    });
  },
  async deleteAllForRoom(roomId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const req = store.openCursor();
      req.onsuccess = function() {
        const cursor = req.result;
        if (cursor) {
          if (cursor.key.startsWith(roomId + "_")) cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  }
};

// --------- Fonctions COEURS LOCAUX (photos aimées DUEL) ---------
function getPhotosAimeesDuel() {
  return JSON.parse(localStorage.getItem("photos_aimees_duel") || "[]");
}
function aimerPhotoDuel(defiId) {
  let aimes = getPhotosAimeesDuel();
  if (!aimes.includes(defiId)) {
    aimes.push(defiId);
    localStorage.setItem("photos_aimees_duel", JSON.stringify(aimes));
  }
}
function retirerPhotoAimeeDuel(defiId) {
  let aimes = getPhotosAimeesDuel();
  aimes = aimes.filter(id => id !== defiId);
  localStorage.setItem("photos_aimees_duel", JSON.stringify(aimes));
}

// --------- Variables globales ---------
let currentRoomId = null;
let isPlayer1 = false;
let roomData = null;
let timerInterval = null;

// --------- Utilitaires ---------
function $(id) { return document.getElementById(id); }

// --------- Matchmaking Duel ---------
const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");
const path = window.location.pathname;

// PATCH : REPRISE DE PARTIE EN COURS SI EXISTE
if (path.includes("duel_random.html")) {
  const existingRoomId = localStorage.getItem("duel_random_room");
  if (existingRoomId) {
    supabase
      .from('duels')
      .select('id, status')
      .eq('id', existingRoomId)
      .single()
      .then(({ data }) => {
        if (data && data.status && data.status !== 'finished') {
          setTimeout(() => {
            window.location.href = `duel_game.html?room=${existingRoomId}`;
          }, 200);
        } else {
          localStorage.removeItem("duel_random_room");
          localStorage.removeItem("duel_is_player1");
          findOrCreateRoom();
        }
      });
  } else {
    findOrCreateRoom();
  }
}

// DUEL RANDOM MATCHMAKING PATCH
async function findOrCreateRoom() {
  localStorage.removeItem("duel_random_room");
  localStorage.removeItem("duel_is_player1");
  const pseudo = await getCurrentUser();

  for (let i = 0; i < 5; i++) {
    let { data: rooms } = await supabase
      .from('duels')
      .select('*')
      .eq('status', 'waiting')
      .neq('player1', pseudo);

    if (rooms && rooms.length > 0) {
      const room = rooms[0];
      await supabase.from('duels').update({
        player2: pseudo,
        status: 'playing',
        starttime: Date.now()
      }).eq('id', room.id);

      localStorage.setItem("duel_random_room", room.id);
      localStorage.setItem("duel_is_player1", "0");
      setTimeout(() => {
        window.location.href = `duel_game.html?room=${room.id}`;
      }, 200);
      return;
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  const defis = await getRandomDefis(3);
  const roomObj = {
    player1: pseudo,
    player2: null,
    score1: 0,
    score2: 0,
    status: 'waiting',
    createdat: Date.now(),
    defis: defis,
    starttime: null,
    photosA: {},
    photosB: {}
  };

  const { data, error } = await supabase.from('duels').insert([roomObj]).select();
  if (error) {
    alert("Erreur création duel : " + error.message);
    return;
  }
  localStorage.setItem("duel_random_room", data[0].id);
  localStorage.setItem("duel_is_player1", "1");
  setTimeout(() => {
    waitRoom(data[0].id);
  }, 200);
}

function waitRoom(roomId) {
  const poll = async () => {
    try {
      const { data: r, error } = await supabase.from('duels').select('*').eq('id', roomId).single();
      if (error) {
        setTimeout(poll, 2000);
        return;
      }
      if (r && r.status === "playing") {
        setTimeout(() => {
          window.location.href = `duel_game.html?room=${roomId}`;
        }, 200);
      } else if (r && r.status === "waiting") {
        setTimeout(poll, 1500);
      } else {
        alert("Room annulée ou supprimée.");
      }
    } catch (e) {
      setTimeout(poll, 2000);
    }
  };
  poll();
}

// =============== GAME DUEL ==============
if (path.includes("duel_game.html") && roomId) {
  currentRoomId = roomId;
  window.currentRoomId = currentRoomId;

  (async () => {
    const pseudo = await getCurrentUser();
    const room = await getRoom(roomId);
    isPlayer1 = (room.player1 === pseudo);
    subscribeRoom(roomId, (data) => {
      roomData = data;
      updateDuelUI();
    });
    roomData = await getRoom(roomId);
    updateDuelUI();
  })();

  function subscribeRoom(roomId, callback) {
    supabase
      .channel('duel_room_' + roomId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'duels',
        filter: `id=eq.${roomId}`
      }, payload => {
        callback(payload.new);
      })
      .subscribe();
  }

  async function updateDuelUI() {
    if (!roomData) return;
    const pseudo = await getCurrentUser();

    let advID = isPlayer1 ? roomData.player2 : roomData.player1;
    let myID = isPlayer1 ? roomData.player1 : roomData.player2;
    let headerLabel = advID ? advID : "Adversaire";

    if ($("nom-adversaire")) $("nom-adversaire").textContent = headerLabel;
    if ($("pseudo-moi")) $("pseudo-moi").textContent = myID ? myID : "Moi";
    if ($("pseudo-adv")) $("pseudo-adv").textContent = advID ? advID : "Adversaire";
    if (roomData.starttime && $("timer")) startGlobalTimer(roomData.starttime);
    else if ($("timer")) $("timer").textContent = "--:--:--";

    let cadreActifMoi = "polaroid_01";
    let cadreActifAdv = "polaroid_01";
    renderDefis({ cadreActifMoi, cadreActifAdv, myID, advID });
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

  // --------- Affichage des défis + boutons ---------
  async function renderDefis({ cadreActifMoi, cadreActifAdv, myID, advID }) {
    const ul = $("duel-defi-list");
    if (!ul || !roomData || !roomData.defis || roomData.defis.length === 0) {
      if (ul) ul.innerHTML = `<li>Aucun défi.</li>`;
      return;
    }

    const myChamp = isPlayer1 ? 'photosA' : 'photosB';
    const advChamp = isPlayer1 ? 'photosB' : 'photosA';
    const photosAimees = getPhotosAimeesDuel();

    ul.innerHTML = '';
    for (let idx = 0; idx < roomData.defis.length; idx++) {
      const defi = roomData.defis[idx];
      const idxStr = String(idx);
      const li = document.createElement('li');
      li.className = 'defi-item';

      // Cartouche défi
      const cartouche = document.createElement('div');
      cartouche.className = 'defi-cartouche-center';
      cartouche.textContent = defi;
      li.appendChild(cartouche);

      // Ligne deux colonnes
      const row = document.createElement('div');
      row.className = 'duel-defi-row';

      // --- Colonne Joueur (gauche) ---
      const colJoueur = document.createElement('div');
      colJoueur.className = 'joueur-col';

      const titreJoueur = document.createElement('div');
      titreJoueur.className = 'col-title';
      titreJoueur.textContent = myID ? myID : "Moi";
      colJoueur.appendChild(titreJoueur);

      // Photo joueur (cache optimisé)
      const myPhoto = await getPhotoDuel(roomId, myChamp, idxStr);
      if (myPhoto) {
        const cadreDiv = document.createElement("div");
        cadreDiv.className = "cadre-item cadre-duel-mini";
        const preview = document.createElement("div");
        preview.className = "cadre-preview";
        const cadreImg = document.createElement("img");
        cadreImg.className = "photo-cadre";
        cadreImg.src = "./assets/cadres/" + cadreActifMoi + ".webp";
        const photoImg = document.createElement("img");
        photoImg.className = "photo-user";
        photoImg.src = myPhoto;
        photoImg.onclick = () => agrandirPhoto(myPhoto, cadreActifMoi);

        preview.appendChild(cadreImg);
        preview.appendChild(photoImg);

        // --- Bouton coeur pour aimer la photo ---
        const coeurBtn = document.createElement("img");
        coeurBtn.src = photosAimees.includes(`${roomId}_${myChamp}_${idxStr}`) ? "assets/icons/coeur_plein.svg" : "assets/icons/coeur.svg";
        coeurBtn.alt = "Aimer";
        coeurBtn.style.width = "2em";
        coeurBtn.style.cursor = "pointer";
        coeurBtn.style.marginLeft = "0.6em";
        coeurBtn.title = photosAimees.includes(`${roomId}_${myChamp}_${idxStr}`) ? "Retirer des photos aimées" : "Ajouter aux photos aimées";
        coeurBtn.onclick = () => {
          if (photosAimees.includes(`${roomId}_${myChamp}_${idxStr}`)) {
            retirerPhotoAimeeDuel(`${roomId}_${myChamp}_${idxStr}`);
          } else {
            aimerPhotoDuel(`${roomId}_${myChamp}_${idxStr}`);
          }
          renderDefis({ cadreActifMoi, cadreActifAdv, myID, advID });
        };
        preview.appendChild(coeurBtn);
        cadreDiv.appendChild(preview);
        colJoueur.appendChild(cadreDiv);
      }

      // ========== BOUTONS (JETON + PHOTO STRICTEMENT SOLO) ==========
      const btnRow = document.createElement('div');
      btnRow.className = "duel-btnrow-joueur";
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";
      btnRow.style.justifyContent = "center";
      btnRow.style.marginTop = "10px";

      // --- Jeton (identique solo)
  const jetonBtn = document.createElement('button');
jetonBtn.className = 'btn-jeton-p';
jetonBtn.title = "Valider avec un jeton";
jetonBtn.textContent = "Valider"; // ou laisse vide si tu ne veux même pas de texte
jetonBtn.onclick = () => ouvrirPopupJeton(idx);
btnRow.appendChild(jetonBtn);


      // --- PHOTO : <img> identique solo (PAS de bouton, style inline)
      const imgPhoto = document.createElement('img');
      imgPhoto.src = "assets/icons/photo.svg";
      imgPhoto.alt = "Prendre une photo";
      imgPhoto.style.width = "2.2em";
      imgPhoto.style.cursor = "pointer";
      imgPhoto.style.display = "block";
      imgPhoto.style.margin = "0 auto";
      imgPhoto.title = myPhoto ? "Reprendre la photo" : "Prendre une photo";
      imgPhoto.onclick = () => window.gererPrisePhotoDuel(idx);
      btnRow.appendChild(imgPhoto);

      colJoueur.appendChild(btnRow);

      // --- Colonne Adversaire (droite) ---
      const colAdv = document.createElement('div');
      colAdv.className = 'adversaire-col';
      const titreAdv = document.createElement('div');
      titreAdv.className = 'col-title';
      titreAdv.textContent = advID ? advID : "Adversaire";
      colAdv.appendChild(titreAdv);

      // Photo adversaire (cache optimisé)
      const advPhoto = await getPhotoDuel(roomId, advChamp, idxStr);
      if (advPhoto) {
        const cadreDiv = document.createElement("div");
        cadreDiv.className = "cadre-item cadre-duel-mini";
        const preview = document.createElement("div");
        preview.className = "cadre-preview";
        const cadreImg = document.createElement("img");
        cadreImg.className = "photo-cadre";
        cadreImg.src = "./assets/cadres/" + cadreActifAdv + ".webp";
        const photoImg = document.createElement("img");
        photoImg.className = "photo-user";
        photoImg.src = advPhoto;
        photoImg.onclick = () => agrandirPhoto(advPhoto, cadreActifAdv);
        preview.appendChild(cadreImg);
        preview.appendChild(photoImg);
        cadreDiv.appendChild(preview);
        colAdv.appendChild(cadreDiv);
      }

      row.appendChild(colJoueur);
      row.appendChild(colAdv);

      li.appendChild(row);
      ul.appendChild(li);
    }
  }

  // ==== Camera, utils, etc... ====
  window.gererPrisePhotoDuel = function(idx) {
    let duelId = currentRoomId || window.currentRoomId || roomId;
    if (!duelId) {
      alert("Erreur critique : identifiant duel introuvable.");
      return;
    }
    window.cameraOuvrirCameraPourDuel && window.cameraOuvrirCameraPourDuel(idx, duelId);
  };

  window.savePhotoDuel = async function(idx, dataUrl) {
    const champ = isPlayer1 ? 'photosA' : 'photosB';
    const room = await getRoom(roomId);
    let photos = room[champ] || {};
    photos[idx] = dataUrl;
    await supabase.from('duels').update({ [champ]: photos }).eq('id', roomId);
    await VFindDuelDB.set(`${roomId}_${champ}_${idx}`, dataUrl);
  };

  window.agrandirPhoto = function(dataUrl, cadre) {
    $("photo-affichee").src = dataUrl;
    $("cadre-affiche").src = `./assets/cadres/${cadre}.webp`;
    const popup = $("popup-photo");
    popup.classList.remove("hidden");
    popup.classList.add("show");
  };

  window.cleanupDuelPhotos = async function() {
    await VFindDuelDB.deleteAllForRoom(roomId);
  };
}

// ======== UTILS SUPABASE ==========

async function getRandomDefis(count = 3) {
  let { data, error } = await supabase
    .from('defis')
    .select('texte')
    .order('random()')
    .limit(count);

  if (error || !data || data.length < count) {
    const backup = [
      "Selfie avec un objet bleu",
      "Photo d'un animal",
      "Photo d'une ombre"
    ];
    return backup.sort(() => 0.5 - Math.random()).slice(0, count);
  }
  return data.map(x => x.texte);
}

async function getRoom(roomId) {
  const { data } = await supabase.from('duels').select('*').eq('id', roomId).single();
  return data;
}

async function getPhotoDuel(roomId, champ, idx) {
  const cacheKey = `${roomId}_${champ}_${idx}`;
  let dataUrl = await VFindDuelDB.get(cacheKey);
  if (dataUrl) return dataUrl;
  const room = await getRoom(roomId);
  dataUrl = room && room[champ] && room[champ][idx];
  if (dataUrl) await VFindDuelDB.set(cacheKey, dataUrl);
  return dataUrl;
}

// Fermer la popup (bouton croix, général)
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.close-btn, #close-popup').forEach(btn => {
    btn.onclick = function() {
      let popup = btn.closest('.popup');
      if (popup) {
        popup.classList.add('hidden');
        popup.classList.remove('show');
      }
    };
  });
});
