document.addEventListener("DOMContentLoaded", () => {
  function getUserData() {
    return {
      premium: localStorage.getItem("premium") === "true"
    };
  }

  const DEFI_STORAGE_KEY = "vfind_defis";
  const TIMER_STORAGE_KEY = "vfind_timer";
  const SCORE_STORAGE_KEY = "vfind_score";
  const PUB_USED_KEY = "vfind_pub_used";
  const HISTORY_KEY = "vfind_historique";

  const startBtn = document.getElementById("startBtn");
  const replayBtn = document.getElementById("replayBtn");
  const preGame = document.getElementById("pre-game");
  const gameSection = document.getElementById("game-section");
  const endSection = document.getElementById("end-section");
  const timerDisplay = document.getElementById("timer");
  const defiList = document.getElementById("defi-list");
  const finalMessage = document.getElementById("final-message");

  let allDefis = [];
  let defisActuels = [];

  let userLang = navigator.language || navigator.userLanguage;
  userLang = userLang.split("-")[0];
  const supportedLangs = ["fr", "en", "es", "de", "it", "nl", "pt", "ar", "ja", "ko"];
  let currentLang = supportedLangs.includes(userLang) ? userLang : "fr";
  const savedLang = localStorage.getItem("langue");
  if (savedLang && supportedLangs.includes(savedLang)) {
    currentLang = savedLang;
  }

  const cadreActuel = getCadreSelectionne();

  fetch("./data/defis.json")
    .then((res) => res.json())
    .then((data) => {
      allDefis = data.defis.map(d => ({
        id: d.id,
        texte: currentLang === "fr" ? d.intitule : d[currentLang],
        done: false
      }));
      init();
    })
    .catch(err => {
      console.error("❌ Erreur de chargement du fichier defis.json :", err);
    });

  function init() {
    startBtn?.addEventListener("click", startGame);
    replayBtn?.addEventListener("click", showStart);

    const existingTimer = localStorage.getItem(TIMER_STORAGE_KEY);
    if (existingTimer && Date.now() < parseInt(existingTimer)) {
      showGame();
    } else {
      showStart();
    }
  }

  function startGame() {
    const newDefis = getRandomDefis(3);
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DEFI_STORAGE_KEY, JSON.stringify(newDefis));
    localStorage.setItem(TIMER_STORAGE_KEY, endTime.toString());
    localStorage.setItem(SCORE_STORAGE_KEY, "0");
    localStorage.setItem(PUB_USED_KEY, "false");
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

  function updateTimer() {
    const interval = setInterval(() => {
      const endTimeRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!endTimeRaw) return;

      const endTime = parseInt(endTimeRaw);
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        endGame();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (timerDisplay) {
        timerDisplay.textContent = `${hours}h ${minutes}m ${seconds}s`;
      }
    }, 1000);
  }

  function loadDefis() {
    let defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
    if (!defis || !Array.isArray(defis) || defis.length === 0) {
      defis = getRandomDefis(3);
      localStorage.setItem(DEFI_STORAGE_KEY, JSON.stringify(defis));
    }

    defisActuels = defis;
    defiList.innerHTML = '';
    defis.forEach((defi, index) => {
      const li = document.createElement("li");
      li.className = "defi-item";
      if (defi.done) li.classList.add("done");
      li.setAttribute("data-defi-id", defi.id);

      const isPremium = getUserData().premium === true;
      const hasPhoto = !!localStorage.getItem(`photo_defi_${defi.id}`);
      const jetonValide = localStorage.getItem(`defi_jeton_${defi.id}`) === "1";
      const boutonTexte = hasPhoto ? "📸 Reprendre une photo" : "📸 Prendre une photo";

      let boutonPhoto = "";

      if (hasPhoto && !isPremium) {
        boutonPhoto = `<button class="disabled-premium" onclick="alert('❌ Fonction réservée aux membres premium.')">🔒 ${boutonTexte}</button>`;
      } else {
        boutonPhoto = `<button onclick="ouvrirCameraPour(${defi.id})">${boutonTexte}</button>`;
      }

      li.innerHTML = `
        <div class="defi-content">
          <div class="defi-texte">
            <p>${defi.texte}</p>
            ${boutonPhoto}
          </div>
          <div class="defi-photo-container" data-photo-id="${defi.id}"></div>
        </div>
        ${!hasPhoto && !jetonValide ? `<img src="assets/img/jetonpp.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />` : ''}
      `;

      defiList.appendChild(li);
    });

    afficherPhotosSauvegardees();
  }

  function updateJetonsDisplay() {
    const data = getUserData();
    const jetonsSpan = document.getElementById("jetons");
    if (jetonsSpan) {
      jetonsSpan.textContent = data.jetons || 0;
    }
  }

  function afficherPhotosSauvegardees() {
    const cadreActuel = getCadreSelectionne();

    document.querySelectorAll(".defi-item").forEach(defiEl => {
      const id = defiEl.getAttribute("data-defi-id");
      const jetonValide = localStorage.getItem(`defi_jeton_${id}`) === "1";
      const dataUrl = localStorage.getItem(`photo_defi_${id}`);

      const containerCadre = document.createElement("div");
      containerCadre.className = "cadre-item";

      const preview = document.createElement("div");
      preview.className = "cadre-preview";

      const fond = document.createElement("img");
      fond.className = "photo-cadre";
      fond.src = `./assets/cadres/${cadreActuel}.webp`;

      const photo = document.createElement("img");
      photo.className = "photo-user";
      if (jetonValide) {
        photo.src = "assets/img/jetonpp.webp";
        photo.classList.add("jeton-inside");
        photo.style.objectFit = "contain";
        photo.style.background = "rgba(255,220,100,0.1)";
        photo.onclick = null;
      } else if (dataUrl) {
        photo.src = dataUrl;
        photo.onclick = () => agrandirPhoto(dataUrl, id);
      } else {
        photo.src = "photos/photo_joueurA.jpg";
        photo.onclick = null;
      }

      preview.appendChild(fond);
      preview.appendChild(photo);
      containerCadre.appendChild(preview);

      const container = defiEl.querySelector(`[data-photo-id="${id}"]`);
      if (container) {
        container.innerHTML = '';
        container.appendChild(containerCadre);
        defiEl.classList.add("done");
      }
    });
  }

  // ✅ FIN DE PARTIE SOLO : Statistiques illimitées, photos limitées
  function endGame() {
    const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
    const date = new Date().toLocaleString("fr-FR");

    // -- HISTORIQUE --
    const historique = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    historique.unshift({
      date,
      defis: defis.map((d) => d.texte),
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historique));

    // -- MÉNAGE PHOTOS : On garde photos que pour 7 dernières sessions --
    const MAX_PHOTO_DAYS = 7;
    const sessionsToDelete = historique.slice(MAX_PHOTO_DAYS);
    sessionsToDelete.forEach(session => {
      if (session.defis) {
        session.defis.forEach(texte => {
          // Ici, on pourrait supprimer les photos anciennes
        });
      }
    });

    localStorage.removeItem(DEFI_STORAGE_KEY);
    localStorage.removeItem(TIMER_STORAGE_KEY);
    localStorage.removeItem(PUB_USED_KEY);
    localStorage.removeItem(SCORE_STORAGE_KEY);

    gameSection.classList.add("hidden");
    endSection.classList.remove("hidden");
    finalMessage.textContent = `Tu as terminé tous les défis !`;
  }

  function showStart() {
    preGame.classList.remove("hidden");
    gameSection.classList.add("hidden");
    endSection.classList.add("hidden");
  }

  function agrandirPhoto(dataUrl, id) {
    const cadreActuel = getCadreSelectionne();
    document.getElementById("photo-affichee").src = dataUrl;
    document.getElementById("cadre-affiche").src = `./assets/cadres/${cadreActuel}.webp`;

    const popup = document.getElementById("popup-photo");
    popup.classList.remove("hidden");
    popup.classList.add("show");
  }

  const popup = document.getElementById("popup-photo");
  const closeBtn = document.getElementById("close-popup");

  if (popup && closeBtn) {
    closeBtn.addEventListener("click", () => {
      popup.classList.remove("show");
      popup.classList.add("hidden");
    });

    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.classList.remove("show");
        popup.classList.add("hidden");
      }
    });
  }

  // ----------- AJOUT ICI : prise en compte jeton lors validation ----------
  window.validerDefi = function(index, viaJeton = false) {
    const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
    if (!defis[index].done) {
      defis[index].done = true;
      localStorage.setItem(DEFI_STORAGE_KEY, JSON.stringify(defis));
      document.querySelectorAll("#defi-list li")[index]?.classList.add("done");
      if (viaJeton) {
        localStorage.setItem(`defi_jeton_${defis[index].id}`, "1");
      }
      loadDefis();
    }
  };

  window.validerAvecPub = function(index) {
    alert("✅ Merci d’avoir regardé la pub !");
    setTimeout(() => {
      localStorage.setItem(PUB_USED_KEY, "true");
      validerDefi(index);
    }, 3000);
  };

  window.ouvrirPopupJeton = function(index) {
    const jetons = getJetons();
    document.getElementById("solde-jeton").textContent = `Jetons disponibles : ${jetons}`;
    document.getElementById("popup-jeton").classList.remove("hidden");
    document.getElementById("popup-jeton").classList.add("show");
    defiIndexActuel = index;

    document.getElementById("valider-jeton-btn").onclick = () => {
      const jetons = getJetons();
      if (jetons > 0) {
        const success = removeJeton();
        if (success) {
          updateJetonsDisplay();
          if (typeof validerDefi === "function") {
            validerDefi(defiIndexActuel, true); // <--- validation par jeton !
          }
          fermerPopupJeton();
        } else {
          alert("❌ Erreur lors de la soustraction du jeton.");
        }
      } else {
        alert("❌ Pas de jeton disponible. Achetez-en dans la boutique.");
      }
    };
  };

  window.fermerPopupJeton = function () {
    document.getElementById("popup-jeton").classList.remove("show");
    document.getElementById("popup-jeton").classList.add("hidden");
  };
});
