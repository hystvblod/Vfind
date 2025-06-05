import { uploadPhotoDuelWebp, savePhotoDuel } from "./duel.js";
import { getUserId } from "./userData.js";


// Fonctions d'ouverture (compat global, mais ES6 only)
export async function ouvrirCameraPour(defiId, mode = "solo", duelId = null) {
  return new Promise((resolve, reject) => {
    // ... (tout ton code HTML + DOM identique) ...
    const container = document.createElement("div");
    container.className = "camera-container-fullscreen";
    container.innerHTML = `
      <div class="camera-video-zone">
        <div class="camera-video-wrapper">
          <video autoplay playsinline class="camera-video"></video>
        </div>
        <div class="camera-controls camera-controls-pro">
          <button id="switchCamera" title="Changer de caméra" class="camera-btn">
            <span class="cam-ico">&#8635;</span>
            <span class="cam-label">Retourner</span>
          </button>
       <button id="takePhoto" class="camera-btn btn-capture" title="Prendre la photo">
  <span class="cam-ico-big"></span>
</button>
          <button id="closeCamera" title="Fermer" class="camera-btn camera-btn-close">
            <span class="cam-ico">&#10006;</span>
            <span class="cam-label">Fermer</span>
          </button>
        </div>
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
    const VIDEO_HEIGHT = 550;

    // ZOOM PATCHS (identique à toi)
    let camZoom = 1;
    let lastTouchDist = null;
    let isPinching = false;
    function setZoom(scale) {
      camZoom = Math.max(1, Math.min(scale, 6));
      video.style.transform = `scale(${camZoom})`;
    }
    video.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });
    video.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && lastTouchDist) {
        isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        let scaleChange = newDist / lastTouchDist;
        setZoom(camZoom * scaleChange);
        lastTouchDist = newDist;
        e.preventDefault();
      }
    }, { passive: false });
    video.addEventListener("touchend", function (e) {
      if (e.touches.length < 2) {
        lastTouchDist = null;
        setTimeout(() => { isPinching = false; }, 50);
      }
    }, { passive: false });
    let lastTap = 0;
    video.addEventListener("touchend", function (e) {
      const now = Date.now();
      if (!isPinching && e.touches.length === 0 && now - lastTap < 300) {
        setZoom(1);
      }
      lastTap = now;
    });
    video.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;
      setZoom(camZoom + (e.deltaY < 0 ? 0.10 : -0.10));
      e.preventDefault();
    }, { passive: false });

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
      if (isPinching) return;
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");

      // Capture zoomée
      const sx = (video.videoWidth - video.videoWidth / camZoom) / 2;
      const sy = (video.videoHeight - video.videoHeight / camZoom) / 2;
      const sWidth = video.videoWidth / camZoom;
      const sHeight = video.videoHeight / camZoom;
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

      const confirmSave = confirm("Souhaites-tu valider cette photo ?");
      if (!confirmSave) return;

      // --- DUEL ---
if (mode === "duel") {
  if (!duelId) {
    alert("Erreur interne : duelId manquant.");
    return;
  }

  const cadreImg = new Image();
  cadreImg.src = `./assets/cadres/polaroid_01.webp`;const cadreId = await getCadreSelectionne(); // vient de userData.js
cadreImg.src = `./assets/cadres/${cadreId}.webp`;

  cadreImg.onload = async () => {
    // ✅ D'abord le cadre en fond
    ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    // ✅ Puis la photo capturée par-dessus (comme en solo)
    ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    const dataUrl = canvas.toDataURL("image/webp", 0.85);

    try {
      const urlPhoto = await uploadPhotoDuelWebp(dataUrl, duelId, defiId);
      const userId = await getUserId();
      localStorage.setItem(`photo_duel_${duelId}_${userId}`, urlPhoto);
      await savePhotoDuel(defiId, urlPhoto);
      resolve(urlPhoto);
    } catch (err) {
      alert("Erreur upload duel : " + err.message);
      reject(err);
    }

    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    container.remove();
  };

  cadreImg.onerror = () => alert("Erreur de chargement du cadre.");
}

      // --- CONCOURS ---
      else if (mode === "concours") {
        // ... (à adapter, tu peux faire de même que ci-dessus) ...
      }
      // --- SOLO ---
      else if (mode === "solo") {
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
        if (window.afficherPhotoDansCadreSolo) {
          window.afficherPhotoDansCadreSolo(defiId, dataUrl);
        }
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        container.remove();
        resolve(dataUrl);
      }
      // --- BASE64 "brut" ---
      else if (mode === "base64") {
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        container.remove();
        resolve(dataUrl);
      }
    };

    closeBtn.onclick = () => {
      if (videoStream) videoStream.getTracks().forEach(track => track.stop());
      container.remove();
      reject("fermé");
    };

    startCamera();
  });
}

// Pour compatibilité, si tu veux garder le window pour les vieux appels, ajoute :
window.ouvrirCameraPour = ouvrirCameraPour;
window.cameraOuvrirCameraPourDuel = function(idx, duelId) {
  ouvrirCameraPour(idx, "duel", duelId);
};
window.cameraOuvrirCameraPourConcours = function(concoursId) {
  ouvrirCameraPour(concoursId, "concours");
};
