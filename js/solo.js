// Variables principales
let points = 0;
let challenges = [];
let completedChallenges = 0;
let videoWatchedToday = false;
let history = [];
let likedPhotos = [];
let allChallenges = []; // Ajout essentiel

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
      <p>${challenge.description}</p>
      <button onclick="takePhoto(${index})">📸 Prendre une photo</button>
    `;
    container.appendChild(challengeDiv);
  });
}

function takePhoto(index) {
  sessionStorage.setItem("currentChallenge", JSON.stringify(challenges[index]));
  window.location.href = "camera.html";
}

function loadUserData() {
  const storedPoints = localStorage.getItem("vfind_points");
  if (storedPoints) points = parseInt(storedPoints);

  const storedHistory = localStorage.getItem("vfind_history");
  if (storedHistory) history = JSON.parse(storedHistory);

  const storedLiked = localStorage.getItem("vfind_likes");
  if (storedLiked) likedPhotos = JSON.parse(storedLiked);
}

function updatePointsDisplay() {
  const pointsDisplay = document.getElementById("points-display");
  if (pointsDisplay) pointsDisplay.textContent = `Points : ${points}`;
}

// Chargement des défis depuis le fichier JSON
window.onload = async () => {
  try {
    const response = await fetch("../data/defis.json");
    allChallenges = await response.json();

    challenges = getRandomChallenges();
    displayChallenges();
    loadUserData();
    updatePointsDisplay();
  } catch (error) {
    console.error("Erreur de chargement des défis :", error);
  }
};
