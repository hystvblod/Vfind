import { isPremium, addPoints, getPoints } from './userData.js'; // adapte si besoin !

export async function showAd(type) {
  // Vérifie si Premium une seule fois
  const premium = await isPremium();
  if (premium) {
    if (type === "rewarded") {
      await addPoints(10);
      alert("🎁 Bonus Premium : 10 pièces sans pub !");
    } else if (type === "interstitial") {
      alert("✨ Premium actif : aucune pub !");
    } else if (type === "premium") {
      alert("✅ Tu es déjà Premium !");
    }
    await updatePointsDisplay();
    return;
  }

  if (type === "rewarded") {
    alert("🎁 Pub vue ! Tu gagnes 100 pièces.");
    await addPoints(100);
    await updatePointsDisplay();
  } else if (type === "interstitial") {
    alert("📺 Merci d'avoir vu la pub ! Le duel va commencer.");
  } else if (type === "premium") {
    alert("✨ Cette option est disponible dans la version Premium.");
  } else {
    console.warn("Type de pub inconnu :", type);
  }
}

// Fonction utilitaire pour MAJ affichage points si besoin
export async function updatePointsDisplay() {
  const pointsSpan = document.getElementById("points");
  if (pointsSpan) pointsSpan.textContent = await getPoints();
}
