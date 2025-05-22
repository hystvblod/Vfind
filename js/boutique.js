// === INITIALISATION FIREBASE SI PAS DÉJÀ FAIT (version pro, compatible multi-pages) ===
if (!window.firebaseAppInit) {
  window.firebaseAppInit = true;
  import("https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js").then(({ initializeApp }) => {
    window.firebaseApp = initializeApp({
      apiKey: "AIzaSyD2AttV3LYAsWShgIMEPIvfpc6wmPpsK3U",
      authDomain: "vfind-12866.firebaseapp.com",
      projectId: "vfind-12866",
      storageBucket: "vfind-12866.appspot.com",
      messagingSenderId: "953801570333",
      appId: "1:953801570333:web:92ed5e604d0df316046ef4",
      measurementId: "G-WTSN5KCBDJ"
    });
    import("https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js").then(({ getAuth, onAuthStateChanged, signInAnonymously }) => {
      window.firebaseAuth = getAuth(window.firebaseApp);
      onAuthStateChanged(window.firebaseAuth, (user) => {
        if (!user) signInAnonymously(window.firebaseAuth);
      });
    });
    import("https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js").then((fb) => {
      window.firebaseFirestore = fb;
      window.firebaseDB = fb.getFirestore(window.firebaseApp);
    });
  });
}

// === Attendre que Firebase soit prêt ===
function waitForFirebaseAuthReady() {
  return new Promise(resolve => {
    function check() {
      if (window.firebaseAuth && window.firebaseDB && window.firebaseFirestore && window.firebaseAuth.currentUser) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    }
    check();
  });
}

async function getUserDocRef() {
  await waitForFirebaseAuthReady();
  const user = window.firebaseAuth.currentUser;
  return window.firebaseFirestore.doc(window.firebaseDB, "users", user.uid);
}

async function getUserDataCloud() {
  await waitForFirebaseAuthReady();
  const ref = await getUserDocRef();
  const snap = await window.firebaseFirestore.getDoc(ref);
  if (snap.exists()) return snap.data();
  // Création si jamais le doc n’existe pas
  await window.firebaseFirestore.setDoc(ref, {
    pseudo: "Joueur",
    points: 100,
    jetons: 3,
    cadres: ["polaroid_01", "polaroid_02"],
    demandesRecues: [],
    demandesEnvoyees: [],
    amis: [],
    photoProfil: "",
    premium: false
  });
  return (await window.firebaseFirestore.getDoc(ref)).data();
}

async function updateUserDataCloud(update) {
  const ref = await getUserDocRef();
  await window.firebaseFirestore.updateDoc(ref, update);
}

// Helpers cloud (uniquement Firestore)
async function getPoints() { return (await getUserDataCloud()).points || 0; }
async function addPoints(n) {
  const data = await getUserDataCloud();
  await updateUserDataCloud({ points: (data.points || 0) + n });
}
async function removePoints(n) {
  const data = await getUserDataCloud();
  if ((data.points || 0) >= n) {
    await updateUserDataCloud({ points: data.points - n });
    return true;
  }
  return false;
}
async function getJetons() { return (await getUserDataCloud()).jetons || 0; }
async function addJetons(n) {
  const data = await getUserDataCloud();
  await updateUserDataCloud({ jetons: (data.jetons || 0) + n });
}
async function possedeCadre(id) {
  const data = await getUserDataCloud();
  return (data.cadres || []).includes(id);
}
async function acheterCadre(id) {
  const data = await getUserDataCloud();
  if (!(data.cadres || []).includes(id)) {
    await updateUserDataCloud({ cadres: [...(data.cadres || []), id] });
  }
}
async function getOwnedFrames() {
  const data = await getUserDataCloud();
  return data.cadres || [];
}
async function isPremium() {
  const data = await getUserDataCloud();
  return !!data.premium;
}

async function updatePointsDisplay() {
  const pointsDisplay = document.getElementById("points");
  if (pointsDisplay) pointsDisplay.textContent = await getPoints();
}
async function updateJetonsDisplay() {
  const jetonsSpan = document.getElementById("jetons");
  if (jetonsSpan) jetonsSpan.textContent = await getJetons();
}

// --- Feedback popups ---
function showFeedback(text) {
  const feedback = document.getElementById("gain-feedback");
  if (!feedback) return;
  feedback.textContent = text;
  feedback.classList.remove("hidden");
  feedback.classList.add("show");
  setTimeout(() => {
    feedback.classList.remove("show");
    feedback.classList.add("hidden");
  }, 1500);
}

// --- Acheter cadre depuis boutique (cloud) ---
async function acheterCadreBoutique(id, prix) {
  if (!(await removePoints(prix))) {
    alert("❌ Pas assez de pièces !");
    return;
  }
  await acheterCadre(id);
  await updatePointsDisplay();
  alert("✅ Cadre acheté !");
  await renderBoutique(currentCategory); // recharge uniquement la catégorie actuelle
}

