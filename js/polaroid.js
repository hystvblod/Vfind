function drawPolaroid(photoSrc, styleName, canvasTarget) {
  const ctx = canvasTarget.getContext("2d");
  ctx.clearRect(0, 0, canvasTarget.width, canvasTarget.height);

  // Marges dynamiques selon la taille du canvas
  const paddingSides = canvasTarget.width * 0.1;       // 10% de chaque côté
  const paddingTop = canvasTarget.height * 0.1;        // 10% en haut
  const paddingBottom = canvasTarget.height * 0.18;    // 18% en bas

  const photoWidth = canvasTarget.width - paddingSides * 2;
  const photoHeight = canvasTarget.height - paddingTop - paddingBottom;

  const imgPhoto = new Image();
  imgPhoto.src = photoSrc;

  imgPhoto.onload = () => {
    // Cadre blanc de base
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height);

    // Dessin de la photo avec ombre et coins arrondis
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(paddingSides, paddingTop, photoWidth, photoHeight, 8);
    ctx.clip();
    ctx.drawImage(imgPhoto, paddingSides, paddingTop, photoWidth, photoHeight);
    ctx.restore();

    // Appliquer l’effet de cadre autour
    drawFrameEffect(styleName, ctx, canvasTarget.width, canvasTarget.height);
  };

  imgPhoto.onerror = () => {
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height);
    drawFrameEffect(styleName, ctx, canvasTarget.width, canvasTarget.height);
  };
}

// Applique le style visuel autour du cadre Polaroïd
function drawFrameEffect(styleName, ctx, w, h) {
  ctx.save();

  switch (styleName) {
    case "polaroid_13":
      ctx.lineWidth = 16;
      ctx.strokeStyle = "#cc33ff";
      ctx.shadowColor = "#cc33ff";
      ctx.shadowBlur = 20;
      break;

    case "polaroid_14":
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "red");
      grad.addColorStop(0.17, "orange");
      grad.addColorStop(0.34, "yellow");
      grad.addColorStop(0.51, "green");
      grad.addColorStop(0.68, "blue");
      grad.addColorStop(0.85, "indigo");
      grad.addColorStop(1, "violet");
      ctx.lineWidth = 16;
      ctx.strokeStyle = grad;
      break;

    case "polaroid_25":
      const grad25 = ctx.createLinearGradient(0, 0, w, h);
      grad25.addColorStop(0, "#ff9999");
      grad25.addColorStop(0.5, "#ffcc99");
      grad25.addColorStop(1, "#99ccff");
      ctx.lineWidth = 16;
      ctx.strokeStyle = grad25;
      break;

    default:
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#999";
      break;
  }

  // Dessin du cadre autour du canvas entier
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

