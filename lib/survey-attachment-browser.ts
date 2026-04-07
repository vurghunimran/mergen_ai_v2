import {
  MAX_SURVEY_IMAGE_BYTES,
  MAX_SURVEY_SUPPORTING_FILE_BYTES,
  getDataUrlByteSize,
  getDataUrlMimeType,
  isSupportedSurveyFileType,
  normalizeSurveyAttachmentName,
  type SurveyImageAttachment,
  type SurveySupportingFileAttachment
} from "@/lib/survey-attachments";

const MAX_SURVEY_IMAGE_SOURCE_BYTES = 12_000_000;
const MAX_SURVEY_IMAGE_DIMENSION = 1600;

function buildAttachmentId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `survey-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result) {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read the selected file."));
    };

    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Could not read the selected image."));
    nextImage.src = url;
  });
}

export async function createSurveyImageAttachment(file: File): Promise<SurveyImageAttachment> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  if (file.size > MAX_SURVEY_IMAGE_SOURCE_BYTES) {
    throw new Error("Each image must be 12 MB or smaller before upload.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_SURVEY_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const baseWidth = Math.max(1, Math.round(image.width * scale));
    const baseHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not prepare the selected image.");
    }

    let quality = 0.86;
    let currentScale = 1;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = Math.max(1, Math.round(baseWidth * currentScale));
      canvas.height = Math.max(1, Math.round(baseHeight * currentScale));

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/webp", quality);
      const sizeInBytes = getDataUrlByteSize(dataUrl);

      if (sizeInBytes > 0 && sizeInBytes <= MAX_SURVEY_IMAGE_BYTES) {
        const baseName = normalizeSurveyAttachmentName(file.name.replace(/\.[^.]+$/, "") || "survey-image");

        return {
          id: buildAttachmentId(),
          name: `${baseName}.webp`,
          mimeType: getDataUrlMimeType(dataUrl) || "image/webp",
          dataUrl,
          sizeInBytes
        };
      }

      if (quality > 0.56) {
        quality -= 0.1;
      } else {
        currentScale *= 0.82;
      }
    }

    throw new Error("This image is still too large after optimization. Please choose a smaller image.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createSurveySupportingFileAttachment(file: File): Promise<SurveySupportingFileAttachment> {
  const normalizedMimeType = file.type.trim().toLowerCase();

  if (!isSupportedSurveyFileType(file.name, normalizedMimeType)) {
    throw new Error("Please upload a PDF, spreadsheet, document, CSV, TXT, or JSON file.");
  }

  if (file.size > MAX_SURVEY_SUPPORTING_FILE_BYTES) {
    throw new Error("The supporting file must be 1.5 MB or smaller.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  return {
    name: normalizeSurveyAttachmentName(file.name),
    mimeType: getDataUrlMimeType(dataUrl) || normalizedMimeType || "application/octet-stream",
    dataUrl,
    sizeInBytes: file.size
  };
}
