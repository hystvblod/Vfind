import { supabase } from './js/supabase.js';

// ==== FONCTION D'UPLOAD PHOTO DUEL SUR SUPABASE STORAGE ====
async function uploadPhotoDuelWebp(dataUrl, duelId, userId) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  const file = new Blob([array], { type: "image/webp" });

  const fileName = `${duelId}_${userId}_${Date.now()}.webp`;
  let { error } = await supabase.storage.from('photosduel').upload(fileName, file, {
    cacheControl: '3600', upsert: true, contentType: 'image/webp'
  });
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from('photosduel').getPublicUrl(fileName);
  const publicUrl = publicUrlData.publicUrl;

  await supabase.from('photos_duel').insert([{
    duel_id: duelId,
    user_id: userId,
    photo_url: publicUrl,
    created_at: new Date().toISOString(),
    type: 'duel'
  }]);

  return publicUrl;
}

// ==== FONCTION D'UPLOAD PHOTO CONCOURS SUPABASE ====
async function uploadPhotoConcoursWebp(dataUrl, concoursId, userId) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  const file = new Blob([array], { type: "image/webp" });

  const fileName = `${concoursId}_${userId}_${Date.now()}.webp`;
  let { error } = await supabase.storage.from('photosconcours').upload(fileName, file, {
    cacheControl: '3600', upsert: true, contentType: 'image/webp'
  });
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from('photosconcours').getPublicUrl(fileName);
  const publicUrl = publicUrlData.publicUrl;

  await supabase.from('photos_concours').insert([{
    concours_id: concoursId,
    user_id: userId,
    photo_url: publicUrl,
    created_at: new Date().toISOString()
  }]);

  return publicUrl;
}

/**
 * Ouvre la caméra pour prendre une photo.
 * - DUEL: colle la photo sur le cadre, exporte le rendu webp, upload Supabase Storage (photosduel) et callback.
 * - CONCOURS: idem mais bucket 'photosconcours' + table 'photos_concours'.
 * - SOLO: photo seule, en localStorage.
 * - BASE64: retourne la photo seule en base64 (webp, 500x550).
 */
export async function ouvrirCameraPour(defiId, mode = "solo", userId = null, duelId = null) { 
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.className = "camera-container-fullscreen";
    container.innerHTML = `
      <video autoplay playsinline class="camera-video"></video>
      <div class="camera-controls">
        <button id="switchCamera" title="Changer de caméra">
          <img src="assets/icons/repeat.svg" alt="Switch camera" style="width:2.3em;height:2.3em;">
        </button>
        <button id="takePhoto" class="btn-capture" title="Prendre la photo">
          <img src="assets/icons/photo.svg" alt="Prendre une photo" style="width:2.3em;height:2.3em;">
        </button>
        <button id="closeCamera" title="Fermer" style="font-size:2.2em;">❌</button>
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
      // Canvas pour la photo
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

      const confirmSave = confirm("Souhaites-tu valider cette photo ?");
      if (!confirmSave) return;

      // --- DUEL ---
      if (mode === "duel") {
        if (!userId || !duelId) {
          alert("Erreur interne : userId ou duelId manquant.");
          return;
        }
        const cadreImg = new Image();
        cadreImg.src = `./assets/cadres/polaroid_01.webp`;
        cadreImg.onload = async () => {
          ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          try {
            const urlPhoto = await uploadPhotoDuelWebp(dataUrl, duelId, userId);
            if (window.savePhotoDuel) {
              await window.savePhotoDuel(defiId, urlPhoto);
            } else {
              alert("Erreur : fonction savePhotoDuel introuvable !");
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
        if (!userId || !defiId) { // defiId = concoursId ici
          alert("Erreur interne : userId ou concoursId manquant.");
          return;
        }
        const cadreImg = new Image();
        cadreImg.src = `./assets/cadres/polaroid_01.webp`;
        cadreImg.onload = async () => {
          ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          try {
            const urlPhoto = await uploadPhotoConcoursWebp(dataUrl, defiId, userId);
            if (window.savePhotoConcours) {
              await window.savePhotoConcours(defiId, urlPhoto);
            } else {
              alert("Photo concours envoyée !");
            }
          } catch (err) {
            alert("Erreur upload concours Supabase : " + err.message);
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

// ==== FONCTIONS GLOBALES POUR LE MODE DUEL ET CONCOURS ====
window.ouvrirCameraPour = ouvrirCameraPour;
window.cameraOuvrirCameraPourDuel = function(idx, userId, duelId) {
  ouvrirCameraPour(idx, "duel", userId, duelId);
};
window.cameraOuvrirCameraPourConcours = function(concoursId, userId) {
  ouvrirCameraPour(concoursId, "concours", userId);
};
