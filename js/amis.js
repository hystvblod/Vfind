// === amis.js (VERSION PRO SUPABASE) ===
import { supabase, getPseudo, loadUserData, getUserDataCloud, incrementFriendsInvited } from './userData.js';

let userPseudo = null;
let userProfile = null;

// --- Helper pour affichage toast simple ---
function toast(msg, color = "#222") {
  let t = document.createElement("div");
  t.className = "toast-msg";
  t.textContent = msg;
  t.style.background = color;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 500); }, 2300);
}

// --- Initialisation & affichage au chargement ---
document.addEventListener("DOMContentLoaded", async () => {
  userPseudo = await getPseudo();
  await loadUserData();
  userProfile = await getUserDataCloud();

  await afficherListesAmis(userProfile);

  document.getElementById("btn-ajouter-ami")?.addEventListener("click", async () => {
    const pseudoAmi = document.getElementById("pseudo-ami").value.trim();
    if (pseudoAmi) envoyerDemandeAmi(pseudoAmi);
  });

  document.getElementById("btn-lien-invit")?.addEventListener("click", () => {
    const base = window.location.origin + window.location.pathname;
    document.getElementById("lien-invit-output").value = `${base}?add=${userPseudo}`;
    toast("Lien copié, partage à tes amis !");
    document.getElementById("lien-invit-output").select();
    document.execCommand('copy');
  });

  detecterInvitationParLien();
});

// --- Affichage pro des listes d'amis ---
async function afficherListesAmis(data) {
  const ulAmis = document.getElementById("liste-amis");
  ulAmis.innerHTML = "";
  if (!data.amis?.length) {
    ulAmis.innerHTML = "<li class='txt-empty'>Tu n'as pas encore d'amis.</li>";
  } else {
    data.amis.forEach(pseudo => {
      ulAmis.innerHTML += `
        <li class="amis-li">
          <span class="ami-avatar">${pseudo.slice(0,2).toUpperCase()}</span>
          <span class="ami-nom">${pseudo}</span>
          <button class="btn-small btn-defi" onclick="window.defierAmi('${pseudo}')">Défier</button>
          <button class="btn-small btn-suppr" onclick="window.supprimerAmi('${pseudo}')">❌</button>
        </li>`;
    });
  }

  const ulRecues = document.getElementById("demandes-recue");
  ulRecues.innerHTML = "";
  if (!data.demandesRecues?.length) {
    ulRecues.innerHTML = "<li class='txt-empty'>Aucune demande reçue.</li>";
  } else {
    data.demandesRecues.forEach(pseudo => {
      ulRecues.innerHTML += `
        <li class="amis-li">
          <span class="ami-avatar">${pseudo.slice(0,2).toUpperCase()}</span>
          <span class="ami-nom">${pseudo}</span>
          <button class="btn-small btn-accept" onclick="window.accepterDemande('${pseudo}')">Accepter</button>
          <button class="btn-small btn-refuse" onclick="window.refuserDemande('${pseudo}')">Refuser</button>
        </li>`;
    });
  }

  const ulEnvoyees = document.getElementById("demandes-envoyees");
  ulEnvoyees.innerHTML = "";
  if (!data.demandesEnvoyees?.length) {
    ulEnvoyees.innerHTML = "<li class='txt-empty'>Aucune demande envoyée.</li>";
  } else {
    data.demandesEnvoyees.forEach(pseudo => {
      ulEnvoyees.innerHTML += `
        <li class="amis-li">
          <span class="ami-avatar">${pseudo.slice(0,2).toUpperCase()}</span>
          <span class="ami-nom">${pseudo}</span>
        </li>`;
    });
  }
}

