import { db, auth, initFirebaseUser } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// Fonction principale pour ouvrir la caméra (solo ou duel)
export async function ouvrirCameraPour(defiId, mode = "solo") {
  await initFirebaseUser();
  const user = auth.currentUser;

  const container = document.createElement("div");
  container.className = "camera-container-fullscreen";
  container.innerHTML = `
    <video autoplay playsinline class="camera-video"></video>
    <div class="camera-controls">
      <button id="switchCamera">🔁</button>
      <button id="takePhoto" class="btn-capture">📸 Prendre la photo</button>
      <button id="closeCamera">❌</button>
    </div>
  `;
  document.body.appendChild(container);

  const video = container.querySelector("video");
  const switchBtn = container.querySelector("#switchCamera");
  const takeBtn = container.querySelector("#takePhoto");
  const closeBtn = container.querySelector("#closeCamera");

  let videoStream = null;
  let useFrontCamera = false;
  const VIDEO_WIDTH = 500;
  const VIDEO_HEIGHT = 580;

  function startCamera() {
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: useFrontCamera ? "user" : "environment" }
    })
    .then(stream => {
      videoStream = stream;
      video.srcObject = stream;
    })
    .catch(err => {
      alert("Erreur d’accès à la caméra : " + err);
    });
  }

  switchBtn.onclick = () => {
    useFrontCamera = !useFrontCamera;
    startCamera();
  };

  takeBtn.onclick = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    const dataUrl = canvas.toDataURL("image/webp", 0.85);

    const confirmSave = confirm("Souhaites-tu valider cette photo ?");
    if (!confirmSave) return;

    if (mode === "duel") {
      // ==== Mode Duel ====
      if (window.savePhotoDuel) {
        await window.savePhotoDuel(defiId, dataUrl); // <-- AWAIT AJOUTÉ
      } else {
        alert("Erreur : fonction savePhotoDuel introuvable !");
      }
      // PAS DE RELOAD ! Firestore va rafraîchir tout seul.
    } else {
      // ==== Mode Solo ====
      localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        let defisSolo = (snap.exists() && snap.data().defisSolo) || {};
        defisSolo[defiId] = dataUrl;
        await updateDoc(ref, { defisSolo });
      } catch (e) {
        console.warn("⚠️ Erreur d'enregistrement Firebase (solo):", e);
      }
      // Affichage direct dans l'interface
      if (window.afficherPhotoDansCadreSolo) {
        window.afficherPhotoDansCadreSolo(defiId, dataUrl);
      }
    }

    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    container.remove();
  };

  closeBtn.onclick = () => {
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    container.remove();
  };

  startCamera();
}

// ==== FONCTIONS GLOBALES POUR LE MODE DUEL (compatibilité duel.js) ====
window.ouvrirCameraPour = ouvrirCameraPour;
window.cameraOuvrirCameraPourDuel = function(idx) {
  ouvrirCameraPour(idx, "duel");
};
