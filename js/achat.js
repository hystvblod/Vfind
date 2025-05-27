import { doc, updateDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/11.7.0/firebase-firestore.js";
import { auth, db } from './firebase.js';

/**
 * Gère l'achat d'un pack de pièces avec détection du bonus de premier achat.
 * @param {string} packId - Identifiant du pack ('pack_099', 'pack_199', 'pack_249')
 */
export async function acheterPack(packId) {
  const user = auth.currentUser;
  if (!user) {
    alert("Veuillez vous connecter.");
    return;
  }

  const userRef = doc(db, "users", user.uid);

  try {
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert("Profil utilisateur introuvable.");
      return;
    }

    const userData = userSnap.data();

    // Packs disponibles
    const packs = {
      pack_099: { prix: 0.99, base: 1500, bonus: 500, flag: "firstBuy_099" },
      pack_199: { prix: 1.99, base: 4000, bonus: 1000, flag: "firstBuy_199" },
      pack_249: { prix: 2.49, base: 12000, bonus: 3000, flag: "firstBuy_249" }
    };

    const pack = packs[packId];

    if (!pack) {
      alert("Pack inconnu.");
      return;
    }

    let total = pack.base;

    const updates = {};

    if (!userData[pack.flag]) {
      total += pack.bonus;
      updates[pack.flag] = true;
    }

    updates.pieces = increment(total);

    await updateDoc(userRef, updates);
    alert(`+${total} pièces ajoutées à votre compte !`);

  } catch (error) {
    console.error("Erreur lors de l'achat :", error);
    alert("Une erreur est survenue pendant l'achat.");
  }
}

/**
 * Active le statut premium pour l'utilisateur.
 */
export async function activerPremium() {
  const user = auth.currentUser;
  if (!user) {
    alert("Veuillez vous connecter.");
    return;
  }

  const userRef = doc(db, "users", user.uid);

  try {
    await updateDoc(userRef, { premium: true });
    alert("Statut Premium activé avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'activation du premium :", error);
    alert("Une erreur est survenue lors de l'activation du premium.");
  }
}