// Ajout de roundRect si nécessaire
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (let side in defaultRadius) {
      r[side] = r[side] || defaultRadius[side];
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

}
function drawPolaroidFrame(styleName, ctx, w, h) {
  switch (styleName) {
    case "polaroid_1": // Blanc Classique
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#e0e0e0";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_2": // Noir Mat
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#111";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_3": // Sépia
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#704214";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_4": // Bois Clair
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#c4a484";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_5": // Bois Foncé
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#5b3a29";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_6": // Gris Béton
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#999999";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_7": // Rose Poudré
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#e8b2c8";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_8": // Bleu Pastel
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#b2d8f8";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_9": // Vert Menthe
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#b2f8d0";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_10": // Jaune Doux
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#fff7b2";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_11": // Nuage Sky
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#dbeeff";
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
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
    case "polaroid_21": // Emoji Jaune
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ffeb3b";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_22": // Petit Chat
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#f8c8dc";
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_23": // Cœurs Roses
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ff99cc";
      ctx.setLineDash([1, 5]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_24": // Bulles Bleues
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#b2ebf2";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_25": // Ballons
      ctx.lineWidth = 5;
      const grad25 = ctx.createLinearGradient(0, 0, w, h);
      grad25.addColorStop(0, "#ff9999");
      grad25.addColorStop(0.5, "#ffcc99");
      grad25.addColorStop(1, "#99ccff");
      ctx.strokeStyle = grad25;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_26": // Nuages & Soleil
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#fef3bd";
      ctx.setLineDash([6, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_27": // Papier à Carreaux
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#cfd8dc";
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_28": // Stickers Fun
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#ffccff";
      ctx.setLineDash([5, 1]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_29": // Arc-en-ciel Cartoon
      ctx.lineWidth = 6;
      const grad29 = ctx.createLinearGradient(0, 0, w, 0);
      grad29.addColorStop(0, "#ff6699");
      grad29.addColorStop(0.5, "#ffff66");
      grad29.addColorStop(1, "#66ccff");
      ctx.strokeStyle = grad29;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_30": // Lapinou Violeta
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#d1c4e9";
      ctx.setLineDash([4, 1]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_31": // Japon Traditionnel
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#b71c1c";
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_32": // Asiatique Kawaii
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ffccf9";
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_33": // Oriental Or & Rouge
      ctx.lineWidth = 7;
      const grad33 = ctx.createLinearGradient(0, 0, w, h);
      grad33.addColorStop(0, "#ffcc00");
      grad33.addColorStop(1, "#b30000");
      ctx.strokeStyle = grad33;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_34": // Gothique
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#2c2c2c";
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_35": // Années 80
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ff66cc";
      ctx.setLineDash([5, 2, 1, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_36": // Disco
      ctx.lineWidth = 7;
      const grad36 = ctx.createLinearGradient(0, 0, w, 0);
      grad36.addColorStop(0, "#ffd700");
      grad36.addColorStop(1, "#e75480");
      ctx.strokeStyle = grad36;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_37": // Journal Papier
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#bbbbbb";
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_38": // Glamour Paillettes
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ff99ff";
      ctx.shadowColor = "#ff99ff";
      ctx.shadowBlur = 10;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_39": // Bois Gravé
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#8d6e63";
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_40": // Cybermetal
      ctx.lineWidth = 7;
      const grad40 = ctx.createLinearGradient(0, 0, w, h);
      grad40.addColorStop(0, "#00ffff");
      grad40.addColorStop(1, "#333333");
      ctx.strokeStyle = grad40;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_41": // Doré Deluxe
      ctx.lineWidth = 8;
      const grad41 = ctx.createLinearGradient(0, 0, w, h);
      grad41.addColorStop(0, "#ffe08a");
      grad41.addColorStop(1, "#c99800");
      ctx.strokeStyle = grad41;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_42": // Diamant Cristal
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ccffff";
      ctx.shadowColor = "#ccffff";
      ctx.shadowBlur = 15;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_43": // Noir & Or
      ctx.lineWidth = 7;
      const grad43 = ctx.createLinearGradient(0, 0, w, 0);
      grad43.addColorStop(0, "#000");
      grad43.addColorStop(1, "#ffd700");
      ctx.strokeStyle = grad43;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_44": // VIP Étoilé
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 18;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_45": // Halo Animé
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#a0c4ff";
      ctx.shadowColor = "#a0c4ff";
      ctx.shadowBlur = 20;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_46": // Champion Médaille
      ctx.lineWidth = 7;
      const grad46 = ctx.createLinearGradient(0, 0, w, h);
      grad46.addColorStop(0, "#ffcc00");
      grad46.addColorStop(1, "#cc0000");
      ctx.strokeStyle = grad46;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_47": // Flamme Dynamique
      ctx.lineWidth = 6;
      const grad47 = ctx.createLinearGradient(0, 0, w, 0);
      grad47.addColorStop(0, "#ff6600");
      grad47.addColorStop(1, "#ff0000");
      ctx.strokeStyle = grad47;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_48": // Ice Blue Animé
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#66ccff";
      ctx.shadowColor = "#66ccff";
      ctx.shadowBlur = 12;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_49": // Royal Violet
      ctx.lineWidth = 6;
      const grad49 = ctx.createLinearGradient(0, 0, w, h);
      grad49.addColorStop(0, "#a678f0");
      grad49.addColorStop(1, "#5d3fd3");
      ctx.strokeStyle = grad49;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_50": // Édition Limitée (VFind)
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 25;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_51": // Flocons de Neige
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#e0f7fa";
      ctx.shadowColor = "#b2ebf2";
      ctx.shadowBlur = 12;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_52": // Citrouille Halloween
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ff7518";
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_53": // Sapin de Noël
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#2e7d32";
      ctx.shadowColor = "#cfd8dc";
      ctx.shadowBlur = 10;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_54": // Feuilles d’Automne
      ctx.lineWidth = 6;
      const grad54 = ctx.createLinearGradient(0, 0, w, h);
      grad54.addColorStop(0, "#ff9966");
      grad54.addColorStop(1, "#cc6600");
      ctx.strokeStyle = grad54;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_55": // Été Tropical
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ffe066";
      ctx.shadowColor = "#00cc99";
      ctx.shadowBlur = 10;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_56": // Bord de Mer
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#40c4ff";
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_57": // Printemps Fleuris
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#f48fb1";
      ctx.setLineDash([3, 1, 1, 1]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      break;
    case "polaroid_58": // Carnaval
      ctx.lineWidth = 6;
      const grad58 = ctx.createLinearGradient(0, 0, w, 0);
      grad58.addColorStop(0, "#ff4081");
      grad58.addColorStop(0.5, "#ffea00");
      grad58.addColorStop(1, "#40c4ff");
      ctx.strokeStyle = grad58;
      ctx.strokeRect(0, 0, w, h);
      break;
    case "polaroid_59": // Nouvel An Brillant
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#fff59d";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 18;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    case "polaroid_60": // Gel Magique
      ctx.lineWidth = 6;
      const grad60 = ctx.createLinearGradient(0, 0, w, h);
      grad60.addColorStop(0, "#b3e5fc");
      grad60.addColorStop(1, "#ffffff");
      ctx.strokeStyle = grad60;
      ctx.shadowColor = "#b3e5fc";
      ctx.shadowBlur = 10;
      ctx.strokeRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      break;
    default:
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#999";
      ctx.strokeRect(0, 0, w, h);
      break;
  }
}