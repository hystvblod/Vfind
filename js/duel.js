import {
  getCadreSelectionne,
  getJetons,
  removeJeton,
  // ... (toutes les fonctions userData.js dont tu as besoin)
} from './userData.js';

document.addEventListener("DOMContentLoaded", async () => {
  // Récupère le mode et l'adversaire depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "random";
  const adversaire = params.get("adversaire") || (mode === "random" ? "Adversaire mystère" : "Ton ami");

  const defiList = document.getElementById("duel-defi-list");
  const cadre = await getCadreSelectionne();
  await updateJetonsDisplay();

  // Affiche le nom de l'adversaire sur la page si tu as un endroit prévu :
  const advName = document.getElementById("nom-adversaire");
  if (advName) advName.textContent = adversaire;

  // ⚡️ A REMPLACER PAR DES APPELS FIRESTORE (ici, on suppose temporairement un objet global window.photosDuel)
  window.photosDuel = window.photosDuel || {}; // idDefi -> { photoA, photoB, jetonValide }
  // Tu pourras remplacer cette variable par de vrais appels cloud par la suite !

  fetch("data/defis.json")
    .then(res => res.json())
    .then(async data => {
      const defis = data.defis.slice(0, 3);
      defiList.innerHTML = "";

      for (let index = 0; index < defis.length; index++) {
        const defi = defis[index];
        const id = defi.id;
        const texte = defi.intitule;

        // À terme, récupère ces valeurs depuis Firestore :
        const entry = window.photosDuel[id] || {};
        const photoA = entry.photoA || null;
        const photoB = entry.photoB || null;
        const jetonValide = !!entry.jetonValide;
        const advHasPhoto = !!photoB;

        const boutonTexte = photoA ? "📸 Reprendre une photo" : "📸 Prendre une photo";
        const boutonSignaler = advHasPhoto
          ? `<button class="btn-flag" onclick="alert('Photo signalée. Merci pour ton retour.')">🚩 Signaler</button>`
          : "";

        const boutonPhoto = `<button onclick="ouvrirCameraPour(${id})">${boutonTexte}</button>`;
        const jetonHTML = (!photoA && !jetonValide)
          ? `<img src="assets/img/jeton_p.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />`
          : "";

        const html = `
          <p style="text-align:center; font-weight:bold; font-size:1.3rem;">${texte}</p>
          <div class="defi-content split">
            <div class="joueur-col">
              <span class="col-title">Toi</span>
              <div class="defi-photo-container" data-photo-joueur="${id}"></div>
              ${boutonPhoto}
              ${jetonHTML}
            </div>
            <div class="adversaire-col">
              <span class="col-title">${adversaire}</span>
              <div class="defi-photo-container" data-photo-adversaire="${id}"></div>
              ${boutonSignaler}
            </div>
          </div>
        `;

        const li = document.createElement("li");
        li.className = "defi-item";
        li.setAttribute("data-defi-id", id);
        li.innerHTML = html;
        defiList.appendChild(li);
      }

      await afficherPhotosCadresDuel(cadre, mode);
    });

  async function afficherPhotosCadresDuel(cadre, mode) {
    document.querySelectorAll(".defi-item").forEach(defiEl => {
      const id = defiEl.getAttribute("data-defi-id");
      const entry = window.photosDuel[id] || {};
      const photoA = entry.photoA;
      const photoB = entry.photoB;

      if (photoA) {
        const container = defiEl.querySelector(`[data-photo-joueur="${id}"]`);
        if (container) {
          container.innerHTML = `
            <div class="cadre-preview">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre" />
              <img src="${photoA}" class="photo-user" onclick="toggleFit(this)">
            </div>
          `;
        }
      }

      if (photoB) {
        const container = defiEl.querySelector(`[data-photo-adversaire="${id}"]`);
        if (container) {
          container.innerHTML = `
            <div class="cadre-preview">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre" />
              <img src="${photoB}" class="photo-user" onclick="toggleFit(this)">
            </div>
          `;
        }
      }
    });
  }

  async function updateJetonsDisplay() {
    const jetonsSpan = document.getElementById("jetons");
    if (jetonsSpan) {
      jetonsSpan.textContent = await getJetons();
    }
  }

  window.toggleFit = function(img) {
    img.classList.toggle("cover");
    img.classList.toggle("contain");
  };

  let defiIndexActuel = null;

  window.ouvrirPopupJeton = async function (index) {
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
          await updateJetonsDisplay();
          if (typeof validerDefi === "function") {
            validerDefi(defiIndexActuel, true);
          }
          fermerPopupJeton();
        } else {
          alert("❌ Erreur lors du retrait du jeton.");
        }
      } else {
        alert("❌ Pas de jeton disponible. Rendez-vous dans la boutique !");
      }
    };
  };

  window.fermerPopupJeton = function () {
    document.getElementById("popup-jeton").classList.remove("show");
    document.getElementById("popup-jeton").classList.add("hidden");
  };

  let defisDuelValides = [null, null, null];

  window.validerDefi = async function(index, viaJeton = false) {
    const defis = document.querySelectorAll("#duel-defi-list li");
    const li = defis[index];
    const id = li.getAttribute("data-defi-id");
    const photoA = window.photosDuel[id]?.photoA; // Récupère photo cloud ou JS RAM ici
    if (!photoA && !viaJeton) return;

    li.classList.add("done");
    if (viaJeton) {
      // ⚡️ Mets à jour cloud ici l'info de jeton utilisé pour ce défi si tu veux la synchro (Firestore)
      window.photosDuel[id] = window.photosDuel[id] || {};
      window.photosDuel[id].jetonValide = true;
    }
    const texteDefi = li.querySelector("p").textContent.trim();
    defisDuelValides[index] = texteDefi;

    setTimeout(() => {
      alert("✅ Merci d’avoir regardé la pub !");
      if (defisDuelValides.every(Boolean)) {
        enregistrerDuelHistorique(defisDuelValides);
        defisDuelValides = [null, null, null];
      }
      window.location.reload();
    }, 2000);
  };

  // ⚡️ Ici aussi, tu devrais migrer sur Firestore la sauvegarde des duels
  function enregistrerDuelHistorique(defisValides) {
    // TODO: Créer/mettre à jour dans Firestore, pas localStorage !
    // Par exemple, ajoute une entrée dans "users/{uid}/historiqueDuels"
    console.log("Historique du duel (à stocker Firestore):", defisValides);
  }

  // ============ TIMER DUEL 24H =============
  const duelTimerEl = document.getElementById("timer");

  function initDuelTimer() {
    // Pour la version cloud, stocke l'info de dernier duel en Firestore !
    let endTime = window.duelEndTime || null; // À brancher cloud
    const now = Date.now();

    if (!endTime || now > parseInt(endTime)) {
      endTime = now + 24 * 60 * 60 * 1000;
      window.duelEndTime = endTime; // Stocke cloud plus tard !
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = parseInt(endTime) - now;

      if (remaining <= 0) {
        clearInterval(interval);
        if (duelTimerEl) duelTimerEl.textContent = "00:00:00";
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (duelTimerEl) {
        duelTimerEl.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
    }, 1000);
  }

  initDuelTimer();
});
