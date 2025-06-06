import { supabase, getUserId, loadUserData } from './userData.js'; // Optimisé Supabase fourni dans ta dernière version

document.addEventListener("DOMContentLoaded", async () => {
  let dateCourante = new Date();
  let moisAffiche = dateCourante.getMonth();
  let anneeAffichee = dateCourante.getFullYear();
  let historique = [];
  let dateInscription = null;
  const moisFr = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  // ---- CHARGEMENT HISTORIQUE EN 1 REQUÊTE ----
  async function chargerHistoriqueEtInscription() {
    await loadUserData(); // Auth automatique
    const userId = getUserId();
    if (!userId) return;
    // Récupère l'utilisateur
    const { data, error } = await supabase
      .from('users')
      .select('historique, dateInscription')
      .eq('id', userId)
      .single();

    if (!data) return;
    dateInscription = data.dateInscription ? new Date(data.dateInscription) : null;
    historique = (data.historique || []).map(e => ({
      date: e.date,
      defis: e.defis || e.defi || [],
      type: e.type || "solo"
    }));

    // Si pas de date inscription, prend la plus ancienne date
    if (!dateInscription && historique.length) {
      let minDate = historique
        .map(e => new Date(e.date))
        .sort((a, b) => a - b)[0];
      dateInscription = minDate || new Date();
    }
    afficherCalendrier();
  }

  function afficherCalendrier() {
    document.getElementById('titre-mois').textContent = moisFr[moisAffiche] + ' ' + anneeAffichee;
    const premierJour = new Date(anneeAffichee, moisAffiche, 1);
    const nbJours = new Date(anneeAffichee, moisAffiche + 1, 0).getDate();

    // Regroupe par jour et par type
    const soloParJour = {}, duelRandomParJour = {}, duelAmisParJour = {};
    historique.forEach(entree => {
      let dateISO = entree.date && entree.date.length === 10 ? entree.date : (entree.date || '').slice(0, 10);
      if (entree.type === "solo") soloParJour[dateISO] = (soloParJour[dateISO] || []).concat(entree.defis || []);
      if (entree.type === "duel_random") duelRandomParJour[dateISO] = (duelRandomParJour[dateISO] || []).concat(entree.defis || []);
      if (entree.type === "duel_amis") duelAmisParJour[dateISO] = (duelAmisParJour[dateISO] || []).concat(entree.defis || []);
    });

    let html = '<div class="calendrier">';
    html += '<div class="sem">Lun</div><div class="sem">Mar</div><div class="sem">Mer</div><div class="sem">Jeu</div><div class="sem">Ven</div><div class="sem">Sam</div><div class="sem">Dim</div>';
    const decal = (premierJour.getDay() + 6) % 7;
    for (let i = 0; i < decal; i++) html += '<div class="jour vide"></div>';

    let totalDefisMois = 0, totalDefisTous = 0;
    Object.values(soloParJour).forEach(list => totalDefisTous += list.length);
    Object.values(duelRandomParJour).forEach(list => totalDefisTous += list.length);
    Object.values(duelAmisParJour).forEach(list => totalDefisTous += list.length);

    for (let j = 1; j <= nbJours; j++) {
      const d = new Date(anneeAffichee, moisAffiche, j);
      const dstr = d.toISOString().slice(0, 10);
      let color = "#fff";
      let textColor = "#222";
      let soloCount = soloParJour[dstr]?.length || 0;
      let duelRandCount = duelRandomParJour[dstr]?.length || 0;
      let duelAmisCount = duelAmisParJour[dstr]?.length || 0;
      let classes = "jour";

      // AVANT inscription (gris clair)
      if (!dateInscription || d < new Date(dateInscription.getFullYear(), dateInscription.getMonth(), dateInscription.getDate())) {
        color = "#f1f1f1";
        textColor = "#bbb";
        classes += " jour-grise";
      }
      // JOUR INSCRIPTION (jaune)
      else if (dateInscription && d.toDateString() === dateInscription.toDateString()) {
        color = "#ffe04a";
        textColor = "#222";
        classes += " jour-inscription";
      }
      // APRES inscription (couleurs selon les défis)
      else if (d > new Date()) {
        color = "#fff";
        textColor = "#bbb";
        classes += " jour-futur";
      } else {
        const totalJour = soloCount + duelRandCount + duelAmisCount;
        if (totalJour === 0) {
          color = "#ff2c2c"; // rouge
          textColor = "#fff";
        } else if (
          soloCount === 3 || duelRandCount === 3 || duelAmisCount === 3
        ) {
          color = "#089e29"; // vert foncé
          textColor = "#fff";
        } else {
          color = "#baffc7"; // vert clair
          textColor = "#222";
        }
        totalDefisMois += totalJour;
      }

      html += `<div class="${classes}" style="background:${color}; color:${textColor}">${j}</div>`;
    }

    html += '</div>';
    document.getElementById('calendrier-container').innerHTML = html;
    document.getElementById('stats-calendrier').innerHTML =
      "Défis ce mois : <b>" + totalDefisMois + "</b> &nbsp;·&nbsp; Depuis le début : <b>" + totalDefisTous + "</b>";
  }

  document.getElementById("mois-prec").onclick = () => {
    moisAffiche--;
    if (moisAffiche < 0) { moisAffiche = 11; anneeAffichee--; }
    afficherCalendrier();
  };
  document.getElementById("mois-suiv").onclick = () => {
    moisAffiche++;
    if (moisAffiche > 11) { moisAffiche = 0; anneeAffichee++; }
    afficherCalendrier();
  };

  // Ajout style auto inclus pour le calendrier (à déplacer en CSS si besoin)
  const style = document.createElement('style');
  style.textContent = `
    .calendrier {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 7px;
      margin: 1.2em auto 1.5em;
      max-width: 420px;
    }
    .jour, .sem {
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.09rem;
      border-radius: 9px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.13);
      transition: background .16s;
      cursor: default;
    }
    .sem {
      background: none;
      color: #aaa;
      box-shadow: none;
      font-size: 0.97em;
      font-weight: 600;
    }
    .jour.vide {
      background: none;
      box-shadow: none;
    }
    .jour-grise { opacity: 1 !important; }
    .jour-inscription { border:2.5px solid #ffe04a; box-shadow:0 0 6px #ffe04a77; }
    .jour-futur { opacity:0.75; }
  `;
  document.head.appendChild(style);

  // Chargement initial (1 seule requête !)
  await chargerHistoriqueEtInscription();
});
