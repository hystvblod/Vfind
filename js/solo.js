import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { db } from "./firebase.js";
import { getJetons, removeJeton, getCadreSelectionne, updateUserData, getUserDataCloud } from "./userData.js";
import { ouvrirCameraPour as cameraOuvrirCameraPour } from "./camera.js";

// MAJ solde points et jetons dès chargement
document.addEventListener("DOMContentLoaded", async () => {
  const data = await getUserDataCloud();
  if (document.getElementById("points")) document.getElementById("points").textContent = data.points || 0;
  if (document.getElementById("jetons")) document.getElementById("jetons").textContent = data.jetons || 0;
});

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const replayBtn = document.getElementById("replayBtn");
  const preGame = document.getElementById("pre-game");
  const gameSection = document.getElementById("game-section");
  const endSection = document.getElementById("end-section");
  const timerDisplay = document.getElementById("timer");
  const defiList = document.getElementById("defi-list");

  let allDefis = [];
  let defiIndexActuel = null;

  let userLang = navigator.language || navigator.userLanguage;
  userLang = userLang.split("-")[0];
  const supportedLangs = ["fr", "en", "es", "de", "it", "nl", "pt", "ar", "ja", "ko"];
  const savedLang = localStorage.getItem("langue");
  if (savedLang && supportedLangs.includes(savedLang)) userLang = savedLang;
  if (!supportedLangs.includes(userLang)) userLang = "fr";

  window.ouvrirCameraPour = (defiId) => cameraOuvrirCameraPour(defiId, "solo");

  getDocs(collection(db, "defis"))
    .then(snapshot => {
      allDefis = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          texte: userLang === "fr" ? d.intitule : d[userLang],
          done: false
        };
      });
      init();
    })
    .catch(err => {
      console.error("❌ Erreur Firestore :", err);
    });

  async function init() {
    startBtn?.addEventListener("click", startGame);
    replayBtn?.addEventListener("click", showStart);

    const data = await getUserDataCloud();
    if (!data.defiActifs || !Array.isArray(data.defiActifs) || data.defiActifs.length === 0) {
      showStart();
    } else if (data.defiTimer && Date.now() < data.defiTimer) {
      showGame();
    } else {
      showStart();
    }
  }

  async function startGame() {
    const newDefis = getRandomDefis(3);
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    await updateUserData({ defiActifs: newDefis, defiTimer: endTime });
    showGame();
  }

  function getRandomDefis(n) {
    const shuffled = [...allDefis].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n).map(defi => ({ ...defi, done: false }));
  }

  function showGame() {
    preGame.classList.add("hidden");
    endSection.classList.add("hidden");
    gameSection.classList.remove("hidden");
    updateTimer();
    loadDefis();
  }

  function showStart() {
    preGame.classList.remove("hidden");
    gameSection.classList.add("hidden");
    endSection.classList.add("hidden");
  }

  function updateTimer() {
    const interval = setInterval(async () => {
      const data = await getUserDataCloud();
      const endTime = data.defiTimer;
      if (!endTime) return;
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        endGame();
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      timerDisplay.textContent = `${h}h ${m}m ${s}s`;
    }, 1000);
  }

  async function loadDefis() {
    const data = await getUserDataCloud();
    let defis = data.defiActifs || [];
    if (!defis || !Array.isArray(defis) || defis.length === 0) {
      defiList.innerHTML = '<li class="defi-vide">Aucun défi à afficher. Clique sur "Lancer une partie".</li>';
      return;
    }
    defiList.innerHTML = '';
    let photosMap = {};
    for (let index = 0; index < defis.length; index++) {
      const defi = defis[index];
      const li = document.createElement("li");
      li.className = "defi-item";
      if (defi.done) li.classList.add("done");
      li.setAttribute("data-defi-id", defi.id);

      let dataUrl = localStorage.getItem(`photo_defi_${defi.id}`);

      if (!dataUrl) {
        try {
          const userData = await getUserDataCloud();
          const defisSolo = userData.defisSolo || {};
          if (defisSolo[defi.id]) {
            dataUrl = defisSolo[defi.id];
            localStorage.setItem(`photo_defi_${defi.id}`, dataUrl);
          }
        } catch (e) {
          console.warn("⚠️ Impossible de charger la photo depuis Firebase", e);
        }
      }
      photosMap[defi.id] = dataUrl || null;

      const hasPhoto = !!dataUrl;
      const boutonTexte = hasPhoto ? "📸 Reprendre une photo" : "📸 Prendre une photo";
      const boutonPhoto = `
  <img
    src="assets/icons/photo.svg"
    alt="Prendre une photo"
    style="width:2.2em;cursor:pointer;display:block;margin:0 auto;"
    onclick="window.ouvrirCameraPour('${defi.id}')"
  >
`;


      li.innerHTML = `
        <div class="defi-content">
          <div class="defi-texte">
            <p>${defi.texte}</p>
            ${boutonPhoto}
          </div>
          <div class="defi-photo-container" data-photo-id="${defi.id}"></div>
        </div>
        ${!hasPhoto ? `<img src="assets/img/jeton_p.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />` : ''}
      `;

      defiList.appendChild(li);
    }
    await afficherPhotosSauvegardees(photosMap);
  }

  // ✅✅✅ PATCH STRUCTURE MINIATURE CORRECTE
  async function afficherPhotosSauvegardees(photosMap) {
    const cadreActuel = await getCadreSelectionne();

    document.querySelectorAll(".defi-item").forEach(defiEl => {
      const id = defiEl.getAttribute("data-defi-id");
      const dataUrl = photosMap[id];

      if (dataUrl) {
        // Structure CORRECTE comme avant :
        const containerCadre = document.createElement("div");
        containerCadre.className = "cadre-item cadre-duel-mini";

        const preview = document.createElement("div");
        preview.className = "cadre-preview";

        const fond = document.createElement("img");
        fond.className = "photo-cadre";
        fond.src = `./assets/cadres/${cadreActuel}.webp`;

        const photo = document.createElement("img");
        photo.className = "photo-user";
        photo.src = dataUrl;
        photo.onclick = () => agrandirPhoto(dataUrl, id);

        preview.appendChild(fond);
        preview.appendChild(photo);
        containerCadre.appendChild(preview);

        const container = defiEl.querySelector(`[data-photo-id="${id}"]`);
        if (container) {
          container.innerHTML = '';
          container.appendChild(containerCadre); // ✅ le parent .cadre-item est bien là
          defiEl.classList.add("done");
        }
      }
    });
  }

  async function agrandirPhoto(dataUrl, id) {
    const cadreActuel = await getCadreSelectionne();
    document.getElementById("photo-affichee").src = dataUrl;
    document.getElementById("cadre-affiche").src = `./assets/cadres/${cadreActuel}.webp`;

    const popup = document.getElementById("popup-photo");
    popup.classList.remove("hidden");
    popup.classList.add("show");
  }

  window.validerDefi = async function(index) {
    const data = await getUserDataCloud();
    let defis = data.defiActifs || [];
    if (!defis[index].done) {
      defis[index].done = true;
      await updateUserData({ defiActifs: defis });
      await loadDefis();
    }
  };

  window.ouvrirPopupJeton = async function(index) {
    const jetons = await getJetons();
    document.getElementById("solde-jeton").textContent = `Jetons disponibles : ${jetons}`;
    document.getElementById("popup-jeton").classList.remove("hidden");
    document.getElementById("popup-jeton").classList.add("show");
    defiIndexActuel = index;

    document.getElementById("valider-jeton-btn").onclick = async () => {
      const jetons = await getJetons();
      if (jetons > 0) {
        const success = await removeJeton();
        if (success) {
          if (typeof validerDefi === "function") {
            validerDefi(defiIndexActuel);
          }
          fermerPopupJeton();
        } else {
          alert("❌ Erreur lors de la soustraction du jeton.");
        }
      } else {
        alert("❌ Pas de jeton disponible.");
      }
    };
  };

  window.fermerPopupJeton = function () {
    document.getElementById("popup-jeton").classList.remove("show");
    document.getElementById("popup-jeton").classList.add("hidden");
  };

  window.afficherPhotoDansCadreSolo = async function(defiId, dataUrl) {
    if (!defiId || !dataUrl) return;
    localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
    await loadDefis();
  };

  document.addEventListener("photoAjouteeSolo", async () => {
    if (typeof loadDefis === "function") {
      await loadDefis();
    } else {
      window.location.reload();
    }
  });

  // === GESTION DE LA FIN DE PARTIE & POPUP PARTIE TERMINÉE ===
  window.endGame = async function() {
    // Récupère les défis et photos prises pour compter les pièces
    const data = await getUserDataCloud();
    let defis = data.defiActifs || [];
    let nbPhotos = 0;
    defis.forEach(defi => {
      const photoUrl = localStorage.getItem(`photo_defi_${defi.id}`);
      if (photoUrl) nbPhotos++;
    });
    let gain = nbPhotos * 10;
    if (nbPhotos === 3) gain = 40; // Bonus si 3 photos prises

    // Mets à jour le solde dans Firebase (ajoute les pièces)
    const oldPoints = data.points || 0;
    const newPoints = oldPoints + gain;
    await updateUserData({ points: newPoints, defiActifs: [], defiTimer: 0 }); // Réinitialise les défis

    // Affiche le popup de fin
    document.getElementById("gain-message").textContent =
      `+${gain} pièces (10/photo${nbPhotos === 3 ? " + 10 bonus" : ""})`;

    document.getElementById("popup-end").classList.remove("hidden");
    document.getElementById("popup-end").classList.add("show");

    // Met à jour le header points
    if (document.getElementById("points")) document.getElementById("points").textContent = newPoints;
  };

  // Bouton "Rejouer"
  document.getElementById("replayBtnEnd").onclick = async function() {
    document.getElementById("popup-end").classList.add("hidden");
    document.getElementById("popup-end").classList.remove("show");
    await startGame();
  };

  // Bouton "Retour" → demande confirmation avant
  document.getElementById("returnBtnEnd").onclick = function() {
    if (confirm("Quitter la partie ? Tu devras recommencer une nouvelle partie la prochaine fois.")) {
      window.location.href = "index.html";
    }
  };
});

// === Ajout : fermeture croix popup ===
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
