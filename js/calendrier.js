import { db, auth, initFirebaseUser } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  let dateCourante = new Date();
  let moisAffiche = dateCourante.getMonth();
  let anneeAffichee = dateCourante.getFullYear();
  let historique = [];
  let dateInscription = null;

  const moisFr = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  async function chargerHistoriqueEtInscription() {
    await initFirebaseUser();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        dateInscription = data.dateInscription ? new Date(data.dateInscription) : null;

        historique = [];

        // Historique solo
        (data.historique || []).forEach(e => {
          historique.push({
            date: e.date,
            defis: e.defi ? (Array.isArray(e.defi) ? e.defi : [e.defi]) : [],
            type: "solo"
          });
        });

        // Historique duel
        (data.historiqueDuel || []).forEach(e => {
          if (e.defis_duel && Array.isArray(e.defis_duel)) {
            let parts = e.date.split(',')[0].split('/');
            let dateISO = parts.length === 3 ?
              `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : e.date;
            let type = e.type === 'amis' ? 'duel_amis' : 'duel_random';
            historique.push({
              date: dateISO,
              defis: e.defis_duel,
              type: type
            });
          }
        });

        // Si pas de date inscription, prendre la plus ancienne date historique
        if (!dateInscription && historique.length) {
          let minDate = historique
            .map(e => new Date(e.date))
            .sort((a, b) => a - b)[0];
          dateInscription = minDate || new Date();
        }
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

    // Regroupe les défis par jour et par type
    const soloParJour = {};
    const duelRandomParJour = {};
    const duelAmisParJour = {};

    historique.forEach(entree => {
      let dateISO = entree.date && entree.date.length === 10 ? entree.date : (entree.date || '').slice(0, 10);
      if (entree.type === "solo") {
        soloParJour[dateISO] = (soloParJour[dateISO] || []).concat(entree.defis || []);
      }
      if (entree.type === "duel_random") {
        duelRandomParJour[dateISO] = (duelRandomParJour[dateISO] || []).concat(entree.defis || []);
      }
      if (entree.type === "duel_amis") {
        duelAmisParJour[dateISO] = (duelAmisParJour[dateISO] || []).concat(entree.defis || []);
      }
    });

    let html = '<div class="calendrier">';
    html += '<div class="sem">Lun</div><div class="sem">Mar</div><div class="sem">Mer</div><div class="sem">Jeu</div><div class="sem">Ven</div><div class="sem">Sam</div><div class="sem">Dim</div>';
    const decal = (premierJour.getDay() + 6) % 7;
    for (let i = 0; i < decal; i++) html += '<div class="jour vide"></div>';

    let totalDefisMois = 0;
    let totalDefisTous = 0;
    Object.values(soloParJour).forEach(list => totalDefisTous += list.length);
    Object.values(duelRandomParJour).forEach(list => totalDefisTous += list.length);
    Object.values(duelAmisParJour).forEach(list => totalDefisTous += list.length);

    for (let j = 1; j <= nbJours; j++) {
      const d = new Date(anneeAffichee, moisAffiche, j);
      const dstr = d.toISOString().slice(0, 10);
      let color = "#fff";

      let soloCount = soloParJour[dstr]?.length || 0;
      let duelRandCount = duelRandomParJour[dstr]?.length || 0;
      let duelAmisCount = duelAmisParJour[dstr]?.length || 0;

      if (!dateInscription || d < dateInscription) {
        color = "#fff";
      } else if (d > new Date()) {
        color = "#fff";
      } else {
        const totalJour = soloCount + duelRandCount + duelAmisCount;
        if (totalJour === 0) {
          color = "#ff2c2c"; // rouge
        } else if (
          soloCount === 3 || duelRandCount === 3 || duelAmisCount === 3
        ) {
          color = "#089e29"; // vert foncé
        } else {
          color = "#baffc7"; // vert clair
        }
        totalDefisMois += totalJour;
      }

      html += `<div class="jour" style="background:${color}; color:${color === '#fff' ? '#000' : '#fff'}">${j}</div>`;
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

  chargerHistoriqueEtInscription();
});
