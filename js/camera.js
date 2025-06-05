export async function ouvrirCameraPour(defiId, mode = "solo", duelId = null) {
  return new Promise((resolve, reject) => {
    // Structure HTML ultra clean :
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

    // Selecteurs
    const video = container.querySelector("video");
    const switchBtn = container.querySelector("#switchCamera");
    const takeBtn = container.querySelector("#takePhoto");
    const closeBtn = container.querySelector


    let videoStream = null;
    let useFrontCamera = false;
    const VIDEO_WIDTH = 500;
    const VIDEO_HEIGHT = 550;

    // ========== ZOOM CAMERA (PINCH/MOLETTE, PATCH UX) ==========
    let camZoom = 1;
    let lastTouchDist = null;
    let isPinching = false;

    function setZoom(scale) {
      camZoom = Math.max(1, Math.min(scale, 6)); // Limite entre x1 et x6
      video.style.transform = `scale(${camZoom})`;
    }

    // Pinch-zoom (mobile)
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

    // Double tap = reset zoom
    let lastTap = 0;
    video.addEventListener("touchend", function (e) {
      const now = Date.now();
      if (!isPinching && e.touches.length === 0 && now - lastTap < 300) {
        setZoom(1);
      }
      lastTap = now;
    });

    // Zoom molette (desktop)
    video.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;
      setZoom(camZoom + (e.deltaY < 0 ? 0.10 : -0.10));
      e.preventDefault();
    }, { passive: false });
    // ========== / ZOOM CAMERA ==========

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
      if (isPinching) return; // Empêche la prise de photo si tu es en pinch-zoom
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");

      // --- Capture zoomée (ce que tu vois, même zoom) ---
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
        cadreImg.src = `./assets/cadres/polaroid_01.webp`;
        cadreImg.onload = async () => {
          ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          try {
  if (uploadPhotoDuelWebp && getUserId) {
  // il FAUT passer l’index comme 3e argument !
  const urlPhoto = await window.uploadPhotoDuelWebp(dataUrl, duelId, defiId);
  localStorage.setItem(`photo_duel_${duelId}_${window.getUserId()}`, urlPhoto);
  if (window.savePhotoDuel) {
    await window.savePhotoDuel(defiId, urlPhoto);
  }
} else {
  alert("Fonction d'upload duel non trouvée !");
}

          } catch (err) {
            alert("Erreur upload duel : " + err.message);
          }
          if (videoStream) videoStream.getTracks().forEach(track => track.stop());
          container.remove();
          resolve();
        };
        cadreImg.onerror = () => alert("Erreur de chargement du cadre.");
      }
      // --- CONCOURS ---
      else if (mode === "concours") {
        if (!defiId) {
          alert("Erreur interne : concoursId manquant.");
          return;
        }
        const cadreImg = new Image();
        cadreImg.src = `./assets/cadres/polaroid_01.webp`;
        cadreImg.onload = async () => {
          ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          try {
            if (window.uploadPhotoConcoursWebp && window.getUserId) {
              const urlPhoto = await window.uploadPhotoConcoursWebp(dataUrl, defiId);
              localStorage.setItem(`photo_concours_${defiId}_${window.getUserId()}`, urlPhoto);
              if (window.savePhotoConcours) {
                await window.savePhotoConcours(defiId, urlPhoto);
              }
            } else {
              alert("Fonction d'upload concours non trouvée !");
            }
          } catch (err) {
            alert("Erreur upload concours : " + err.message);
          }
          if (videoStream) videoStream.getTracks().forEach(track => track.stop());
          container.remove();
          resolve();
        };
        cadreImg.onerror = () => alert("Erreur de chargement du cadre.");
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
        resolve();
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

// ==== Fonctions globales pour compatibilité boutons/événements ====
window.ouvrirCameraPour = ouvrirCameraPour;
window.cameraOuvrirCameraPourDuel = function(idx, duelId) {
  ouvrirCameraPour(idx, "duel", duelId);
};
window.cameraOuvrirCameraPourConcours = function(concoursId) {
  ouvrirCameraPour(concoursId, "concours");
};
