let allChallenges = [];

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

function getRandomChallenges() {
  const descriptions = allChallenges.map(c => c.description);
  const shuffled = [...descriptions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

function displayChallenges() {
  const container = document.getElementById('challenges-container');
  if (!container || challenges.length === 0) return;

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
  const el1 = document.getElementById('points');
  const el2 = document.getElementById('points-profile');
  if (el1) el1.innerText = points;
  if (el2) el2.innerText = points;
}

function takePhoto(index) {
  alert('📸 Photo prise pour : ' + challenges[index]);

  const challengeElements = document.getElementsByClassName('challenge');
  if (challengeElements[index]) {
    challengeElements[index].classList.add('completed');
  }

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
  const historyDiv = document.getElementById('history-container');
  if (historyDiv) {
    historyDiv.classList.toggle('hidden');
  }
}

function toggleSettingsMenu() {
  const menu = document.getElementById('settings-menu');
  if (menu) {
    menu.classList.toggle('visible');
  }
}

function resetAll() {
  if (!confirm("⚠️ Es-tu sûr de vouloir tout réinitialiser ?")) return;
  points = 0;

  fetch("/Vfind2/data/defis.json")
    .then(response => response.text())
    .then(text => {
      try {
        const data = JSON.parse(text);
        allChallenges = data;
        challenges = getRandomChallenges();
        displayChallenges();
      } catch (e) {
        console.error("❌ Le contenu JSON est invalide :", text);
      }
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
  fetch("/Vfind2/data/defis.json")
    .then(response => response.text())
    .then(text => {
      try {
        const data = JSON.parse(text);
        allChallenges = data;
        challenges = getRandomChallenges();
        displayChallenges();
      } catch (e) {
        console.error("❌ Le contenu JSON est invalide :", text);
      }
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
