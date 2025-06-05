import { uploadPhotoDuelWebp, savePhotoDuel } from "./duel.js";
import { getUserId, getCadreSelectionne } from "./userData.js";

// Fonctions d'ouverture (compat global, mais ES6 only)
export async function ouvrirCameraPour(defiId, mode = "solo", duelId = null, cadreId = null) {
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
  // Capture la frame courante
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext("2d");

  const sx = (video.videoWidth - video.videoWidth / camZoom) / 2;
  const sy = (video.videoHeight - video.videoHeight / camZoom) / 2;
  const sWidth = video.videoWidth / camZoom;
  const sHeight = video.videoHeight / camZoom;
  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Stoppe la caméra immédiatement (plus de mouvement)
  if (videoStream) videoStream.getTracks().forEach(track => track.stop());
  video.srcObject = null;

  // Affiche un aperçu de la photo figée avec boutons
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

  // Si valide la photo
  previewDiv.querySelector("#validerPhoto").onclick = async () => {
    const dataUrl = canvas.toDataURL("image/webp", 0.85);

    if (mode === "duel") {
      if (!duelId) return alert("Erreur interne : duelId manquant.");
      if (!cadreId) cadreId = "polaroid_01";
      const cadreImg = new Image();
      cadreImg.src = `./assets/cadres/${cadreId}.webp`;
      cadreImg.onload = async () => {
        ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
        ctx.drawImage(canvas, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT); // On superpose (si besoin)
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        try {
          const urlPhoto = await uploadPhotoDuelWebp(dataUrl, duelId, defiId, cadreId);
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

  // Si l'utilisateur veut reprendre la photo : on relance la caméra !
  previewDiv.querySelector("#retakePhoto").onclick = () => {
    previewDiv.remove();
    container.querySelector(".camera-video-zone").style.display = "";
    startCamera();
  };
};


// Pour compatibilité, si tu veux garder le window pour les vieux appels, ajoute :
window.ouvrirCameraPour = ouvrirCameraPour;
window.cameraOuvrirCameraPourDuel = function(idx, duelId, cadreId) {
  ouvrirCameraPour(idx, "duel", duelId, cadreId);
};
window.cameraOuvrirCameraPourConcours = function(concoursId) {
  ouvrirCameraPour(concoursId, "concours");
};
