import { uploadPhotoDuelWebp, savePhotoDuel } from "./duel.js";
import { getUserId, getCadreSelectionne } from "./userData.js";

export async function ouvrirCameraPour(defiId, mode = "solo", duelId = null, cadreId = null) {
  return new Promise((resolve, reject) => {
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

    const style = document.createElement("style");
    style.innerHTML = `
.camera-video-zone {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #000;
  overflow: hidden;
}
.camera-video-wrapper {
  position: relative;
  width: 90vmin;
  height: 90vmin;
  border-radius: 30px;
  background: #111;
  box-shadow: 0 8px 32px #0005;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.camera-video-wrapper video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1);
  transition: transform 0.12s ease-out;
  z-index: 1;
}
.camera-controls-pro {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 24px;
  z-index: 2;
  position: relative;
}
.camera-photo-preview {
  position: absolute;
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0,0,0,0.95);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}`;
    document.head.appendChild(style);

    const video = container.querySelector("video");
    const switchBtn = container.querySelector("#switchCamera");
    const takeBtn = container.querySelector("#takePhoto");
    const closeBtn = container.querySelector("#closeCamera");

    let videoStream = null;
    let useFrontCamera = false;
    const VIDEO_SIZE = 500;

    let camZoom = 1;
    let lastTouchDist = null;
    let isPinching = false;
    function setZoom(scale) {
      camZoom = Math.max(1, Math.min(scale, 6));
      video.style.transform = `scale(${camZoom})`;
    }

    video.addEventListener("touchstart", e => {
      if (e.touches.length === 2) {
        isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });
    video.addEventListener("touchmove", e => {
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
    video.addEventListener("touchend", e => {
      if (e.touches.length < 2) {
        lastTouchDist = null;
        setTimeout(() => { isPinching = false; }, 50);
      }
    }, { passive: false });
    let lastTap = 0;
    video.addEventListener("touchend", e => {
      const now = Date.now();
      if (!isPinching && e.touches.length === 0 && now - lastTap < 300) {
        setZoom(1);
      }
      lastTap = now;
    });
    video.addEventListener("wheel", e => {
      if (e.ctrlKey) return;
      setZoom(camZoom + (e.deltaY < 0 ? 0.1 : -0.1));
      e.preventDefault();
    }, { passive: false });

    function startCamera() {
      if (videoStream) videoStream.getTracks().forEach(track => track.stop());
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFrontCamera ? "user" : "environment" }
      }).then(stream => {
        videoStream = stream;
        video.srcObject = stream;
      }).catch(err => {
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
      canvas.width = VIDEO_SIZE;
      canvas.height = VIDEO_SIZE;
      const ctx = canvas.getContext("2d");

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const side = Math.min(vw, vh);
      const sx = (vw - side) / 2;
      const sy = (vh - side) / 2;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, VIDEO_SIZE, VIDEO_SIZE);

      video.style.display = "none";
      if (videoStream) videoStream.getTracks().forEach(track => track.stop());
      video.srcObject = null;

      const previewDiv = document.createElement("div");
      previewDiv.className = "camera-photo-preview";
      previewDiv.innerHTML = `
        <div style="text-align:center;">
          <img src="${canvas.toDataURL('image/webp', 0.85)}" style="width:90%;max-width:400px;border-radius:14px;box-shadow:0 2px 18px #0007;"/>
          <div style="margin-top:18px;display:flex;gap:16px;justify-content:center;">
            <button class="camera-btn" id="validerPhoto">✅ Valider</button>
            <button class="camera-btn camera-btn-close" id="retakePhoto">↩️ Reprendre</button>
          </div>
        </div>
      `;
      container.querySelector(".camera-video-zone").style.display = "none";
      container.appendChild(previewDiv);

      previewDiv.querySelector("#validerPhoto").onclick = async () => {
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        if (mode === "duel") {
          if (!duelId) return alert("Erreur interne : duelId manquant.");
          if (!cadreId) cadreId = "polaroid_01";
          const cadreImg = new Image();
          cadreImg.src = `./assets/cadres/${cadreId}.webp`;
          cadreImg.onload = async () => {
            ctx.drawImage(cadreImg, 0, 0, VIDEO_SIZE, VIDEO_SIZE);
            const dataUrl2 = canvas.toDataURL("image/webp", 0.85);
            try {
              const urlPhoto = await uploadPhotoDuelWebp(dataUrl2, duelId, defiId, cadreId);
              const userId = await getUserId();
              localStorage.setItem(`photo_duel_${duelId}_${userId}`, urlPhoto);
              await savePhotoDuel(defiId, urlPhoto, cadreId);
              resolve(urlPhoto);
            } catch (err) {
              alert("Erreur upload duel : " + err.message);
              reject(err);
            }
            container.remove();
          };
          cadreImg.onerror = () => alert("Erreur de chargement du cadre.");
        } else if (mode === "solo") {
          localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
          if (window.afficherPhotoDansCadreSolo) {
            window.afficherPhotoDansCadreSolo(defiId, dataUrl);
          }
          container.remove();
          resolve(dataUrl);
        } else if (mode === "base64") {
          container.remove();
          resolve(dataUrl);
        }
      };

      previewDiv.querySelector("#retakePhoto").onclick = () => {
        previewDiv.remove();
        video.style.display = "";
        container.querySelector(".camera-video-zone").style.display = "";
        startCamera();
      };
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
window.cameraOuvrirCameraPourDuel = (idx, duelId, cadreId) => ouvrirCameraPour(idx, "duel", duelId, cadreId);
window.cameraOuvrirCameraPourConcours = (id) => ouvrirCameraPour(id, "concours");
