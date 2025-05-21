import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { db } from "./firebase.js";
import { getJetons, removeJeton, getCadreSelectionne, updateUserData, getUserDataCloud } from "./userData.js";
import { ouvrirCameraPour as cameraOuvrirCameraPour } from "./camera.js";

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const replayBtn = document.getElementById("replayBtn");
  const preGame = document.getElementById("pre-game");
  const gameSection = document.getElementById("game-section");
  const endSection = document.getElementById("end-section");
  const timerDisplay = document.getElementById("timer");
  const defiList = document.getElementById("defi-list");

  let allDefis = [];
  let defisActuels = [];
  let defiIndexActuel = null;

  let userLang = navigator.language || navigator.userLanguage;
  userLang = userLang.split("-")[0];
  const supportedLangs = ["fr", "en", "es", "de", "it", "nl", "pt", "ar", "ja", "ko"];
  const savedLang = localStorage.getItem("langue");
  if (savedLang && supportedLangs.includes(savedLang)) userLang = savedLang;
  if (!supportedLangs.includes(userLang)) userLang = "fr";

  // Expose la fonction caméra pour le HTML dynamique
  window.ouvrirCameraPour = cameraOuvrirCameraPour;

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
    if (data.defiTimer && Date.now() < data.defiTimer && data.defiActifs) {
      defisActuels = data.defiActifs;
      showGame();
    } else {
      showStart();
    }
  }

  async function startGame() {
    const newDefis = getRandomDefis(3);
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    defisActuels = newDefis;
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
    defiList.innerHTML = '';
    for (const [index, defi] of defisActuels.entries()) {
      const li = document.createElement("li");
      li.className = "defi-item";
      if (defi.done) li.classList.add("done");
      li.setAttribute("data-defi-id", defi.id);

      const hasPhoto = !!localStorage.getItem(`photo_defi_${defi.id}`);
      const boutonTexte = hasPhoto ? "📸 Reprendre une photo" : "📸 Prendre une photo";

      const boutonPhoto = `<button onclick="window.ouvrirCameraPour('${defi.id}')">${boutonTexte}</button>`;

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

    await afficherPhotosSauvegardees();
  }

  async function afficherPhotosSauvegardees() {
    const cadreActuel = await getCadreSelectionne();

    document.querySelectorAll(".defi-item").forEach(defiEl => {
      const id = defiEl.getAttribute("data-defi-id");
      const dataUrl = localStorage.getItem(`photo_defi_${id}`);

      if (dataUrl) {
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

        const container = defiEl.querySelector(`[data-photo-id="${id}"]`);
        if (container) {
          container.innerHTML = '';
          container.appendChild(preview);
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
    if (!defisActuels[index].done) {
      defisActuels[index].done = true;
      await updateUserData({ defiActifs: defisActuels });
      document.querySelectorAll("#defi-list li")[index]?.classList.add("done");
      loadDefis();
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
});
