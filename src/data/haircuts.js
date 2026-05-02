import ovalTexturedCrop from "../assets/images/Face Shapes/Oval/Textured Crop.png";
import ovalQuiff from "../assets/images/Face Shapes/Oval/Quiff.png";
import ovalSlickBack from "../assets/images/Face Shapes/Oval/Slick Back.png";
import ovalPompadour from "../assets/images/Face Shapes/Oval/Pompadour.png";
import ovalSidePart from "../assets/images/Face Shapes/Oval/Side Part.png";
import ovalBuzzCut from "../assets/images/Face Shapes/Oval/Buzz Cut.png";

import roundFohawk from "../assets/images/Face Shapes/Round/Fohawk.png";
import roundPompadour from "../assets/images/Face Shapes/Round/Pompadour.png";
import roundQuiff from "../assets/images/Face Shapes/Round/Quiff.png";
import roundSidePart from "../assets/images/Face Shapes/Round/Side Part.png";
import roundTexturedCrop from "../assets/images/Face Shapes/Round/Textured Crop.png";

import squareBuzzCut from "../assets/images/Face Shapes/Square/Buzz Cut.png";
import squareCombover from "../assets/images/Face Shapes/Square/Combover.png";
import squareFohawk from "../assets/images/Face Shapes/Square/Fohawk.png";
import squareMidFade from "../assets/images/Face Shapes/Square/Mid Fade.png";
import squareTexturedCrop from "../assets/images/Face Shapes/Square/Textured Crop.png";

import oblongForwardCrop from "../assets/images/Face Shapes/Oblong/Forward Crop.png";
import oblongQuiff from "../assets/images/Face Shapes/Oblong/Quiff.png";
import oblongTexturedCrop from "../assets/images/Face Shapes/Oblong/Textured Crop.png";
import oblongUndercut from "../assets/images/Face Shapes/Oblong/Undercut.png";

import heartDcUndercut from "../assets/images/Face Shapes/Heart/Disconnected Undercut.png";
import heartMessyQuiff from "../assets/images/Face Shapes/Heart/Messy Textured Quiff.png";
import heartMiddlePart from "../assets/images/Face Shapes/Heart/Middle Part.png";
import heartTexturedCrop from "../assets/images/Face Shapes/Heart/Textured Crop.png";

import diamondTexturedCrop from "../assets/images/Face Shapes/Diamond/Textured Crop.png";
import diamondDcUndercut from "../assets/images/Face Shapes/Diamond/Disconnected Undercut.png";
import diamondSidePart from "../assets/images/Face Shapes/Diamond/Side Part.png";
import diamondUndercut from "../assets/images/Face Shapes/Diamond/Undercut.png";

export const FACE_SHAPES = ["Oval", "Round", "Square", "Oblong", "Heart", "Diamond"];

