/// Ajoute roundRect si manquant
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') {
      r = { tl: r, tr: r, br: r, bl: r };
    } else {
      const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
      for (let side in defaultRadius) r[side] = r[side] || defaultRadius[side];
    }
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

// Fonction pour dessiner l'effet visuel autour de la photo
function drawPolaroid(photoSrc, styleName, canvasTarget) {
  const ctx = canvasTarget.getContext("2d");
  ctx.clearRect(0, 0, canvasTarget.width, canvasTarget.height);

  const imgPhoto = new Image();
  imgPhoto.src = photoSrc;

  imgPhoto.onload = () => {
    const paddingTop = 0;
    const paddingSides = 0;
    const paddingBottom = 0;

    const photoWidth = canvasTarget.width - 2 * paddingSides;
    const photoHeight = canvasTarget.height - paddingTop - paddingBottom;

    // Cadre dessiné D'ABORD autour du canvas
    drawPolaroidFrame(styleName, ctx, canvasTarget.width, canvasTarget.height);

    // Ombre douce et affichage image
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.beginPath();
    ctx.roundRect(paddingSides, paddingTop, photoWidth, photoHeight, 8);
    ctx.clip();
    ctx.drawImage(imgPhoto, paddingSides, paddingTop, photoWidth, photoHeight);
    ctx.restore();
  };

  imgPhoto.onerror = () => {
    console.error("Erreur de chargement image : ", photoSrc);
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height);
    drawPolaroidFrame(styleName, ctx, canvasTarget.width, canvasTarget.height);
  };
}

