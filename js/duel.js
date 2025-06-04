// ==== duel.js (SUPABASE + MATCHMAKING SÉCURISÉ + POLLING LIVE) ====

import { supabase, getPseudo as getCurrentUser } from './userData.js';

// ========== IndexedDB cache (uniquement photos, pas de logique de jeu) ========== //
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
// ================================================================== //

// --------- Variables globales ---------
let currentRoomId = null;
let isPlayer1 = false;
let roomData = null;
let timerInterval = null;

// --------- Utilitaires ---------
function $(id) {
  return document.getElementById(id);
}

// --------- Matchmaking Duel (full Supabase) ---------
const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");
const path = window.location.pathname;

// =============== DUEL RANDOM ==============
if (path.includes("duel_random.html")) {
  (async () => {
    // Toujours repartir d'une base propre (évite poll sur une ancienne room supprimée)
    localStorage.removeItem("duel_random_room");
    localStorage.removeItem("duel_is_player1");

    const pseudo = await getCurrentUser();

    // Empêche plusieurs rooms par le même pseudo en "waiting"
    let { data: existing } = await supabase
      .from('duels')
      .select('*')
      .eq('player1', pseudo)
      .eq('status', 'waiting');
    if (existing && existing.length > 0) {
      // Nettoie les vieilles rooms qui traînent
      for (let r of existing) {
        await supabase.from('duels').delete().eq('id', r.id);
      }
    }

    // Recherche room d'un autre joueur en attente
    let { data: rooms } = await supabase
      .from('duels')
      .select('*')
      .eq('status', 'waiting')
      .neq('player1', pseudo);

    if (rooms && rooms.length > 0) {
      // Rejoint room
      const room = rooms[0];
      await supabase.from('duels').update({
        player2: pseudo,
        status: 'playing',
        starttime: Date.now()
      }).eq('id', room.id);

      localStorage.setItem("duel_random_room", room.id);
      localStorage.setItem("duel_is_player1", "0");
      window.location.href = `duel_game.html?room=${room.id}`;
    } else {
      // Crée nouvelle room
      const defis = await getRandomDefis();
      const roomObj = {
        player1: pseudo,
        player2: null,
        score1: 0,
        score2: 0,
        status: 'waiting',
        createdat: Date.now(),
        defis: defis,
        starttime: null,
        photosa: {},
        photosb: {}
      };

      const { data, error } = await supabase.from('duels').insert([roomObj]).select();
      if (error) {
        console.error("Erreur INSERT DUEL:", error);
        alert("Erreur création duel : " + error.message);
        return;
      }
      if (!data || !data[0]) {
        console.error("Aucune data renvoyée par l'insert duel", data);
        alert("Erreur technique création duel.");
        return;
      }
      localStorage.setItem("duel_random_room", data[0].id);
      localStorage.setItem("duel_is_player1", "1");

      // Attend le 2e joueur (poll toutes les 1.5s)
      const waitRoom = async () => {
        try {
          const { data: r, error } = await supabase.from('duels').select('*').eq('id', data[0].id).single();
          if (error) {
            console.error("Polling error:", error);
            setTimeout(waitRoom, 2000);
            return;
          }
          if (r && r.status === "playing") {
            window.location.href = `duel_game.html?room=${data[0].id}`;
          } else if (r && r.status === "waiting") {
            setTimeout(waitRoom, 1500);
          } else {
            alert("Room annulée ou supprimée.");
          }
        } catch (e) {
          console.error("Polling exception:", e);
          setTimeout(waitRoom, 2000);
        }
      };
      waitRoom();
    }
  })();
}

// =============== GAME DUEL ==============
if (path.includes("duel_game.html") && roomId) {
  currentRoomId = roomId;

  (async () => {
    const pseudo = await getCurrentUser();
    // Charge la room et découvre si player1 ou 2
    const room = await getRoom(roomId);
    isPlayer1 = (room.player1 === pseudo);
    subscribeRoom(roomId, (data) => {
      roomData = data;
      updateDuelUI();
    });
    // Initial render
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
    let advPseudo = "Adversaire";
    let advID = isPlayer1 ? roomData.player2 : roomData.player1;

    if (advID) advPseudo = advID;
    if ($("nom-adversaire")) $("nom-adversaire").textContent = advPseudo;
    if (roomData.starttime && $("timer")) startGlobalTimer(roomData.starttime);
    else if ($("timer")) $("timer").textContent = "--:--:--";

    let cadreActifMoi = "polaroid_01";
    let cadreActifAdv = "polaroid_01";
    renderDefis({ cadreActifMoi, cadreActifAdv });
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

  // --------- Affichage des défis + boutons + coeur ---------
  async function renderDefis({ cadreActifMoi, cadreActifAdv }) {
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
      titreJoueur.textContent = "Toi";
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
          renderDefis({ cadreActifMoi, cadreActifAdv }); // MAJ UI
        };
        preview.appendChild(coeurBtn);
        // ----------------------------------------

        cadreDiv.appendChild(preview);
        colJoueur.appendChild(cadreDiv);
      }

      // Boutons
      const btnRow = document.createElement('div');
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";
      btnRow.style.justifyContent = "center";
      btnRow.style.marginTop = "10px";

      // Jeton P
      const jetonBtn = document.createElement('button');
      jetonBtn.className = 'btn-jeton-p';
      jetonBtn.textContent = "🅿️";
      jetonBtn.title = "Valider avec un jeton";
      jetonBtn.onclick = () => alert("Jeton P utilisé !");
      btnRow.appendChild(jetonBtn);

      // Bouton photo
      const photoBtn = document.createElement('button');
      photoBtn.textContent = myPhoto ? "📸 Reprendre une photo" : "📸 Prendre une photo";
      photoBtn.onclick = () => ouvrirCameraPourDuel(idx);
      btnRow.appendChild(photoBtn);

      colJoueur.appendChild(btnRow);

      // --- Colonne Adversaire (droite) ---
      const colAdv = document.createElement('div');
      colAdv.className = 'adversaire-col';
      const titreAdv = document.createElement('div');
      titreAdv.className = 'col-title';
      titreAdv.textContent = "Adversaire";
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

  // ==== Camera ==== //
  window.ouvrirCameraPourDuel = function(idx) {
    window.cameraOuvrirCameraPourDuel && window.cameraOuvrirCameraPourDuel(idx);
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

// ======== UTILS SUPABASE ========== //
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

async function getRandomDefis(count = 3) {
  return [
    "Selfie avec un objet bleu",
    "Photo d'un animal",
    "Photo d'une ombre"
  ].sort(() => 0.5 - Math.random()).slice(0, count);
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
