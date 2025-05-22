import { db, auth, initFirebaseUser } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// Patch anti-bug : aucune reload en solo
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
      if (mode === "duel") {
        // Sauvegarde Duel : Firebase
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const duel = snap.data().duelEnCours;
            if (duel && duel.defis) {
              const defisMaj = duel.defis.map(d =>
                d.id == defiId ? { ...d, photoA: dataUrl } : d
              );
              await updateDoc(ref, {
                duelEnCours: { ...duel, defis: defisMaj }
              });
            }
          }
        } catch (e) {
          alert("Erreur lors de l’enregistrement Firebase : " + e);
        }
        setTimeout(() => window.location.reload(), 100); // duel = reload OK
      } else {
        // SOLO
        localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          let defisSolo = {};
          if (snap.exists() && snap.data().defisSolo) {
            defisSolo = snap.data().defisSolo;
          }
          defisSolo[defiId] = dataUrl;
          await updateDoc(ref, { defisSolo });
        } catch (e) {
          // Erreur firebase = pas grave pour affichage instantané
        }
        // Appel affichage instantané, PAS DE RELOAD
        if (window.afficherPhotoDansCadreSolo) {
          window.afficherPhotoDansCadreSolo(defiId, dataUrl);
        }
      }
      if (videoStream) videoStream.getTracks().forEach(track => track.stop());
      container.remove();
    }
  };

  closeBtn.onclick = () => {
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    container.remove();
  };

  startCamera();
}
