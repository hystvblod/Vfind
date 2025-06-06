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

  // Vérifie le consentement RGPD/publicités avant de lancer la pub réelle
  const consent = window.userConsent || localStorage.getItem("rgpdConsent");
  if (consent !== "accept") {
    alert("⚠️ Tu dois accepter les publicités personnalisées dans les paramètres pour profiter de cette fonctionnalité.");
    return;
  }

  // PUB RÉELLE (AppLovin/Lovapp/AdMob) À INTÉGRER ICI si besoin :
  // if (type === "rewarded") { showRealRewardedAd(); ... }

  // Simulé pour l'instant :
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
