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

// 🔤 Détection de la langue
let userLang = navigator.language || navigator.userLanguage;
userLang = userLang.split("-")[0];
const supportedLangs = ["fr", "en", "es", "de", "it", "nl", "pt", "ar", "ja", "ko"];
let currentLang = supportedLangs.includes(userLang) ? userLang : "fr";
const savedLang = localStorage.getItem("langue");
if (savedLang && supportedLangs.includes(savedLang)) {
  currentLang = savedLang;
}

// 🟦 Chargement des défis
document.addEventListener("DOMContentLoaded", () => {
  fetch("./data/defis.json")
    .then((res) => res.json())
    .then((data) => {
      allDefis = data.defis.map(d => ({
        id: d.id,
        texte: currentLang === "fr" ? d.intitule : d[currentLang],
        done: false
      }));
      console.log("✅ Défis chargés :", allDefis);
      init();
    })
    .catch(err => {
      console.error("❌ Erreur de chargement du fichier defis.json :", err);
      console.log("Défis affichés dans le DOM :", document.querySelectorAll(".defi").length);

    });
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
  loadDefis(); // 🟢 ← cette ligne manquait
}

function updateTimer() {
  const endTime = parseInt(localStorage.getItem(TIMER_STORAGE_KEY));
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) {
    endGame();
    return;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  timerDisplay.textContent = `${hours}h ${minutes}m ${seconds}s`;
}

function startCountdown() {
  updateTimer();
  const interval = setInterval(() => {
    if (!document.body.contains(timerDisplay)) {
      clearInterval(interval);
      return;
    }
    updateTimer();
  }, 1000);
}

function loadDefis() {
  let defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));

  // Sécurité si vide ou cassé
  if (!defis || !Array.isArray(defis) || defis.length === 0) {
    defis = getRandomDefis(3);
    localStorage.setItem(DEFI_STORAGE_KEY, JSON.stringify(defis));
  }

  defisActuels = defis;
  defiList.innerHTML = '';
  defis.forEach((defi, index) => {
    const li = document.createElement("li");
    li.className = "defi";
    if (defi.done) li.classList.add("done");
    li.setAttribute("data-defi-id", defi.id);
    li.innerHTML = `
      <p>${defi.texte}</p>
      <button onclick="ouvrirCameraPour(${defi.id})">📸 Prendre une photo</button>
      <button onclick="validerAvecPub(${index})">📺 Voir une pub</button>
    `;
    defiList.appendChild(li);
  });

  afficherPhotosSauvegardees();
}

function afficherPhotosSauvegardees() {
  document.querySelectorAll(".defi").forEach(defiEl => {
    const id = defiEl.getAttribute("data-defi-id");
    const dataUrl = localStorage.getItem(`photo_defi_${id}`);
    if (dataUrl) {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.className = "photo-miniature";
      defiEl.appendChild(img);
    }
  });
}

window.validerDefi = function(index) {
  const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
  if (!defis[index].done) {
    defis[index].done = true;
    localStorage.setItem(DEFI_STORAGE_KEY, JSON.stringify(defis));
    document.querySelectorAll("#defi-list li")[index]?.classList.add("done");
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

function endGame() {
  const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
  const date = new Date().toLocaleString("fr-FR");

  const historique = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  historique.unshift({
    date,
    defis: defis.map((d) => d.texte),
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historique.slice(0, 7)));

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
