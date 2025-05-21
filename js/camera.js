import { db, auth, initFirebaseUser } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

let videoStream = null;
const VIDEO_WIDTH = 500;
const VIDEO_HEIGHT = 580;

export async function ouvrirCameraPour(defiId) {
  await initFirebaseUser();
  const user = auth.currentUser;
  if (!user) {
    alert("Erreur utilisateur.");
    return;
  }

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

  let useFrontCamera = false;

  function startCamera() {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
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
    if (confirmSave) {
      // === Save to Firestore ===
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const duel = snap.data().duelEnCours;
          if (duel && duel.defis) {
            // Met à jour la photoA du bon défi
            const defisMaj = duel.defis.map(d =>
              d.id == defiId ? { ...d, photoA: dataUrl } : d
            );
            await updateDoc(ref, {
              duelEnCours: { ...duel, defis: defisMaj }
            });
          }
        }
        // Ferme la caméra
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        container.remove();
        location.reload();
      } catch (e) {
        alert("Erreur lors de l’enregistrement Firebase : " + e);
      }
    }
  };

  closeBtn.onclick = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    container.remove();
  };

  startCamera();
}