const styleId = (faceShape, name) =>
  `${faceShape}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const createStyle = (faceShape, name, image, details) => ({
  id: styleId(faceShape, name),
  faceShape,
  name,
  image,
  imageUrl: "",
  details,
  isDefault: true,
});

export const defaultHaircutRecommendations = {
  Oval: {
    description:
      "If your face is slightly longer than wide and your jawline is softly rounded, you likely have an oval face shape. Your forehead and jaw are balanced, and your cheekbones are not too wide. Most hairstyles will suit you, so you can freely choose based on your style preference.",
    hairstyles: [
      createStyle("Oval", "Buzz Cut", ovalBuzzCut, "A very short and clean haircut that gives a neat and masculine look. Great for oval faces because it keeps the natural balance of the face visible."),
      createStyle("Oval", "Slick Back", ovalSlickBack, "Hair is brushed backward for a polished and classy style. It suits oval faces well because the face shape is already balanced."),
      createStyle("Oval", "Quiff", ovalQuiff, "A stylish haircut with volume at the front. It adds character while still keeping the balanced proportions of an oval face."),
      createStyle("Oval", "Pompadour", ovalPompadour, "A haircut with more height and swept-back volume. It looks sharp on oval faces without making the face look too long."),
      createStyle("Oval", "Side Part", ovalSidePart, "A classic haircut with a defined side division. It gives a clean and professional appearance that works very well with oval faces."),
      createStyle("Oval", "Textured Crop", ovalTexturedCrop, "A modern short haircut with texture on top. It is easy to maintain and looks stylish on oval faces."),
    ],
  },
  Round: {
    description:
      "If your face has almost the same width and length with soft curves and a rounded jawline, you likely have a round face shape. Your cheeks may look fuller and your chin is not very sharp. Haircuts that add height and sharper angles will help your face look longer and more defined.",
    hairstyles: [
      createStyle("Round", "Fohawk", roundFohawk, "A shorter version of a mohawk with height in the center. It helps round faces look longer and more structured."),
      createStyle("Round", "Pompadour", roundPompadour, "This style adds volume on top, which helps create the illusion of a longer face."),
      createStyle("Round", "Quiff", roundQuiff, "The front volume of a quiff helps add height and makes a round face appear less wide."),
      createStyle("Round", "Side Part", roundSidePart, "A side part adds angles and structure, helping round faces look more defined."),
      createStyle("Round", "Textured Crop", roundTexturedCrop, "A textured crop can work well when paired with shorter sides, helping reduce the round appearance."),
    ],
  },
  Square: {
    description:
      "If your forehead, cheekbones, and jawline are almost the same width and your jaw looks strong and sharp, you likely have a square face shape. Your face has defined angles and a masculine structure. Clean and structured haircuts will suit you very well.",
    hairstyles: [
      createStyle("Square", "Buzz Cut", squareBuzzCut, "A simple and bold style that highlights the strong jawline of a square face."),
      createStyle("Square", "Combover", squareCombover, "A neat side-swept haircut that keeps the sharp and clean structure of a square face."),
      createStyle("Square", "Fohawk", squareFohawk, "This adds a little height and edge while still complementing the strong angles of a square face."),
      createStyle("Square", "Mid Fade", squareMidFade, "A mid fade gives a clean and modern look that matches the defined features of a square face."),
      createStyle("Square", "Textured Crop", squareTexturedCrop, "A textured crop softens the top slightly while keeping the haircut sharp and stylish."),
    ],
  },
  Oblong: {
    description:
      "If your face is noticeably longer than wide and your forehead and jawline look almost the same width, you likely have an oblong face shape. Your face may look narrow with a longer chin area. Hairstyles that reduce height and add width on the sides will balance your features better.",
    hairstyles: [
      createStyle("Oblong", "Forward Crop", oblongForwardCrop, "Hair is styled forward to reduce the look of face length and make the face feel more balanced."),
      createStyle("Oblong", "Quiff", oblongQuiff, "This can work if the height is controlled, so the face does not look even longer."),
      createStyle("Oblong", "Undercut", oblongUndercut, "An undercut can suit oblong faces when balanced properly with enough fullness on top."),
      createStyle("Oblong", "Textured Crop", oblongTexturedCrop, "A textured crop is one of the best choices because it avoids too much height and keeps the style balanced."),
    ],
  },
  Heart: {
    description:
      "If you have a wider forehead and cheek area but a smaller, narrower chin, you likely have a heart face shape. Your face looks wider at the top and slimmer at the bottom. Haircuts that add volume on the sides or cover part of the forehead can help balance your face shape.",
    hairstyles: [
      createStyle("Heart", "Disconnected Undercut", heartDcUndercut, "A stylish haircut that keeps strong contrast while still working with the wider upper part of the face."),
      createStyle("Heart", "Messy Quiff", heartMessyQuiff, "The messy texture softens the forehead area and helps balance a narrower chin."),
      createStyle("Heart", "Middle Part", heartMiddlePart, "A middle part frames the face well and helps balance the wider forehead of a heart face shape."),
      createStyle("Heart", "Textured Crop", heartTexturedCrop, "A textured crop adds softness and works well for heart-shaped faces."),
    ],
  },
  Diamond: {
    description:
      "If your cheekbones are the widest part of your face while your forehead and chin are narrower, you likely have a diamond face shape. Your face looks sharp and angular, especially around the cheeks. Hairstyles with soft texture and some volume at the top or forehead area will make your face look more balanced.",
    hairstyles: [
      createStyle("Diamond", "Disconnected Undercut", diamondDcUndercut, "This style adds sharpness and modern structure while still complementing the cheekbones."),
      createStyle("Diamond", "Side Part", diamondSidePart, "A side part helps soften the angles and brings balance to the forehead and cheek area."),
      createStyle("Diamond", "Undercut", diamondUndercut, "An undercut gives a clean and stylish look that works well with diamond face features."),
      createStyle("Diamond", "Textured Crop", diamondTexturedCrop, "A textured crop softens the sharpness of the face and adds a balanced finish."),
    ],
  },
};

export const getDefaultHaircutStyles = () =>
  FACE_SHAPES.flatMap((faceShape) => defaultHaircutRecommendations[faceShape].hairstyles);

export const mergeHaircutStyles = (firestoreStyles = []) => {
  const byId = new Map(getDefaultHaircutStyles().map((style) => [style.id, style]));

  firestoreStyles.forEach((style) => {
    if (!style?.id) return;

    if (style.deleted) {
      byId.delete(style.id);
      return;
    }

    const existing = byId.get(style.id);
    byId.set(style.id, {
      ...existing,
      ...style,
      image: style.imageUrl || existing?.image || "",
      isDefault: Boolean(existing?.isDefault),
    });
  });

  return Array.from(byId.values()).filter((style) => !style.deleted);
};

export const buildRecommendations = (styles) =>
  FACE_SHAPES.reduce((recommendations, faceShape) => {
    recommendations[faceShape] = {
      description: defaultHaircutRecommendations[faceShape].description,
      hairstyles: styles.filter((style) => style.faceShape === faceShape),
    };
    return recommendations;
  }, {});
