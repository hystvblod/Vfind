import { uploadPhotoDuelWebp, savePhotoDuel } from "./duel.js";
import { getUserId, getCadreSelectionne } from "./userData.js";

export async function ouvrirCameraPour(defiId, mode = "solo", duelId = null, cadreId = null) {
  return new Promise((resolve, reject) => {
    // DOM + style comme d’hab
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

    // Zoom/pinch
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
        setZoom(camZoom * (newDist / lastTouchDist));
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
    video.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;
      setZoom(camZoom + (e.deltaY < 0 ? 0.1 : -0.1));
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

      // Zone crop zoom
      const sx = (video.videoWidth - video.videoWidth / camZoom) / 2;
      const sy = (video.videoHeight - video.videoHeight / camZoom) / 2;
      const sWidth = video.videoWidth / camZoom;
      const sHeight = video.videoHeight / camZoom;

      // --- DUEL ---
      if (mode === "duel") {
        if (!duelId) {
          alert("Erreur interne : duelId manquant.");
          return;
        }
        if (!cadreId) cadreId = "polaroid_01"; // Fallback

        const cadreImg = new Image();
        cadreImg.src = `./assets/cadres/${cadreId}.webp`;

        cadreImg.onload = async () => {
          // 1. DESSINE le cadre EN FOND
          ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

          // 2. DESSINE LA PHOTO PAR-DESSUS (direct depuis la vidéo, pas un preview blob, direct caméra)
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          try {
            const urlPhoto = await uploadPhotoDuelWebp(dataUrl, duelId, defiId, cadreId);
            const userId = await getUserId();
            localStorage.setItem(`photo_duel_${duelId}_${userId}`, urlPhoto);
            await savePhotoDuel(defiId, urlPhoto, cadreId);
            if (videoStream) videoStream.getTracks().forEach(track => track.stop());
            container.remove();
            resolve(urlPhoto);
          } catch (err) {
            alert("Erreur upload duel : " + err.message);
            reject(err);
          }
        };
        cadreImg.onerror = () => alert("Erreur de chargement du cadre.");
      }
      // --- SOLO ---
      else if (mode === "solo") {
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
        if (window.afficherPhotoDansCadreSolo) {
          window.afficherPhotoDansCadreSolo(defiId, dataUrl);
        }
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        container.remove();
        resolve(dataUrl);
      }
      // --- BASE64
      else if (mode === "base64") {
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
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

window.ouvrirCameraPour = ouvrirCameraPour;
window.cameraOuvrirCameraPourDuel = function(idx, duelId, cadreId) {
  ouvrirCameraPour(idx, "duel", duelId, cadreId);
};
window.cameraOuvrirCameraPourConcours = function(concoursId) {
  ouvrirCameraPour(concoursId, "concours");
};
