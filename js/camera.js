// ==== FONCTION D'UPLOAD PHOTO DUEL SUR SUPABASE STORAGE ====
// Nécessite l'import Supabase configuré :
import { supabase } from './js/supabase.js';

/**
 * Upload une image webp vers Supabase Storage puis enregistre l'URL dans la table photos_duel.
 * @param {string} dataUrl   - image webp en base64
 * @param {string} duelId    - id du duel
 * @param {string} userId    - id utilisateur
 * @returns {Promise<string>} URL publique de la photo
 */
async function uploadPhotoDuelWebp(dataUrl, duelId, userId) {
  // Conversion base64 en Blob webp
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  const file = new Blob([array], { type: "image/webp" });

  // Nom unique pour le fichier (évite les conflits)
  const fileName = `${duelId}_${userId}_${Date.now()}.webp`;

  // 1. Upload dans Supabase Storage
  let { data, error } = await supabase.storage.from('photosduel').upload(fileName, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'image/webp'
  });
  if (error) throw error;

  // 2. Récupère l'URL publique
  const { data: publicUrlData } = supabase.storage.from('photosduel').getPublicUrl(fileName);
  const publicUrl = publicUrlData.publicUrl;

  // 3. Ajoute la ligne en table photos_duel
  await supabase.from('photos_duel').insert([{
    duel_id: duelId,
    user_id: userId,
    photo_url: publicUrl,
    created_at: new Date().toISOString(),
    type: 'duel'
  }]);

  return publicUrl;
}

/**
 * Ouvre la caméra pour prendre une photo.
 * - Si mode "duel" = colle la photo sur le cadre, exporte le rendu webp, puis l'envoie sur Supabase Storage et callback duel.
 * - Si mode "solo" = enregistre la photo seule dans le localStorage.
 * - Si mode "base64" = retourne la photo seule en base64 (ex: concours).
 *
 * @param {string} defiId   - id du défi ou du contexte (ex: "concours")
 * @param {string} mode     - "solo" | "duel" | "base64"
 * @param {string} [userId] - id utilisateur (pour le duel)
 * @param {string} [duelId] - id duel (pour le duel)
 * @returns {Promise<string|void>} base64 si mode "base64", sinon rien
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
    // ... (le reste du code ne change pas)
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
      // Crée le canvas pour la photo
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

      const confirmSave = confirm("Souhaites-tu valider cette photo ?");
      if (!confirmSave) return;

      if (mode === "duel") {
        // ==== Mode Duel : on colle la photo sur le cadre avant export webp ====
        if (!userId || !duelId) {
          alert("Erreur interne : userId ou duelId manquant.");
          return;
        }
        // Charge le cadre (statique ou dynamique selon le joueur)
        const cadreImg = new Image();
        cadreImg.src = `./assets/cadres/polaroid_01.webp`; // adapter dynamiquement si besoin !
        cadreImg.onload = async () => {
          // Dessine le cadre par-dessus la photo dans le même canvas
          ctx.drawImage(cadreImg, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          try {
            // Upload sur Supabase Storage, récupère l'URL publique
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
          resolve(); // Rien à retourner
        };
        cadreImg.onerror = () => {
          alert("Erreur de chargement du cadre.");
        };
      } else if (mode === "solo") {
        // ==== Mode Solo ==== (pas de collage cadre)
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
        if (window.afficherPhotoDansCadreSolo) {
          window.afficherPhotoDansCadreSolo(defiId, dataUrl);
        }
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        container.remove();
        resolve();
      } else if (mode === "base64" || mode === "concours") {
        // ==== Mode concours (ou autre mode spécial qui veut juste le base64) ====
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        container.remove();
        resolve(dataUrl); // On retourne le base64 !
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

// ==== FONCTIONS GLOBALES POUR LE MODE DUEL (compatibilité duel.js) ====
// Pour duel : passer userId et duelId
window.ouvrirCameraPour = ouvrirCameraPour;
window.cameraOuvrirCameraPourDuel = function(idx, userId, duelId) {
  ouvrirCameraPour(idx, "duel", userId, duelId);
};