// --- Popups et pub ---
window.closePopup = function () {
  const popupGain = document.getElementById("popup-gain");
  if (popupGain) {
    popupGain.classList.remove("show");
    popupGain.classList.add("hidden");
  }
  const oldUnlock = document.getElementById("popup-unlock-info");
  if (oldUnlock) document.body.removeChild(oldUnlock);
};

// Ouvre la popup "gagner pièces"
window.ouvrirPopupGain = function () {
  const popup = document.getElementById("popup-gain");
  if (popup) {
    popup.classList.remove("hidden");
    popup.classList.add("show");
  }
};
// Ferme la popup "gagner pièces"
window.fermerPopupGain = function () {
  const popup = document.getElementById("popup-gain");
  if (popup) {
    popup.classList.remove("show");
    popup.classList.add("hidden");
  }
}

function showUnlockPopup(nom, message) {
  const oldPopup = document.getElementById("popup-unlock-info");
  if (oldPopup) document.body.removeChild(oldPopup);
  const popup = document.createElement("div");
  popup.id = "popup-unlock-info";
  popup.className = "popup show";
  popup.innerHTML = `
    <div class="popup-inner">
      <button id="close-popup" onclick="document.body.removeChild(this.parentNode.parentNode)">✖</button>
      <h2 style="font-size:1.4em;">${nom}</h2>
      <div style="margin:1em 0 0.5em 0;font-size:1.1em;text-align:center;">${message || "Aucune information."}</div>
    </div>
  `;
  document.body.appendChild(popup);
}

// Gagne des pièces via pub simulée
window.watchAd = async function () {
  await addPoints(100);
  await updatePointsDisplay();
  showFeedback("+100 💰");
  closePopup();
};

// === Parrainage code Firebase (UID) ===
window.inviteFriend = async function () {
  await waitForFirebaseAuthReady();
  const uid = window.firebaseAuth.currentUser.uid;
  const lien = window.location.origin + "/profil.html?parrain=" + uid;
  prompt("Partage ce lien à ton ami pour qu’il s’inscrive et que tu gagnes 300 pièces :\n\n" + lien + "\n\n(Ton ami doit cliquer sur ce lien AVANT sa première connexion)");
};

// --- Popup achat jetons ---
window.ouvrirPopupJetonBoutique = function () {
  const popup = document.getElementById("popup-achat-jeton");
  if (popup) {
    popup.classList.remove("hidden");
    popup.classList.add("show");
  }
}
window.fermerPopupJetonBoutique = function () {
  const popup = document.getElementById("popup-achat-jeton");
  if (popup) {
    popup.classList.remove("show");
    popup.classList.add("hidden");
  }
}

window.acheterJetonsAvecPieces = async function () {
  if (await removePoints(100)) {
    await addJetons(3);
    alert("✅ 3 jetons ajoutés !");
    await updatePointsDisplay();
    await updateJetonsDisplay();
    fermerPopupJetonBoutique();
  } else {
    alert("❌ Pas assez de pièces.");
  }
}

window.acheterJetonsAvecPub = async function () {
  alert("📺 Simulation de pub regardée !");
  setTimeout(async () => {
    await addJetons(3);
    alert("✅ 3 jetons ajoutés !");
    await updateJetonsDisplay();
    fermerPopupJetonBoutique();
  }, 3000);
}

setTimeout(() => {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.style.overflowX = "hidden";
}, 100);

document.addEventListener("click", function (e) {
  const popupGain = document.getElementById("popup-gain");
  if (popupGain && popupGain.classList.contains("show") && e.target === popupGain) {
    closePopup();
  }
});

// ----- Gestion catégories -----
const CATEGORIES = [
  { key: 'classique', nom: 'Classique' },
  { key: 'deluxe', nom: 'Deluxe' },
  { key: 'premium', nom: 'Premium' },
  { key: 'bloque', nom: 'Défi / Spéciaux 🔒' }
];

function getCategorie(id) {
  const num = parseInt(id.replace('polaroid_', ''));
  if (num >= 1 && num <= 10) return 'classique';
  if (num >= 11 && num <= 100) return 'deluxe';
  if (num >= 101 && num <= 200) return 'premium';
  if (num >= 900 && num <= 1000) return 'bloque';
  return 'autre';
}

// --- 10 jours complet pour débloquer polaroid_901 ---
function hasCompleted10FullDaysStrict() {
  // À adapter si historique dans Firestore
  return false;
}

let CADRES_DATA = [];
let currentCategory = 'classique';

