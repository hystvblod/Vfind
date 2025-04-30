
let classifier;
let currentChallenge = "";

function preloadModel() {
  ml5.imageClassifier('MobileNet')
    .then(model => {
      classifier = model;
      console.log("Modèle IA chargé.");
    })
    .catch(err => console.error("Erreur de chargement IA :", err));
}

function takePhoto() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("photoCanvas");
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL("image/png");
  analysePhoto(imageData);
}

function analysePhoto(photoData) {
  const img = new Image();
  img.src = photoData;
  img.onload = () => {
    classifier.classify(img)
      .then(results => {
        const bestMatch = results[0].label.toLowerCase();
        const isValid = bestMatch.includes(currentChallenge.toLowerCase());
        alert(isValid ? "✅ Défi réussi !" : "❌ Essayez encore...");
      })
      .catch(err => console.error("Erreur IA :", err));
  };
}

window.addEventListener("DOMContentLoaded", () => {
  preloadModel();

  const video = document.getElementById("video");
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
        video.play();
      })
      .catch(err => console.error("Erreur caméra :", err));
  }

  document.getElementById("btn-photo").addEventListener("click", takePhoto);
});
