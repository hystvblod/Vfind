// === CONSTANTES ===
const DEFI_STORAGE_KEY = "vfind_defis";
const TIMER_STORAGE_KEY = "vfind_timer";
const SCORE_STORAGE_KEY = "vfind_score";
const PUB_USED_KEY = "vfind_pub_used";
const HISTORY_KEY = "vfind_historique";

// === ÉLÉMENTS DOM ===
const startBtn = document.getElementById("startBtn");
const replayBtn = document.getElementById("replayBtn");
const preGame = document.getElementById("pre-game");
const gameSection = document.getElementById("game-section");
const endSection = document.getElementById("end-section");
const timerDisplay = document.getElementById("timer");
const defiList = document.getElementById("defi-list");
const vcoinScore = document.getElementById("vcoin-score");
const finalMessage = document.getElementById("final-message");

// === CHARGEMENT DES DÉFIS JSON ===
let allDefis = [];

fetch("data/defis.json")
  .then((res) => res.json())
  .then((data) => {
    allDefis = data.defis;
    init();
  });

// === INITIALISATION ===
function init() {
  const existingTimer = localStorage.getItem(TIMER_STORAGE_KEY);
  if (existingTimer && Date.now() < parseInt(existingTimer)) {
    showGame();
  } else {
    showStart();
  }
}

// === LANCER UNE PARTIE ===
startBtn?.addEventListener("click", () => {
  const newDefis = getRandomDefis(3);
  const endTime = Date.now() + 24 * 60 * 60 * 1000; // 24h
  localStorage.setItem(DEFI_STORAGE_KEY, JSON.stringify(newDefis));
  localStorage.setItem(TIMER_STORAGE_KEY, endTime.toString());
  localStorage.setItem(SCORE_STORAGE_KEY, "0");
  localStorage.setItem(PUB_USED_KEY, "false");
  showGame();
});

function getRandomDefis(n) {
  const shuffled = [...allDefis].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n).map((defi) => ({ ...defi, done: false }));
}

// === AFFICHAGE JEU EN COURS ===
function showGame() {
  preGame.classList.add("hidden");
  endSection.classList.add("hidden");
  gameSection.classList.remove("hidden");

  updateTimer();
  loadDefis();
  startCountdown();
}

// === TIMER LIVE ===
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

// === CHARGER ET AFFICHER LES DÉFIS ===
function loadDefis() {
  const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY)) || [];
  const score = parseInt(localStorage.getItem(SCORE_STORAGE_KEY)) || 0;
  vcoinScore.textContent = score;

  defiList.innerHTML = "";
  defis.forEach((defi, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <p>${defi.texte}</p>
      <button ${defi.done ? "disabled" : ""} onclick="validerDefi(${index})">📸 Prendre une photo</button>
      <button ${defi.done || pubUsed() ? "disabled" : ""} onclick="validerAvecPub(${index})">🎥 Voir une pub</button>
    `;
    if (defi.done) li.style.opacity = "0.6";
    defiList.appendChild(li);
  });
}

// === PUB UTILISÉE ===
function pubUsed() {
  return localStorage.getItem(PUB_USED_KEY) === "true";
}

// === VALIDER DÉFI ===
window.validerDefi = function (index) {
  const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
  if (!defis[index].done) {
    defis[index].done = true;
    localStorage.setItem(DEFI_STORAGE_KEY, JSON.stringify(defis));
    ajouterScore(10);
    loadDefis();
    checkBonus();
  }
};

window.validerAvecPub = function (index) {
  alert("✅ Merci d’avoir regardé la pub !");
  setTimeout(() => {
    localStorage.setItem(PUB_USED_KEY, "true");
    validerDefi(index);
  }, 3000);
};

// === GÉRER SCORE ===
function ajouterScore(val) {
  let score = parseInt(localStorage.getItem(SCORE_STORAGE_KEY)) || 0;
  score += val;
  localStorage.setItem(SCORE_STORAGE_KEY, score.toString());
  vcoinScore.textContent = score;
}

function checkBonus() {
  const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
  const allDone = defis.every((d) => d.done);
  let score = parseInt(localStorage.getItem(SCORE_STORAGE_KEY)) || 0;

  if (allDone && score === 30) {
    ajouterScore(10); // Bonus
  }
}

// === FIN DE PARTIE ===
function endGame() {
  const defis = JSON.parse(localStorage.getItem(DEFI_STORAGE_KEY));
  const score = parseInt(localStorage.getItem(SCORE_STORAGE_KEY)) || 0;
  const date = new Date().toLocaleString("fr-FR");

  // Historique
  const historique = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  historique.unshift({
    date,
    defis: defis.map((d) => d.texte),
    score,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historique.slice(0, 7)));

  // Reset
  localStorage.removeItem(DEFI_STORAGE_KEY);
  localStorage.removeItem(TIMER_STORAGE_KEY);
  localStorage.removeItem(PUB_USED_KEY);
  localStorage.removeItem(SCORE_STORAGE_KEY);

  // Affichage
  gameSection.classList.add("hidden");
  endSection.classList.remove("hidden");
  finalMessage.textContent = `Tu as gagné ${score} VCoins sur 40 possibles !`;
}

// === REJOUER ===
replayBtn?.addEventListener("click", () => {
  showStart();
});

function showStart() {
  preGame.classList.remove("hidden");
  gameSection.classList.add("hidden");
  endSection.classList.add("hidden");
}
