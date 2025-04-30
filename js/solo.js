const basePath = location.hostname.includes("github.io") ? "Vfind2/" : "";
// Variables principales
let points = 0;
let challenges = [];
let completedChallenges = 0;
let videoWatchedToday = false;
let history = [];
let likedPhotos = [];

// Simulation pour pub
function showInterstitialAd() {
  alert("⚡ Publicité interstitielle (simulateur)");
}

function showRewardedVideoAd() {
  return new Promise((resolve) => {
    alert("🎬 Publicité Rewarded Video (simulateur, durée 30s)");
    setTimeout(() => {
      resolve(true);
    }, 3000);
  });
}

// Fonctions principales
function getRandomChallenges() {
  const shuffled = [...allChallenges].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

function displayChallenges() {
  const container = document.getElementById('challenges-container');
  container.innerHTML = '';

  challenges.forEach((challenge, index) => {
    const challengeDiv = document.createElement('div');
    challengeDiv.className = 'challenge';
    challengeDiv.innerHTML = `
      <p>${challenge}</p>
      <button onclick="takePhoto(${index})">Prendre une photo</button>
    `;
    container.appendChild(challengeDiv);
  });
}

function updatePointsDisplay() {
  document.getElementById('points').innerText = points;
  document.getElementById('points-profile').innerText = points;
}

function takePhoto(index) {
  alert('📸 Photo prise pour : ' + challenges[index]);

  document.getElementsByClassName('challenge')[index].classList.add('completed');

  points += 10;
  completedChallenges += 1;
  history.push(challenges[index]);
  updatePointsDisplay();
  updateHistory();
}

function updateHistory() {
  const container = document.getElementById('history-container');
  container.innerHTML = '';
  history.forEach(item => {
    const p = document.createElement('p');
    p.textContent = item;
    container.appendChild(p);
  });

  const fullList = document.getElementById('full-history-list');
  fullList.innerHTML = '';
  history.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    fullList.appendChild(li);
  });
}

function toggleHistory() {
  const history = document.getElementById('history-container');
  history.classList.toggle('hidden');
}

function toggleSettingsMenu() {
  const menu = document.getElementById('settings-menu');
  menu.classList.toggle('visible');
}

function resetAll() {
  if (!confirm("⚠️ Es-tu sûr de vouloir tout réinitialiser ?")) return;
  points = 0;
  challenges = getRandomChallenges();
  completedChallenges = 0;
  history = [];
  likedPhotos = [];
  displayChallenges();
  updatePointsDisplay();
  updateHistory();
}

// Initialisation
window.onload = () => {
  challenges = getRandomChallenges();
  displayChallenges();
  updatePointsDisplay();

  document.getElementById('settings-button').addEventListener('click', toggleSettingsMenu);
  document.getElementById('toggle-history').addEventListener('click', toggleHistory);
  document.getElementById('reset-button').addEventListener('click', resetAll);
};