// Fonction qui dessine un cadre stylisé autour du canvas
function drawPolaroidFrame(styleName, ctx, w, h) {
  ctx.lineWidth = 25;

switch (styleName) {
    case "polaroid_1": // Blanc Classique
  ctx.strokeStyle = "#ffffff"; // vrai blanc
  break;
case "polaroid_2": // Noir Mat
      ctx.strokeStyle = "#000";
      break;
    case "polaroid_3": // Sépia
      ctx.strokeStyle = "#704214";
      break;
    case "polaroid_4": // Bois Clair
      const grad4 = ctx.createLinearGradient(0, 0, w, h);
      grad4.addColorStop(0, "#d4b483");
      grad4.addColorStop(1, "#f2e3c6");
      ctx.strokeStyle = grad4;
      break;
    case "polaroid_5": // Bois Foncé
      const grad5 = ctx.createLinearGradient(0, 0, w, h);
      grad5.addColorStop(0, "#5b3a29");
      grad5.addColorStop(1, "#40210f");
      ctx.strokeStyle = grad5;
      break;
    case "polaroid_6": // Gris Béton
      ctx.strokeStyle = "#888";
      break;
    case "polaroid_7": // Rose Poudré
      ctx.strokeStyle = "#e8b2c8";
      break;
    case "polaroid_8": // Bleu Pastel
      ctx.strokeStyle = "#a2d2ff";
      break;
    case "polaroid_9": // Vert Menthe
      ctx.strokeStyle = "#b2f8d0";
      break;
    case "polaroid_10": // Jaune Doux
      ctx.strokeStyle = "#fff7b2";
      break;

case "polaroid_11": { // Nuage Sky
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#dbeeff";
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(0, 0, w, h);
  ctx.setLineDash([]);
  break;
}
 case "polaroid_12": // Aquarelle
      ctx.lineWidth = 7;
      const grad12 = ctx.createLinearGradient(0, 0, w, h);
      grad12.addColorStop(0, "#fcd5ce");
      grad12.addColorStop(1, "#a2d2ff");
      ctx.strokeStyle = grad12;
      ctx.strokeRect(0, 0, w, h);
      break;

    case "polaroid_13": // Fluo Violet
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#cc33ff";
      ctx.shadowColor = "#cc33ff";
      ctx.shadowBlur = 12;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;

    case "polaroid_14": // Arc-en-ciel
      ctx.lineWidth = 8;
      const grad14 = ctx.createLinearGradient(0, 0, w, 0);
      grad14.addColorStop(0, "red");
      grad14.addColorStop(0.17, "orange");
      grad14.addColorStop(0.34, "yellow");
      grad14.addColorStop(0.51, "green");
      grad14.addColorStop(0.68, "blue");
      grad14.addColorStop(0.85, "indigo");
      grad14.addColorStop(1, "violet");
      ctx.strokeStyle = grad14;
      ctx.strokeRect(0, 0, w, h);
      break;

    case "polaroid_15": // Pixels Rétro
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ff66cc";
      ctx.setLineDash([1, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;

    case "polaroid_16": // Papier Froissé
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#dddddd";
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;

    case "polaroid_17": // Néon Rose
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ff00cc";
      ctx.shadowColor = "#ff00cc";
      ctx.shadowBlur = 15;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;

    case "polaroid_18": // Ombres Douces
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#cccccc";
      ctx.shadowColor = "#999";
      ctx.shadowBlur = 8;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;

    case "polaroid_19": // Gomme Crayonnée
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#f4c2c2";
      ctx.setLineDash([2, 6]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;

    case "polaroid_20": // Coups de pinceau
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#b2967d";
      ctx.setLineDash([6, 2, 1, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_21":
      ctx.strokeStyle = "#ffeb3b";
      break;
    case "polaroid_22":
      ctx.strokeStyle = "#f8c8dc";
      break;
        case "polaroid_23":
      ctx.strokeStyle = "#ff99cc";
      break;

    case "polaroid_24": {
      // Effet bulles décoratives
      for (let i = 0; i < 5; i++) {
        const x = 30 + Math.random() * (w - 60);
        const y = 30 + Math.random() * (h - 60);
        const r = 6 + Math.random() * 10;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(178, 235, 242, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Couleur du cadre principal
      ctx.strokeStyle = "#b2ebf2";
      break;
    }

    case "polaroid_25": {
      const grad25 = ctx.createLinearGradient(0, 0, w, h);
      grad25.addColorStop(0, "#ff9999");
      grad25.addColorStop(0.5, "#ffcc99");
      grad25.addColorStop(1, "#99ccff");
      ctx.strokeStyle = grad25;
      break;
    }

    case "polaroid_26":
      ctx.strokeStyle = "#fef3bd";
      break;
    case "polaroid_27":
      ctx.strokeStyle = "#cfd8dc";
      break;
    case "polaroid_28":
      ctx.strokeStyle = "#ffccff";
      break;
    case "polaroid_29":
      const grad29 = ctx.createLinearGradient(0, 0, w, 0);
      grad29.addColorStop(0, "#ff6699");
      grad29.addColorStop(0.5, "#ffff66");
      grad29.addColorStop(1, "#66ccff");
      ctx.strokeStyle = grad29;
      break;
    case "polaroid_30":
      ctx.strokeStyle = "#d1c4e9";
      break;
    case "polaroid_31":
      ctx.strokeStyle = "#b71c1c";
      break;
    case "polaroid_32":
      ctx.strokeStyle = "#ffccf9";
      break;
    case "polaroid_33":
      const grad33 = ctx.createLinearGradient(0, 0, w, h);
      grad33.addColorStop(0, "#ffcc00");
      grad33.addColorStop(1, "#b30000");
      ctx.strokeStyle = grad33;
      break;
    case "polaroid_34":
      ctx.strokeStyle = "#2c2c2c";
      break;
    case "polaroid_35":
      ctx.strokeStyle = "#ff66cc";
      break;
    case "polaroid_36":
      const grad36 = ctx.createLinearGradient(0, 0, w, 0);
      grad36.addColorStop(0, "#ffd700");
      grad36.addColorStop(1, "#e75480");
      ctx.strokeStyle = grad36;
      break;
    case "polaroid_37":
      ctx.strokeStyle = "#bbbbbb";
      break;
    case "polaroid_38":
      ctx.strokeStyle = "#ff99ff";
      break;
    case "polaroid_39":
      ctx.strokeStyle = "#8d6e63";
      break;
    case "polaroid_40":
      const grad40 = ctx.createLinearGradient(0, 0, w, h);
      grad40.addColorStop(0, "#00ffff");
      grad40.addColorStop(1, "#333333");
      ctx.strokeStyle = grad40;
      break;
    case "polaroid_41":
      const grad41 = ctx.createLinearGradient(0, 0, w, h);
      grad41.addColorStop(0, "#ffe08a");
      grad41.addColorStop(1, "#c99800");
      ctx.strokeStyle = grad41;
      break;
    case "polaroid_42":
      ctx.strokeStyle = "#ccffff";
      break;
    case "polaroid_43":
      const grad43 = ctx.createLinearGradient(0, 0, w, 0);
      grad43.addColorStop(0, "#000");
      grad43.addColorStop(1, "#ffd700");
      ctx.strokeStyle = grad43;
      break;
    case "polaroid_44":
      ctx.strokeStyle = "#ffffff";
      break;
    case "polaroid_45":
      ctx.strokeStyle = "#a0c4ff";
      break;
    case "polaroid_46":
      const grad46 = ctx.createLinearGradient(0, 0, w, h);
      grad46.addColorStop(0, "#ffcc00");
      grad46.addColorStop(1, "#cc0000");
      ctx.strokeStyle = grad46;
      break;
    case "polaroid_47":
      const grad47 = ctx.createLinearGradient(0, 0, w, 0);
      grad47.addColorStop(0, "#ff6600");
      grad47.addColorStop(1, "#ff0000");
      ctx.strokeStyle = grad47;
      break;
    case "polaroid_48":
      ctx.strokeStyle = "#66ccff";
      break;
    case "polaroid_49":
      const grad49 = ctx.createLinearGradient(0, 0, w, h);
      grad49.addColorStop(0, "#a678f0");
      grad49.addColorStop(1, "#5d3fd3");
      ctx.strokeStyle = grad49;
      break;
    case "polaroid_50":
      ctx.strokeStyle = "#ffffff";
      break;
    case "polaroid_51":
      ctx.strokeStyle = "#e0f7fa";
      break;
    case "polaroid_52":
      ctx.strokeStyle = "#ff7518";
      break;
    case "polaroid_53":
      ctx.strokeStyle = "#2e7d32";
      break;
    case "polaroid_54":
      const grad54 = ctx.createLinearGradient(0, 0, w, h);
      grad54.addColorStop(0, "#ff9966");
      grad54.addColorStop(1, "#cc6600");
      ctx.strokeStyle = grad54;
      break;
    case "polaroid_55":
      ctx.strokeStyle = "#ffe066";
      break;
    case "polaroid_56":
      ctx.strokeStyle = "#40c4ff";
      break;
    case "polaroid_57":
      ctx.strokeStyle = "#f48fb1";
      break;
    case "polaroid_58":
      const grad58 = ctx.createLinearGradient(0, 0, w, 0);
      grad58.addColorStop(0, "#ff4081");
      grad58.addColorStop(0.5, "#ffea00");
      grad58.addColorStop(1, "#40c4ff");
      ctx.strokeStyle = grad58;
      break;
    case "polaroid_59":
      ctx.strokeStyle = "#fff59d";
      break;
    case "polaroid_60":
      const grad60 = ctx.createLinearGradient(0, 0, w, h);
      grad60.addColorStop(0, "#b3e5fc");
      grad60.addColorStop(1, "#ffffff");
      ctx.strokeStyle = grad60;
      break;
    default:
      ctx.strokeStyle = "#999";
      break;
  }

  // Haut
ctx.lineWidth = 25;
ctx.beginPath();
ctx.moveTo(20, 20);
ctx.lineTo(w - 20, 20);
ctx.stroke();

// Gauche
ctx.beginPath();
ctx.moveTo(20, 20);
ctx.lineTo(20, h - 20);
ctx.stroke();

// Droite
ctx.beginPath();
ctx.moveTo(w - 20, 20);
ctx.lineTo(w - 20, h - 20);
ctx.stroke();

// Bas (plus épais)
ctx.lineWidth = 60;
ctx.beginPath();
ctx.moveTo(20, h - 20);
ctx.lineTo(w - 20, h - 20);
ctx.stroke();

}