// --- GESTION DES AMIS ---
window.envoyerDemandeAmi = async function(pseudoAmi) {
  if (!userPseudo || !pseudoAmi) return;
  if (pseudoAmi === userPseudo) return toast("Tu ne peux pas t'ajouter toi-même !", "#b93f3f");

  const { data: ami, error } = await supabase.from("users").select("*").eq("pseudo", pseudoAmi).maybeSingle();
  if (error || !ami) return toast("Aucun utilisateur trouvé.", "#b93f3f");

  userProfile = await getUserDataCloud();

  if ((userProfile.amis || []).includes(pseudoAmi)) return toast("Vous êtes déjà amis !");
  if ((userProfile.demandesEnvoyees || []).includes(pseudoAmi)) return toast("Demande déjà envoyée.");
  if ((userProfile.demandesRecues || []).includes(pseudoAmi)) return toast("Cette personne t'a déjà envoyé une demande !");

  await supabase.from("users").update({
    demandesEnvoyees: [ ...(userProfile.demandesEnvoyees || []), pseudoAmi ]
  }).eq("pseudo", userPseudo);

  await supabase.from("users").update({
    demandesRecues: [ ...(ami.demandesRecues || []), userPseudo ]
  }).eq("pseudo", pseudoAmi);

  toast("Demande envoyée à " + pseudoAmi + " !");
  userProfile = await getUserDataCloud();
  await afficherListesAmis(userProfile);
};

window.accepterDemande = async function(pseudoAmi) {
  if (!userPseudo || !pseudoAmi) return;
  const { data: ami, error } = await supabase.from("users").select("*").eq("pseudo", pseudoAmi).maybeSingle();
  if (error || !ami) return;
  userProfile = await getUserDataCloud();

  await supabase.from("users").update({
    amis: [ ...(userProfile.amis||[]), pseudoAmi ],
    demandesRecues: (userProfile.demandesRecues||[]).filter(x => x !== pseudoAmi)
  }).eq("pseudo", userPseudo);

  await supabase.from("users").update({
    amis: [ ...(ami.amis||[]), userPseudo ],
    demandesEnvoyees: (ami.demandesEnvoyees||[]).filter(x => x !== userPseudo)
  }).eq("pseudo", pseudoAmi);

  await incrementFriendsInvited();
  toast("Vous êtes maintenant amis !");
  userProfile = await getUserDataCloud();
  await afficherListesAmis(userProfile);
};

window.refuserDemande = async function(pseudoAmi) {
  if (!userPseudo || !pseudoAmi) return;
  const { data: ami, error } = await supabase.from("users").select("*").eq("pseudo", pseudoAmi).maybeSingle();
  if (error || !ami) return;
  userProfile = await getUserDataCloud();

  await supabase.from("users").update({
    demandesRecues: (userProfile.demandesRecues||[]).filter(x => x !== pseudoAmi)
  }).eq("pseudo", userPseudo);

  await supabase.from("users").update({
    demandesEnvoyees: (ami.demandesEnvoyees||[]).filter(x => x !== userPseudo)
  }).eq("pseudo", pseudoAmi);

  toast("Demande refusée.");
  userProfile = await getUserDataCloud();
  await afficherListesAmis(userProfile);
};

window.supprimerAmi = async function(pseudoAmi) {
  if (!userPseudo || !pseudoAmi) return;
  const { data: ami, error } = await supabase.from("users").select("*").eq("pseudo", pseudoAmi).maybeSingle();
  if (error || !ami) return;
  userProfile = await getUserDataCloud();

  await supabase.from("users").update({
    amis: (userProfile.amis||[]).filter(x => x !== pseudoAmi)
  }).eq("pseudo", userPseudo);

  await supabase.from("users").update({
    amis: (ami.amis||[]).filter(x => x !== userPseudo)
  }).eq("pseudo", pseudoAmi);

  toast("Ami supprimé.");
  userProfile = await getUserDataCloud();
  await afficherListesAmis(userProfile);
};

window.defierAmi = function(pseudoAmi) {
  window.location.href = `duel.html?ami=${pseudoAmi}`;
};

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
