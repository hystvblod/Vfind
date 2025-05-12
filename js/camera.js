let videoStream = null;
const VIDEO_WIDTH = 500;
const VIDEO_HEIGHT = 580;

function ouvrirCameraPour(defiId) {
  let videoStream = null;
  const VIDEO_WIDTH = 500;
  const VIDEO_HEIGHT = 580;

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

  let useFrontCamera = false;

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

  takeBtn.onclick = () => {
    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    const confirmSave = confirm("Souhaites-tu valider cette photo ?");
    if (confirmSave) {
      localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
      setTimeout(() => location.reload(), 200);
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      container.remove();
      location.reload();
    }
  };

  closeBtn.onclick = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    container.remove();
  };

  startCamera();
}
