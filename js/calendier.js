import { db, auth, initFirebaseUser } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  let dateCourante = new Date();
  let moisAffiche = dateCourante.getMonth();
  let anneeAffichee = dateCourante.getFullYear();
  let historique = [];

  // Mois en français
  const moisFr = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  // Fonction principale pour charger l'historique depuis Firebase (users/UID/historique)
  async function chargerHistorique() {
    await initFirebaseUser();
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Suppose que tu stockes l'historique dans users/UID/historique (type : array)
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        // On fusionne solo/duel si stockés séparément, sinon adapte ici :
        let historiqueSolo = data.historique || [];
        let historiqueDuel = data.historiqueDuel || [];
        historique = [];

        historiqueSolo.forEach(e => {
          historique.push({
            date: e.date, // ISO
            defis: e.defi ? (Array.isArray(e.defi) ? e.defi : [e.defi]) : []
          });
        });
        historiqueDuel.forEach(e => {
          if (e.defis_duel && Array.isArray(e.defis_duel)) {
            let parts = e.date.split(',')[0].split('/');
            let dateISO = parts.length === 3 ? 
              `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : e.date;
            historique.push({
              date: dateISO,
              defis: e.defis_duel
            });
          }
        });
      } else {
        // Fallback si rien dans Firebase (optionnel, utile pour dev)
        let historiqueSolo = (JSON.parse(localStorage.getItem('vfindUserData')) || {}).historique || [];
        let historiqueDuel = JSON.parse(localStorage.getItem('vfindHistorique')) || [];
        historique = [];
        historiqueSolo.forEach(e => {
          historique.push({
            date: e.date,
            defis: e.defi ? (Array.isArray(e.defi) ? e.defi : [e.defi]) : []
          });
        });
        historiqueDuel.forEach(e => {
          if (e.defis_duel && Array.isArray(e.defis_duel)) {
            let parts = e.date.split(',')[0].split('/');
            let dateISO = parts.length === 3 ? 
              `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : e.date;
            historique.push({
              date: dateISO,
              defis: e.defis_duel
            });
          }
        });
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique :", err);
    }

    afficherCalendrier();
  }

  function afficherCalendrier() {
    document.getElementById('titre-mois').textContent = moisFr[moisAffiche] + ' ' + anneeAffichee;

    const premierJour = new Date(anneeAffichee, moisAffiche, 1);
    const nbJours = new Date(anneeAffichee, moisAffiche + 1, 0).getDate();

    const parJour = {};
    historique.forEach(entree => {
      let dateISO = entree.date.length === 10 ? entree.date : entree.date.slice(0,10);
      if (!parJour[dateISO]) parJour[dateISO] = [];
      parJour[dateISO] = parJour[dateISO].concat(entree.defis || []);
    });

    let html = '<div class="calendrier">';
    html += '<div class="sem">Lun</div><div class="sem">Mar</div><div class="sem">Mer</div><div class="sem">Jeu</div><div class="sem">Ven</div><div class="sem">Sam</div><div class="sem">Dim</div>';
    const decal = (premierJour.getDay() + 6) % 7;
    for (let i = 0; i < decal; i++) html += '<div class="jour vide"></div>';

    let totalDefisMois = 0;
    let totalDefisTous = 0;
    Object.values(parJour).forEach(list => totalDefisTous += list.length);

    for (let j = 1; j <= nbJours; j++) {
      const d = new Date(anneeAffichee, moisAffiche, j);
      const dstr = d.toISOString().slice(0, 10);
      const defisJour = parJour[dstr] || [];
      let color = "#fff";

      if (d < new Date()) {
        if (defisJour.length >= 3) color = "#089e29";
        else if (defisJour.length > 0) color = "#baffc7";
        else color = "#ff2c2c";
        totalDefisMois += defisJour.length;
      }
      html += `<div class="jour" style="background:${color}">${j}</div>`;
    }
    html += '</div>';

    document.getElementById('calendrier-container').innerHTML = html;
    document.getElementById('stats-calendrier').innerHTML =
      "Nombre de défis réalisés ce mois : <b>" + totalDefisMois + "</b><br>" +
      "Nombre de défis réalisés depuis le début : <b>" + totalDefisTous + "</b>";
  }

  document.getElementById("mois-prec").onclick = () => {
    moisAffiche--;
    if (moisAffiche < 0) {
      moisAffiche = 11;
      anneeAffichee--;
    }
    afficherCalendrier();
  };
  document.getElementById("mois-suiv").onclick = () => {
    moisAffiche++;
    if (moisAffiche > 11) {
      moisAffiche = 0;
      anneeAffichee++;
    }
    afficherCalendrier();
  };

  // Ajoute le style du calendrier (inline)
  const style = document.createElement('style');
  style.textContent = `
    .calendrier {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin: 1em auto;
      max-width: 420px;
    }
    .jour, .sem {
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .sem {
      background: none;
      color: #ccc;
      box-shadow: none;
    }
    .jour.vide {
      background: none;
      box-shadow: none;
    }
  `;
  document.head.appendChild(style);

  // Charge les données au démarrage
  chargerHistorique();
});
