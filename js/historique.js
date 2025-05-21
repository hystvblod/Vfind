import { db, auth, initFirebaseUser } from './firebase.js';
// On suppose que drawPolaroid est déjà global via polaroid.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("historique-gallery");

  await initFirebaseUser();
  const user = auth.currentUser;

  let photos = [];

  // OPTION 1 : Historique depuis Firestore (champ 'historique' dans users/UID)
  if (user) {
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js");
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      // Change ici selon le nom de ton champ Firestore : "historique" (recommandé) ou "historiquePhotos"
      if (snap.exists() && Array.isArray(snap.data().historique)) {
        photos = snap.data().historique;
      }
    } catch (e) {
      console.warn("Erreur Firebase, fallback localStorage :", e);
    }
  }

  // (Optionnel) Fallback localStorage si migration en cours
  if ((!photos || photos.length === 0) && typeof getHistoriquePhotos === "function") {
    photos = getHistoriquePhotos();
  }

  // Affichage des photos
  if (!photos || photos.length === 0) {
    container.innerHTML = "<p>Aucun défi encore réalisé.</p>";
  } else {
    photos.forEach(entry => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 400;
      // Change selon tes données : entry.base64 ou entry.photo, entry.cadre
      drawPolaroid(entry.base64 || entry.photo, entry.cadre, canvas);
      container.appendChild(canvas);
    });
  }
});
