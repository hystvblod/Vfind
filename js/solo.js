
let allChallenges = [];

const basePath = ""; // Pas de sous-dossier

let points = 0;
let challenges = [];
let completedChallenges = 0;
let videoWatchedToday = false;
let history = [];
let likedPhotos = [];

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
  const descriptions = allChallenges.map(c => c.description);
  const shuffled = [...descriptions].sort(() => 0.5 - Math.random());
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
  const p1 = document.getElementById('points');
  const p2 = document.getElementById('points-profile');
  if (p1) p1.innerText = points;
  if (p2) p2.innerText = points;
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
  if (container) {
    container.innerHTML = '';
    history.forEach(item => {
      const p = document.createElement('p');
      p.textContent = item;
      container.appendChild(p);
    });
  }

  const fullList = document.getElementById('full-history-list');
  if (fullList) {
    fullList.innerHTML = '';
    history.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      fullList.appendChild(li);
    });
  }
}

function toggleHistory() {
  const history = document.getElementById('history-container');
  if (history) history.classList.toggle('hidden');
}

function toggleSettingsMenu() {
  const menu = document.getElementById('settings-menu');
  if (menu) menu.classList.toggle('visible');
}

function resetAll() {
  if (!confirm("⚠️ Es-tu sûr de vouloir tout réinitialiser ?")) return;
  points = 0;

  fetch(basePath + "data/defis.json")
    .then(response => response.text())
    .then(text => {
      console.log("🔍 Contenu reçu :", text);
      const data = JSON.parse(text);
      allChallenges = data;
      challenges = getRandomChallenges();
      displayChallenges();
    })
    .catch(error => {
      console.error("Erreur de chargement des défis :", error);
    });

  completedChallenges = 0;
  history = [];
  likedPhotos = [];
  updateHistory();
}

window.onload = () => {
  fetch(basePath + "data/defis.json")
    .then(response => response.text())
    .then(text => {
      console.log("🔍 Contenu reçu :", text);
      const data = JSON.parse(text);
      allChallenges = data;
      challenges = getRandomChallenges();
      displayChallenges();
    })
    .catch(error => {
      console.error("Erreur de chargement des défis :", error);
    });

  const settingsBtn = document.getElementById('settings-button');
  if (settingsBtn) settingsBtn.addEventListener('click', toggleSettingsMenu);

  const toggleHist = document.getElementById('toggle-history');
  if (toggleHist) toggleHist.addEventListener('click', toggleHistory);

  const resetBtn = document.getElementById('reset-button');
  if (resetBtn) resetBtn.addEventListener('click', resetAll);
};
