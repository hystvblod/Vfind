// Variables principales
let points = 0;
let challenges = [];
let completedChallenges = 0;
let videoWatchedToday = false;
let history = [];
let likedPhotos = [];

// Simulation pour les publicités
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

  const bonusButton = document.createElement('button');
  bonusButton.innerText = "⏳ Rallonger de 1h en regardant une pub";
  bonusButton.className = "bonus-button";
  bonusButton.onclick = watchRewardedVideo;
  container.appendChild(bonusButton);
}

function updatePointsDisplay() {
  document.getElementById('points').innerText = points;
  document.getElementById('points-profile').innerText = points;
}

function takePhoto(index) {
  alert('📸 Photo prise pour le défi : ' + challenges[index]);

  document.getElementsByClassName('challenge')[index].classList.add('completed');

  points += 10;
  completedChallenges += 1;
  history.push(challenges[index]);
  updateHistoryDisplay();
  updateFullHistoryDisplay();
  updatePointsDisplay();

  showInterstitialAd();

  if (completedChallenges === 3) {
    setTimeout(() => {
      alert('🎉 Félicitations, tu as terminé les 3 défis du jour !');
      showInterstitialAd();
    }, 500);
  }
}

function updateHistoryDisplay() {
  const historyContainer = document.getElementById('history-container');
  historyContainer.innerHTML = '';
  history.forEach(h => {
    const li = document.createElement('li');
    li.textContent = h;
    historyContainer.appendChild(li);
  });
}

function updateFullHistoryDisplay() {
  const fullHistory = document.getElementById('full-history-list');
  fullHistory.innerHTML = '';
  history.forEach(h => {
    const li = document.createElement('li');
    li.textContent = h;
    fullHistory.appendChild(li);
  });
}

async function watchRewardedVideo() {
  if (videoWatchedToday) {
    alert("⛔ Tu as déjà utilisé ton bonus d'1h aujourd'hui !");
    return;
  }

  const success = await showRewardedVideoAd();
  if (success) {
    alert("⏳ 1 heure supplémentaire ajoutée !");
    videoWatchedToday = true;
  }
}

function toggleSettingsMenu() {
  const menu = document.getElementById('settings-menu');
  menu.classList.toggle('visible');
}

function resetAll() {
  if (!confirm("⚠️ Es-tu sûr de vouloir tout réinitialiser ?")) return;
  points = 0;
  completedChallenges = 0;
  history = [];
  likedPhotos = [];
  challenges = getRandomChallenges();
  displayChallenges();
  updateHistoryDisplay();
  updateFullHistoryDisplay();
  updatePointsDisplay();
}

// Initialisation
window.onload = () => {
  challenges = getRandomChallenges();
  displayChallenges();
  updatePointsDisplay();

  document.getElementById('settings-button').addEventListener('click', toggleSettingsMenu);
  document.getElementById('reset-button').addEventListener('click', resetAll);
};
