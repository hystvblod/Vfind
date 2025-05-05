
function showAd(type) {
  const user = JSON.parse(localStorage.getItem("vfindUserData"));
  if (user?.premium) {
    if (type === "rewarded") {
      ajouterPieces(10);
      alert("🎁 Bonus Premium : 10 pièces sans pub !");
    } else if (type === "interstitial") {
      alert("✨ Premium actif : aucune pub !");
    } else if (type === "premium") {
      alert("✅ Tu es déjà Premium !");
    }
    return;
  }

  if (type === "rewarded") {
    alert("🎁 Pub vue ! Tu gagnes 100 pièces.");
    ajouterPieces(100);
  } else if (type === "interstitial") {
    alert("📺 Merci d'avoir vu la pub ! Le duel va commencer.");
  } else if (type === "premium") {
    alert("✨ Cette option est disponible dans la version Premium.");
  } else {
    console.warn("Type de pub inconnu :", type);
  }
}

function ajouterPieces(montant) {
  const userData = JSON.parse(localStorage.getItem("vfindUserData")) || {
    pseudo: "Toi",
    coins: 0,
    cadres: ["polaroid_1"],
    premium: false
  };

  userData.coins += montant;
  localStorage.setItem("vfindUserData", JSON.stringify(userData));

  const pointsSpan = document.getElementById("points");
  if (pointsSpan) pointsSpan.textContent = userData.coins;
}
