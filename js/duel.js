import { supabase, getPseudo as getCurrentUser, getUserId, getCadreSelectionne } from './userData.js';

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
  async set(key, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put({ key, dataUrl: data.url, cadre: data.cadre });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  },
  async get(key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').get(key);
      req.onsuccess = () => resolve(req.result ? { url: req.result.dataUrl, cadre: req.result.cadre } : null);
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

// Cadre spécifique pour chaque photo (stocké en localStorage : duel_cadres_specifiques)
function getCadreDuel(duelId, idx) {
  const data = JSON.parse(localStorage.getItem("duel_cadres_specifiques") || "{}");
  if (data[duelId] && data[duelId][idx]) return data[duelId][idx];
  // Par défaut : cadre sélectionné dans Mes cadres
  return window.getCadreSelectionneCached ? getCadreSelectionneCached() : "polaroid_01";
}
function setCadreDuel(duelId, idx, cadreId) {
  const data = JSON.parse(localStorage.getItem("duel_cadres_specifiques") || "{}");
  if (!data[duelId]) data[duelId] = {};
  data[duelId][idx] = cadreId;
  localStorage.setItem("duel_cadres_specifiques", JSON.stringify(data));
}

// ========= UPLOAD PRO : PHOTO → SUPABASE STORAGE + URL+CADRE DANS LA TABLE =========
export async function uploadPhotoDuelWebp(dataUrl, duelId, idx, cadreId) {
  function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], {type:mime});
  }
  const userId = getUserId ? getUserId() : (await getCurrentUser());
  const blob = dataURLtoBlob(dataUrl);
  const filePath = `duel_photos/${duelId}_${idx}_${userId}_${Date.now()}.webp`;

  // Upload photo dans le storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('photosduel')
    .upload(filePath, blob, { upsert: true, contentType: "image/webp" });
  if (uploadError) throw new Error("Erreur upload storage : " + uploadError.message);

  // Génère l’URL publique
  const { data: urlData } = supabase.storage.from('photosduel').getPublicUrl(filePath);
  const url = urlData.publicUrl;

  // Mets l’URL et le cadre dans la table duels
  const { data: room, error: roomError } = await supabase.from('duels').select('*').eq('id', duelId).single();
  if (roomError || !room) throw new Error("Room introuvable");
  const pseudo = await getCurrentUser();
  const champ = (room.player1 === pseudo) ? 'photosa' : 'photosb';
  let photos = room[champ] || {};
  photos[idx] = { url, cadre: cadreId };
  await supabase.from('duels').update({ [champ]: photos }).eq('id', duelId);

  // Mets l’URL+cadre dans le cache local
  await VFindDuelDB.set(`${duelId}_${champ}_${idx}`, { url, cadre: cadreId });

  // Mets le cadre en localStorage spécifique
  setCadreDuel(duelId, idx, cadreId);

  return url;
}

// --------- Fonctions COEURS LOCAUX (photos aimées DUEL) ---------
export function getPhotosAimeesDuel() {
  return JSON.parse(localStorage.getItem("photos_aimees_duel") || "[]");
}
export function aimerPhotoDuel(defiId) {
  let aimes = getPhotosAimeesDuel();
  if (!aimes.includes(defiId)) {
    aimes.push(defiId);
    localStorage.setItem("photos_aimees_duel", JSON.stringify(aimes));
  }
}
export function retirerPhotoAimeeDuel(defiId) {
  let aimes = getPhotosAimeesDuel();
  aimes = aimes.filter(id => id !== defiId);
  localStorage.setItem("photos_aimees_duel", JSON.stringify(aimes));
}

