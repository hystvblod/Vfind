// === amis.js (VERSION SUPABASE) ===
import { supabase, getCurrentUser, getProfile } from './supabase.js';

let pseudoPublic = null;
let profil = null;

// --- Initialisation et affichage au chargement ---
document.addEventListener("DOMContentLoaded", async () => {
  pseudoPublic = await getCurrentUser();
  if (!pseudoPublic) {
    window.location.href = "login.html";
    return;
  }
  profil = await getProfile(pseudoPublic);
  afficherListesAmis(profil);
  detecterInvitationParLien();

  // Bouton ajout par pseudo
  document.getElementById("btn-ajouter-ami")?.addEventListener("click", async () => {
    const pseudoAmi = document.getElementById("pseudo-ami").value.trim();
    if (pseudoAmi) envoyerDemandeAmi(pseudoAmi);
  });

  // Générer le lien d'invit
  document.getElementById("btn-lien-invit")?.addEventListener("click", () => {
    const base = window.location.origin + window.location.pathname;
    document.getElementById("lien-invit-output").value = `${base}?add=${pseudoPublic}`;
  });
});

// --- Affichage des listes amis/demandes ---
function afficherListesAmis(data) {
  // Amis
  const ulAmis = document.getElementById("liste-amis");
  if (ulAmis) {
    ulAmis.innerHTML = "";
    if (!data.amis?.length) {
      ulAmis.innerHTML = "<li>Pas d'ami pour le moment.</li>";
    } else {
      data.amis.forEach(pseudo => {
        ulAmis.innerHTML += `
          <li>
            ${pseudo} 
            <button onclick="window.defierAmi('${pseudo}')">Défier</button> 
            <button onclick="window.supprimerAmi('${pseudo}')">❌</button>
          </li>`;
      });
    }
  }

  // Demandes reçues
  const ulRecues = document.getElementById("demandes-recue") || document.getElementById("liste-demandes-recues");
  if (ulRecues) {
    ulRecues.innerHTML = "";
    if (!data.demandesRecues?.length) {
      ulRecues.innerHTML = "<li>Aucune demande reçue.</li>";
    } else {
      data.demandesRecues.forEach(pseudo => {
        ulRecues.innerHTML += `
          <li>
            ${pseudo} 
            <button onclick="window.accepterDemande('${pseudo}')">Accepter</button> 
            <button onclick="window.refuserDemande('${pseudo}')">Refuser</button>
          </li>`;
      });
    }
  }

  // Demandes envoyées
  const ulEnvoyees = document.getElementById("demandes-envoyees");
  if (ulEnvoyees) {
    ulEnvoyees.innerHTML = "";
    if (!data.demandesEnvoyees?.length) {
      ulEnvoyees.innerHTML = "<li>Aucune demande envoyée.</li>";
    } else {
      data.demandesEnvoyees.forEach(pseudo => {
        ulEnvoyees.innerHTML += `<li>${pseudo}</li>`;
      });
    }
  }
}

// --- GESTION DES AMIS ---
window.envoyerDemandeAmi = async function(pseudoAmi) {
  if (!pseudoPublic || !pseudoAmi) return;
  if (pseudoAmi === pseudoPublic) {
    alert("Tu ne peux pas t'ajouter toi-même !");
    return;
  }
  // Cherche le user par pseudoPublic
  const { data: ami } = await supabase
    .from("users").select("*").eq("pseudoPublic", pseudoAmi).single();
  if (!ami) {
    alert("Aucun utilisateur trouvé avec ce pseudo.");
    return;
  }

  // Vérifie les statuts actuels (profils à jour)
  profil = await getProfile(pseudoPublic);
  if ((profil.amis||[]).includes(pseudoAmi)) {
    alert("Vous êtes déjà amis !");
    return;
  }
  if ((profil.demandesEnvoyees||[]).includes(pseudoAmi)) {
    alert("Demande déjà envoyée.");
    return;
  }
  if ((profil.demandesRecues||[]).includes(pseudoAmi)) {
    alert("Cette personne t'a déjà envoyé une demande !");
    return;
  }

  // Ajoute la demande envoyée à toi-même
  await supabase.from("users").update({
    demandesEnvoyees: [ ...(profil.demandesEnvoyees || []), pseudoAmi ]
  }).eq("pseudoPublic", pseudoPublic);

  // Ajoute la demande reçue à l'autre
  await supabase.from("users").update({
    demandesRecues: [ ...(ami.demandesRecues || []), pseudoPublic ]
  }).eq("pseudoPublic", pseudoAmi);

  alert("Demande envoyée à " + pseudoAmi + " !");
  profil = await getProfile(pseudoPublic);
  afficherListesAmis(profil);
};

