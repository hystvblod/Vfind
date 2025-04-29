// Variables principales
let points = 0;
let challenges = [];
let completedChallenges = 0;
let videoWatchedToday = false; // Savoir si l'utilisateur a déjà utilisé son bonus du jour

// Simulation pour les publicités (remplacer par vrais appels pub plus tard)
function showInterstitialAd() {
  alert("⚡ Publicité interstitielle (simulateur)");
}

function showRewardedVideoAd() {
  return new Promise((resolve) => {
    alert("🎬 Publicité Rewarded Video (simulateur, durée 30s)");
    setTimeout(() => {
      resolve(true); // Simuler qu'on a regardé la vidéo entière
    }, 3000); // Simulation rapide de 3 secondes (à remplacer par vrai 30s sur app finale)
  });
}

// Tirage aléatoire de 3 défis
function getRandomChallenges() {
  const shuffled = [...allChallenges].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// Affichage des défis dans la page
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

  // Ajouter le bouton pour regarder une vidéo et prolonger de 1h
  const bonusButton = document.createElement('button');
  bonusButton.innerText = "⏳ Rallonger de 1h en regardant une pub";
  bonusButton.className = "bonus-button";
  bonusButton.onclick = watchRewardedVideo;
  container.appendChild(bonusButton);
}

// Action quand on prend une photo pour un défi
function takePhoto(index) {
  alert('📸 Photo prise pour le défi : ' + challenges[index]);
  
  // Marquer le défi comme terminé
  document.getElementsByClassName('challenge')[index].classList.add('completed');
  
  // Ajouter les points
  points += 10;
  completedChallenges += 1;
  updatePointsDisplay();

  // Déclencher une pub interstitielle
  showInterstitialAd();

  // Vérifier si tous les défis sont terminés
  if (completedChallenges === 3) {
    setTimeout(() => {
      alert('🎉 Félicitations, tu as terminé les 3 défis du jour !');
      showInterstitialAd(); // Pub de fin après avoir complété tous les défis
    }, 500);
  }
}

// Mise à jour de l'affichage des points
function updatePointsDisplay() {
  document.getElementById('points').innerText = points;
}

// Fonction pour regarder une pub Rewarded Video et prolonger 1h
async function watchRewardedVideo() {
  if (videoWatchedToday) {
    alert("⛔ Tu as déjà utilisé ton bonus d'1h aujourd'hui !");
    return;
  }

  const success = await showRewardedVideoAd();
  if (success) {
    alert("⏳ 1 heure supplémentaire ajoutée !");
    videoWatchedToday = true;
    // (À relier au vrai système de chrono/jour si besoin plus tard)
  }
}

// Initialisation à l'ouverture de la page
window.onload = () => {
  challenges = getRandomChallenges();
  displayChallenges();
  updatePointsDisplay();
};
