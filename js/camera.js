export async function ouvrirCameraPour(defiId, mode = "solo", duelId = null) {
  return new Promise((resolve, reject) => {
    // UI Camera
    const container = document.createElement("div");
    container.className = "camera-container-fullscreen";
    container.innerHTML = `
      <video autoplay playsinline class="camera-video"></video>
      <div class="camera-controls camera-controls-pro">
        <button id="switchCamera" title="Changer de caméra" class="camera-btn">
          <span class="cam-ico">&#8635;</span>
          <span class="cam-label">Retourner</span>
        </button>
        <button id="takePhoto" class="camera-btn btn-capture" title="Prendre la photo">
          <span class="cam-ico cam-ico-big"></span>
        </button>
        <button id="closeCamera" title="Fermer" class="camera-btn camera-btn-close">
          <span class="cam-ico">&#10006;</span>
          <span class="cam-label">Fermer</span>
        </button>
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

    // ========== ZOOM CAMERA (PINCH/MOLETTE) ==========
    let camZoom = 1;
    let lastTouchDist = null;

    function setZoom(scale) {
      camZoom = Math.max(1, Math.min(scale, 6)); // Limite entre x1 et x6
      video.style.transform = `scale(${camZoom})`;
    }

    // Pinch-zoom (mobile)
    video.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });

    video.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && lastTouchDist) {
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
      if (e.touches.length < 2) lastTouchDist = null;
    }, { passive: false });

    // Double tap = reset zoom
    let lastTap = 0;
    video.addEventListener("touchend", function (e) {
      const now = Date.now();
      if (now - lastTap < 300 && e.touches.length === 0) {
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
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

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
            const supa = await import('./js/supabase.js');
            const urlPhoto = await supa.uploadPhotoDuelWebp(dataUrl, duelId);
            localStorage.setItem(`photo_duel_${duelId}_${supa.getUserId()}`, urlPhoto);
            if (window.savePhotoDuel) {
              await window.savePhotoDuel(defiId, urlPhoto);
            }
          } catch (err) {
            alert("Erreur upload Supabase : " + err.message);
          }
          if (videoStream) videoStream.getTracks().forEach(track => track.stop());
          container.remove();
          resolve();
        };
        cadreImg.onerror = () => alert("Erreur de chargement du cadre.");

      // --- CONCOURS ---
      } else if (mode === "concours") {
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
            const supa = await import('./js/supabase.js');
            const urlPhoto = await supa.uploadPhotoConcoursWebp(dataUrl, defiId);
            localStorage.setItem(`photo_concours_${defiId}_${supa.getUserId()}`, urlPhoto);
            if (window.savePhotoConcours) {
              await window.savePhotoConcours(defiId, urlPhoto);
            }
          } catch (err) {
            alert("Erreur upload Supabase : " + err.message);
          }
          if (videoStream) videoStream.getTracks().forEach(track => track.stop());
          container.remove();
          resolve();
        };
        cadreImg.onerror = () => alert("Erreur de chargement du cadre.");

      // --- SOLO ---
      } else if (mode === "solo") {
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
        if (window.afficherPhotoDansCadreSolo) {
          window.afficherPhotoDansCadreSolo(defiId, dataUrl);
        }
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        container.remove();
        resolve();

      // --- BASE64 "brut" ---
      } else if (mode === "base64") {
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
