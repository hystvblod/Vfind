import { initFirebaseUser, db, auth } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Sélection d'un cadre
export async function setCadreSelectionne(cadreId) {
  const user = auth.currentUser;
  if (!user) return;
  const profilRef = doc(db, "users", user.uid);
  await updateDoc(profilRef, {
    cadreActif: cadreId
  });
  alert("✅ Cadre sélectionné !");
  location.reload();
}

// Zoom cadre
export function zoomCadre(id) {
  const popup = document.createElement("div");
  popup.className = "popup show";
  popup.innerHTML = `
    <div class="popup-inner">
      <button id="close-popup" onclick="document.body.removeChild(this.parentNode.parentNode)">✖</button>
      <div class="cadre-preview cadre-popup">
        <img class="photo-cadre" src="./assets/cadres/${id}.webp" />
        <img class="photo-user" src="./assets/img/exemple.jpg" />
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

// Initialisation + affichage
document.addEventListener("DOMContentLoaded", async () => {
  await initFirebaseUser();
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const profilRef = doc(db, "users", user.uid);
    const snap = await getDoc(profilRef);

    const container = document.getElementById("cadres-list");
    if (!snap.exists()) {
      container.innerHTML = "<p>Aucun cadre trouvé.</p>";
      return;
    }
    const data = snap.data();
    const cadresPossedes = data.cadres || [];
    const cadreActif = data.cadreActif || null;

    container.innerHTML = "";

    if (!cadresPossedes.length) {
      container.innerHTML = "<p>Aucun cadre débloqué !</p>";
      return;
    }

    cadresPossedes.forEach(cadre => {
      const div = document.createElement("div");
      div.className = "cadre-item";
      div.innerHTML = `
        <div class="cadre-preview" style="cursor:zoom-in" onclick="window.zoomCadre('${cadre}')">
          <img class="photo-cadre" src="./assets/cadres/${cadre}.webp" />
          <img class="photo-user" src="./assets/img/exemple.jpg" />
        </div>
        <button onclick="window.setCadreSelectionne('${cadre}')" ${cadre === cadreActif ? "disabled" : ""}>
          ${cadre === cadreActif ? "Utilisé" : "Utiliser"}
        </button>
      `;
      container.appendChild(div);
    });

    // Expose les fonctions globalement (pour lier aux boutons générés dynamiquement)
    window.setCadreSelectionne = setCadreSelectionne;
    window.zoomCadre = zoomCadre;
  });
});
