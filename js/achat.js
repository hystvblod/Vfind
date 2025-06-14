import { getUserId, loadUserData } from './userData.js';

// Packs disponibles côté client (affichage uniquement)
export const PIECE_PACKS = {
  pack_099: { prix: 0.99, base: 1500, bonus: 500 },
  pack_199: { prix: 1.99, base: 4000, bonus: 1000 },
  pack_249: { prix: 2.49, base: 12000, bonus: 3000 }
};

// ✅ URL de l'API de validation sécurisée (Vercel)
const API_URL = 'https://vfindez-api.vercel.app/api/validate-receipt';

/**
 * Effectue un achat sécurisé via l’API Vercel (pack ou premium)
 * @param {string} achat - "pack_099" | "pack_199" | "pack_249" | "premium"
 */
export async function validerAchat(achat) {
  await loadUserData();
  const userId = getUserId();
  if (!userId) {
    alert("Utilisateur non connecté.");
    return;
  }

  // On calcule la quantité de points si achat d'un pack
  let quantite = 0;
  if (achat.startsWith("pack_")) {
    const pack = PIECE_PACKS[achat];
    if (pack) quantite = pack.base + pack.bonus;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, achat, quantite })
    });

    const result = await res.json();
    if (result.success) {
      alert(result.message || "Achat validé !");
    } else {
      alert("Erreur : " + (result.error || "inconnue"));
    }
  } catch (err) {
    alert("Erreur réseau ou serveur.");
  }
}