async function renderBoutique(categoryKey) {
  const catBarContainer = document.getElementById("boutique-categories");
  const boutiqueContainer = document.getElementById("boutique-container");

  catBarContainer.innerHTML = "";
  const bar = document.createElement("div");
  bar.className = "categories-bar";
  CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat.nom;
    btn.className = "btn-categorie" + (cat.key === categoryKey ? " active" : "");
    btn.onclick = () => {
      currentCategory = cat.key;
      renderBoutique(cat.key);
    };
    bar.appendChild(btn);
  });
  catBarContainer.appendChild(bar);

  boutiqueContainer.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "grid-cadres";

  const cadresCat = CADRES_DATA.filter(cadre => getCategorie(cadre.id) === categoryKey);
  let ownedFrames = await getOwnedFrames();

  if (!cadresCat.length) {
    const empty = document.createElement("p");
    empty.textContent = "Aucun cadre dans cette catégorie.";
    grid.appendChild(empty);
  } else {
    for (let cadre of cadresCat) {
      const item = document.createElement("div");
      item.classList.add("cadre-item");

      const wrapper = document.createElement("div");
      wrapper.classList.add("cadre-preview");
      wrapper.style.width = "80px";
      wrapper.style.height = "100px";
      wrapper.style.position = "relative";
      wrapper.style.margin = "0 auto 10px";

      const cadreImg = document.createElement("img");
      cadreImg.src = `assets/cadres/${cadre.id}.webp`;
      cadreImg.className = "photo-cadre";

      const photo = document.createElement("img");
      photo.src = "assets/img/exemple.jpg";
      photo.className = "photo-user";

      wrapper.appendChild(cadreImg);
      wrapper.appendChild(photo);

      wrapper.addEventListener("click", () => {
        const popup = document.createElement("div");
        popup.className = "popup show";
        popup.innerHTML = `
          <div class="popup-inner">
            <button id="close-popup" onclick="document.body.removeChild(this.parentNode.parentNode)">✖</button>
            <div class="cadre-preview cadre-popup">
              <img class="photo-cadre" src="assets/cadres/${cadre.id}.webp" />
              <img class="photo-user" src="assets/img/exemple.jpg" />
            </div>
          </div>
        `;
        document.body.appendChild(popup);
      });

      const title = document.createElement("h3");
      title.textContent = cadre.nom;

      const price = document.createElement("p");
      price.textContent = `${cadre.prix} pièces`;

      const button = document.createElement("button");

      if (categoryKey === "bloque") {
        if (cadre.id === "polaroid_901") {
          if (hasCompleted10FullDaysStrict()) {
            if (!ownedFrames.includes(cadre.id)) {
              await acheterCadre(cadre.id);
              ownedFrames = await getOwnedFrames();
            }
            button.textContent = "Débloqué !";
            button.disabled = true;
            button.classList.add("btn-success");
          } else {
            button.textContent = "Infos";
            button.disabled = false;
            button.classList.add("btn-info");
            button.onclick = () =>
              showUnlockPopup(cadre.nom, cadre.unlock || "Valide 10 jours de défi pour débloquer ce cadre.");
          }
        } else {
          button.textContent = "Infos";
          button.disabled = false;
          button.classList.add("btn-info");
          button.onclick = () =>
            showUnlockPopup(cadre.nom, cadre.unlock || "Aucune information pour ce cadre.");
        }
      } else if (categoryKey === "premium" && !(await isPremium())) {
        button.textContent = "Premium requis";
        button.disabled = true;
        button.classList.add("disabled-premium");
        button.title = "Ce cadre nécessite un compte premium";
      } else if (ownedFrames.includes(cadre.id)) {
        button.textContent = "Acheté";
        button.disabled = true;
      } else {
        button.textContent = "Acheter";
        button.addEventListener("click", () => acheterCadreBoutique(cadre.id, cadre.prix));
      }

      item.appendChild(wrapper);
      item.appendChild(title);
      item.appendChild(price);
      item.appendChild(button);
      grid.appendChild(item);
    }
  }
  boutiqueContainer.appendChild(grid);
}

// --- Initialisation principale ---
document.addEventListener("DOMContentLoaded", async () => {
  await waitForFirebaseAuthReady();
  fetch("data/cadres.json")
    .then(res => res.json())
    .then(async data => {
      CADRES_DATA = data;
      await renderBoutique(currentCategory);
      await updatePointsDisplay();
      await updateJetonsDisplay();
    });

  // Met à jour le solde aussi au focus (pour éviter la désynchro si retour sur page)
  window.addEventListener("focus", async () => {
    await updatePointsDisplay();
    await updateJetonsDisplay();
  });

  // Ajoute ouverture popup gagner pièces sur bouton (sécurité, si jamais le HTML ne l’a pas en onclick)
  const gainBtn = document.getElementById("gain-btn");
  if (gainBtn) gainBtn.onclick = window.ouvrirPopupGain;

  const jetonBtn = document.getElementById("jeton-btn");
  if (jetonBtn) jetonBtn.onclick = window.ouvrirPopupJetonBoutique;
});