// Accepter une demande d'ami
window.accepterDemande = async function(pseudoAmi) {
  if (!pseudoPublic || !pseudoAmi) return;
  // Cherche le profil de l'ami
  const { data: ami } = await supabase
    .from("users").select("*").eq("pseudoPublic", pseudoAmi).single();
  if (!ami) return;
  profil = await getProfile(pseudoPublic);

  // Ajoute chacun dans la liste d'amis de l'autre
  await supabase.from("users").update({
    amis: [ ...(profil.amis||[]), pseudoAmi ],
    demandesRecues: (profil.demandesRecues||[]).filter(x => x !== pseudoAmi)
  }).eq("pseudoPublic", pseudoPublic);

  await supabase.from("users").update({
    amis: [ ...(ami.amis||[]), pseudoPublic ],
    demandesEnvoyees: (ami.demandesEnvoyees||[]).filter(x => x !== pseudoPublic)
  }).eq("pseudoPublic", pseudoAmi);

  alert("Vous êtes maintenant amis !");
  profil = await getProfile(pseudoPublic);
  afficherListesAmis(profil);
};

// Refuser une demande d'ami
window.refuserDemande = async function(pseudoAmi) {
  if (!pseudoPublic || !pseudoAmi) return;
  // Cherche le profil de l'ami
  const { data: ami } = await supabase
    .from("users").select("*").eq("pseudoPublic", pseudoAmi).single();
  if (!ami) return;
  profil = await getProfile(pseudoPublic);

  await supabase.from("users").update({
    demandesRecues: (profil.demandesRecues||[]).filter(x => x !== pseudoAmi)
  }).eq("pseudoPublic", pseudoPublic);

  await supabase.from("users").update({
    demandesEnvoyees: (ami.demandesEnvoyees||[]).filter(x => x !== pseudoPublic)
  }).eq("pseudoPublic", pseudoAmi);

  alert("Demande refusée !");
  profil = await getProfile(pseudoPublic);
  afficherListesAmis(profil);
};

// Supprimer un ami
window.supprimerAmi = async function(pseudoAmi) {
  if (!pseudoPublic || !pseudoAmi) return;
  // Cherche le profil de l'ami
  const { data: ami } = await supabase
    .from("users").select("*").eq("pseudoPublic", pseudoAmi).single();
  if (!ami) return;
  profil = await getProfile(pseudoPublic);

  await supabase.from("users").update({
    amis: (profil.amis||[]).filter(x => x !== pseudoAmi)
  }).eq("pseudoPublic", pseudoPublic);

  await supabase.from("users").update({
    amis: (ami.amis||[]).filter(x => x !== pseudoPublic)
  }).eq("pseudoPublic", pseudoAmi);

  alert("Ami supprimé.");
  profil = await getProfile(pseudoPublic);
  afficherListesAmis(profil);
};

// Défier un ami (redirige)
window.defierAmi = function(pseudoAmi) {
  window.location.href = `duel.html?ami=${pseudoAmi}`;
};

// --- Détection ajout ami via lien d’invitation ?add=... ---
function detecterInvitationParLien() {
  const params = new URLSearchParams(window.location.search);
  const toAdd = params.get("add");
  if (toAdd) {
    document.getElementById("pseudo-ami").value = toAdd;
    if (confirm(`Ajouter ${toAdd} comme ami ?`)) {
      envoyerDemandeAmi(toAdd);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}