// --------- Variables globales ---------
export let currentRoomId = null;
export let isPlayer1 = false;
export let roomData = null;
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
export async function findOrCreateRoom() {
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

  const defis = await getDefisDuelFromSupabase(3);
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

// =============== GAME DUEL INITIALISATION (APPELER DEPUIS LA PAGE) ==============
export async function initDuelGame() {
  if (!(path.includes("duel_game.html") && roomId)) return;
  currentRoomId = roomId;
  window.currentRoomId = currentRoomId;

  const pseudo = await getCurrentUser();
  const room = await getRoom(roomId);
  isPlayer1 = (room.player1 === pseudo);
  subscribeRoom(roomId, (data) => {
    roomData = data;
    updateDuelUI();
  });
  roomData = await getRoom(roomId);
  updateDuelUI();

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

    renderDefis({ myID, advID });
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

  async function renderDefis({ myID, advID }) {
    const ul = $("duel-defi-list");
    if (!ul || !roomData || !roomData.defis || roomData.defis.length === 0) {
      if (ul) ul.innerHTML = `<li>Aucun défi.</li>`;
      return;
    }

    const myChamp = isPlayer1 ? 'photosa' : 'photosb';
    const advChamp = isPlayer1 ? 'photosb' : 'photosa';
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
      const myPhotoObj = await getPhotoDuel(roomId, myChamp, idxStr);
      const myPhoto = myPhotoObj ? myPhotoObj.url : null;
      const myCadre = myPhotoObj && myPhotoObj.cadre ? myPhotoObj.cadre : getCadreDuel(roomId, idxStr);

      if (myPhoto) {
        const cadreDiv = document.createElement("div");
        cadreDiv.className = "cadre-item cadre-duel-mini";
        const preview = document.createElement("div");
        preview.className = "cadre-preview";
        const cadreImg = document.createElement("img");
        cadreImg.className = "photo-cadre";
        cadreImg.src = "./assets/cadres/" + myCadre + ".webp";
        const photoImg = document.createElement("img");
        photoImg.className = "photo-user";
        photoImg.src = myPhoto;
        photoImg.onclick = () => agrandirPhoto(myPhoto, myCadre);
        // --- Appui long/chgt cadre ---
        photoImg.oncontextmenu = (e) => { e.preventDefault(); ouvrirPopupChoixCadre(roomId, idxStr, myChamp); };
        photoImg.ontouchstart = function(e) {
          this._touchTimer = setTimeout(() => { ouvrirPopupChoixCadre(roomId, idxStr, myChamp); }, 500);
        };
        photoImg.ontouchend = function() { clearTimeout(this._touchTimer); };

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
          renderDefis({ myID, advID });
        };
        preview.appendChild(coeurBtn);
        cadreDiv.appendChild(preview);
        colJoueur.appendChild(cadreDiv);
      }

      // ========== BOUTONS (JETON + PHOTO) ==========
      const btnRow = document.createElement('div');
      btnRow.className = "duel-btnrow-joueur";
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";
      btnRow.style.justifyContent = "center";
      btnRow.style.marginTop = "10px";

      // --- Jeton
      const jetonImg = document.createElement('img');
      jetonImg.src = "assets/img/jeton_p.webp";
      jetonImg.alt = "Valider avec un jeton";
      jetonImg.className = "jeton-icone btn-jeton-p";
      jetonImg.title = "Valider avec un jeton";
      jetonImg.style.cursor = "pointer";
      jetonImg.onclick = () => ouvrirPopupJeton(idx);
      btnRow.appendChild(jetonImg);

      // --- PHOTO
      const imgPhoto = document.createElement('img');
      imgPhoto.src = "assets/icons/photo.svg";
      imgPhoto.alt = "Prendre une photo";
      imgPhoto.style.width = "2.2em";
      imgPhoto.style.cursor = "pointer";
      imgPhoto.style.display = "block";
      imgPhoto.style.margin = "0 auto";
      imgPhoto.title = myPhoto ? "Reprendre la photo" : "Prendre une photo";
      imgPhoto.onclick = () => gererPrisePhotoDuel(idxStr, myCadre);
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
      const advPhotoObj = await getPhotoDuel(roomId, advChamp, idxStr);
      const advPhoto = advPhotoObj ? advPhotoObj.url : null;
      const advCadre = advPhotoObj && advPhotoObj.cadre ? advPhotoObj.cadre : "polaroid_01";

      if (advPhoto) {
        const cadreDiv = document.createElement("div");
        cadreDiv.className = "cadre-item cadre-duel-mini";
        const preview = document.createElement("div");
        preview.className = "cadre-preview";
        const cadreImg = document.createElement("img");
        cadreImg.className = "photo-cadre";
        cadreImg.src = "./assets/cadres/" + advCadre + ".webp";
        const photoImg = document.createElement("img");
        photoImg.className = "photo-user";
        photoImg.src = advPhoto;
        photoImg.onclick = () => agrandirPhoto(advPhoto, advCadre);
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
}

// ==== Fonctions Camera/Popup à exporter pour camera.js ====
// -> Appelle caméra avec cadre par défaut ou spécifique
export function gererPrisePhotoDuel(idx, cadreId = null) {
  let duelId = currentRoomId || window.currentRoomId || roomId;
  if (!duelId) {
    alert("Erreur critique : identifiant duel introuvable.");
    return;
  }
  // Si pas précisé, prend le cadre par défaut pour ce duel/photo
  if (!cadreId) cadreId = getCadreDuel(duelId, idx);
  window.cameraOuvrirCameraPourDuel && window.cameraOuvrirCameraPourDuel(idx, duelId, cadreId);
}

// Changement de cadre après la photo (popup simple via prompt)
window.ouvrirPopupChoixCadre = async function(duelId, idx, champ) {
  // Récupère les cadres possédés
  const cadres = (await import('./userData.js')).getCadresPossedes ? await (await import('./userData.js')).getCadresPossedes() : ["polaroid_01"];
  const actuel = getCadreDuel(duelId, idx);
  let choix = prompt(
    "ID du cadre à appliquer (ex: polaroid_01) :\n" +
    cadres.map(c => (c === actuel ? `[${c}]` : c)).join('\n'),
    actuel
  );
  if (choix && cadres.includes(choix)) {
    setCadreDuel(duelId, idx, choix);
    // Mise à jour cloud pour joueur/adversaire
    const { data: room } = await supabase.from('duels').select('*').eq('id', duelId).single();
    let photos = (room && room[champ]) ? room[champ] : {};
    if (photos[idx] && typeof photos[idx] === "object") {
      photos[idx].cadre = choix;
    } else if (typeof photos[idx] === "string") {
      // Cas migration (ancien format)
      photos[idx] = { url: photos[idx], cadre: choix };
    }
    await supabase.from('duels').update({ [champ]: photos }).eq('id', duelId);
    await VFindDuelDB.set(`${duelId}_${champ}_${idx}`, { url: photos[idx].url, cadre: choix });
    alert("✅ Nouveau cadre appliqué !");
    location.reload();
  }
};

export async function savePhotoDuel(idx, url, cadreId = null) {
  const champ = isPlayer1 ? 'photosa' : 'photosb';
  if (!cadreId) cadreId = getCadreDuel(roomId, idx);
  const room = await getRoom(roomId);
  let photos = room[champ] || {};
  photos[idx] = { url, cadre: cadreId };
  await supabase.from('duels').update({ [champ]: photos }).eq('id', roomId);
  await VFindDuelDB.set(`${roomId}_${champ}_${idx}`, { url, cadre: cadreId });
  setCadreDuel(roomId, idx, cadreId);
}

export function agrandirPhoto(url, cadre) {
  $("photo-affichee").src = url;
  $("cadre-affiche").src = `./assets/cadres/${cadre}.webp`;
  const popup = $("popup-photo");
  popup.classList.remove('hidden');
  popup.classList.add('show');
}

export async function cleanupDuelPhotos() {
  await VFindDuelDB.deleteAllForRoom(roomId);
}

// ======== UTILS SUPABASE ==========

async function getDefisDuelFromSupabase(count = 3) {
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
  let obj = await VFindDuelDB.get(cacheKey);
  if (obj && obj.url) return obj;
  const room = await getRoom(roomId);
  let url, cadre;
  if (room && room[champ] && room[champ][idx]) {
    if (typeof room[champ][idx] === "object") {
      url = room[champ][idx].url;
      cadre = room[champ][idx].cadre;
    } else {
      url = room[champ][idx];
      cadre = "polaroid_01";
    }
  }
  if (url) {
    await VFindDuelDB.set(cacheKey, { url, cadre });
    return { url, cadre };
  }
  return null;
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

// =========== PATCH ULTRA IMPORTANT =============
// Appelle automatiquement l'init Duel sur la bonne page
if (window.location.pathname.includes("duel_game.html")) {
  initDuelGame();
}
// Popup graphique de choix de cadre (remplace le prompt)
window.ouvrirPopupChoixCadre = async function(duelId, idx, champ) {
  // Récupère les cadres possédés
  let cadres = [];
  try {
    cadres = (await import('./userData.js')).getCadresPossedes
      ? await (await import('./userData.js')).getCadresPossedes()
      : ["polaroid_01"];
  } catch(e) { cadres = ["polaroid_01"]; }

  const actuel = getCadreDuel(duelId, idx);
  const list = document.getElementById("list-cadres-popup");
  list.innerHTML = "";
  cadres.forEach(cadre => {
    let el = document.createElement("img");
    el.src = "./assets/cadres/" + cadre + ".webp";
    el.style.width = "72px";
    el.style.cursor = "pointer";
    el.style.borderRadius = "12px";
    el.style.boxShadow = "0 0 7px #0006";
    el.style.border = cadre === actuel ? "3px solid #FFD900" : "3px solid transparent";
    el.title = cadre;
    el.onclick = async () => {
      setCadreDuel(duelId, idx, cadre);
      // Mise à jour cloud (Supabase)
      const { data: room } = await supabase.from('duels').select('*').eq('id', duelId).single();
      let photos = (room && room[champ]) ? room[champ] : {};
      if (photos[idx] && typeof photos[idx] === "object") {
        photos[idx].cadre = cadre;
      } else if (typeof photos[idx] === "string") {
        photos[idx] = { url: photos[idx], cadre: cadre };
      }
      await supabase.from('duels').update({ [champ]: photos }).eq('id', duelId);
      await VFindDuelDB.set(`${duelId}_${champ}_${idx}`, { url: photos[idx].url, cadre: cadre });
      fermerPopupCadreChoix();
      location.reload();
    };
    list.appendChild(el);
  });
  document.getElementById("popup-cadre-choix").classList.remove("hidden");
};

window.fermerPopupCadreChoix = function() {
  document.getElementById("popup-cadre-choix").classList.add("hidden");
};
