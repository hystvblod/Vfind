let videoStream = null;
const VIDEO_WIDTH = 500;
const VIDEO_HEIGHT = 580;

function ouvrirCameraPour(defiId) {
  const container = document.createElement("div");
  container.className = "camera-container";

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  container.appendChild(video);

  const captureBtn = document.createElement("button");
  captureBtn.textContent = "Prendre la photo";
  captureBtn.className = "btn-capture";
  container.appendChild(captureBtn);

  document.body.appendChild(container);

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      videoStream = stream;
      video.srcObject = stream;
    })
    .catch(err => {
      alert("Erreur d’accès à la caméra : " + err);
    });

  captureBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    const confirmSave = confirm("Souhaites-tu valider cette photo ?");
    if (confirmSave) {
      localStorage.setItem(`photo_defi_${defiId}`, dataUrl);

      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }

      container.remove();
      location.reload();
    }
    // sinon on ne fait rien → la caméra reste ouverte
  });
}
