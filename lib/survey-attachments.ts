export const MAX_SURVEY_IMAGES = 3;
export const MAX_SURVEY_IMAGE_BYTES = 300_000;
export const MAX_SURVEY_SUPPORTING_FILE_BYTES = 1_500_000;

const SUPPORTED_SURVEY_FILE_EXTENSIONS = new Set([
  ".csv",
  ".doc",
  ".docx",
  ".json",
  ".pdf",
  ".ppt",
  ".pptx",
  ".txt",
  ".xls",
  ".xlsx"
]);

const SUPPORTED_SURVEY_FILE_MIME_TYPES = new Set([
  "application/json",
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain"
]);

export type SurveyImageAttachment = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeInBytes: number;
};

export type SurveySupportingFileAttachment = {
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeInBytes: number;
};

export type SurveyAttachments = {
  images: SurveyImageAttachment[];
  supportingFile?: SurveySupportingFileAttachment;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSurveyAttachmentName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
}

function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionIndex = normalizedName.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return "";
  }

  return normalizedName.slice(extensionIndex);
}

export function buildEmptySurveyAttachments(): SurveyAttachments {
  return {
    images: []
  };
}

export function hasSurveyAttachments(value: SurveyAttachments | null | undefined) {
  return Boolean(value?.images.length || value?.supportingFile);
}

export function getDataUrlMimeType(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,/i);
  return match?.[1]?.toLowerCase() ?? "";
}

export function getDataUrlByteSize(dataUrl: string) {
  const [, base64Payload = ""] = dataUrl.split(",", 2);

  if (!base64Payload) {
    return 0;
  }

  const normalizedPayload = base64Payload.replace(/\s/g, "");
  const padding = normalizedPayload.endsWith("==") ? 2 : normalizedPayload.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((normalizedPayload.length * 3) / 4) - padding);
}

function isValidDataUrl(dataUrl: string) {
  return /^data:[^;,]+;base64,[a-z0-9+/=\s]+$/i.test(dataUrl);
}

export function isSupportedSurveyFileType(fileName: string, mimeType: string) {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  return (
    SUPPORTED_SURVEY_FILE_EXTENSIONS.has(getFileExtension(fileName)) ||
    SUPPORTED_SURVEY_FILE_MIME_TYPES.has(normalizedMimeType)
  );
}

export function formatAttachmentSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Unknown size";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(value / 1_000))} KB`;
}

function parseImageAttachment(value: unknown, index: number) {
  if (!isRecord(value)) {
    return null;
  }

  const name = normalizeSurveyAttachmentName(getString(value.name));
  const dataUrl = getString(value.dataUrl).trim();
  const mimeType = getDataUrlMimeType(dataUrl) || getString(value.mimeType).trim().toLowerCase();
  const sizeInBytes = getDataUrlByteSize(dataUrl);

  if (!name || !isValidDataUrl(dataUrl) || !mimeType.startsWith("image/")) {
    return null;
  }

  if (sizeInBytes <= 0 || sizeInBytes > MAX_SURVEY_IMAGE_BYTES) {
    return null;
  }

  return {
    id: getString(value.id) || `survey-image-${index + 1}`,
    name,
    mimeType,
    dataUrl,
    sizeInBytes
  } satisfies SurveyImageAttachment;
}

function parseSupportingFileAttachment(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const name = normalizeSurveyAttachmentName(getString(value.name));
  const dataUrl = getString(value.dataUrl).trim();
  const mimeType = getDataUrlMimeType(dataUrl) || getString(value.mimeType).trim().toLowerCase();
  const sizeInBytes = getDataUrlByteSize(dataUrl);

  if (!name || !isValidDataUrl(dataUrl) || !isSupportedSurveyFileType(name, mimeType)) {
    return null;
  }

  if (sizeInBytes <= 0 || sizeInBytes > MAX_SURVEY_SUPPORTING_FILE_BYTES) {
    return null;
  }

  return {
    name,
    mimeType,
    dataUrl,
    sizeInBytes
  } satisfies SurveySupportingFileAttachment;
}

export function parseSurveyAttachments(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawImages = Array.isArray(value.images) ? value.images : [];
  const images = rawImages
    .slice(0, MAX_SURVEY_IMAGES)
    .flatMap((image, index) => {
      const parsedImage = parseImageAttachment(image, index);
      return parsedImage ? [parsedImage] : [];
    });
  const supportingFile = parseSupportingFileAttachment(value.supportingFile);

  if (images.length === 0 && !supportingFile) {
    return undefined;
  }

  return {
    images,
    supportingFile: supportingFile ?? undefined
  } satisfies SurveyAttachments;
}

export function validateSurveyAttachmentsInput(value: unknown): {
  attachments?: SurveyAttachments;
  error?: string;
} {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    return {
      error: "Survey attachments are invalid."
    };
  }

  if (value.images !== undefined && !Array.isArray(value.images)) {
    return {
      error: "Survey images are invalid."
    };
  }

  const rawImages = Array.isArray(value.images) ? value.images : [];

  if (rawImages.length > MAX_SURVEY_IMAGES) {
    return {
      error: `You can upload up to ${MAX_SURVEY_IMAGES} survey images.`
    };
  }

  const images = rawImages.flatMap((image, index) => {
    const parsedImage = parseImageAttachment(image, index);
    return parsedImage ? [parsedImage] : [];
  });

  if (images.length !== rawImages.length) {
    return {
      error: "One or more survey images are invalid or too large."
    };
  }

  if (value.supportingFile !== undefined && value.supportingFile !== null && !isRecord(value.supportingFile)) {
    return {
      error: "The supporting file is invalid."
    };
  }

  const supportingFile =
    value.supportingFile === undefined || value.supportingFile === null
      ? undefined
      : parseSupportingFileAttachment(value.supportingFile);

  if (value.supportingFile && !supportingFile) {
    return {
      error: "The supporting file is invalid, unsupported, or too large."
    };
  }

  if (images.length === 0 && !supportingFile) {
    return {};
  }

  return {
    attachments: {
      images,
      supportingFile: supportingFile ?? undefined
    }
  };
}

export { normalizeSurveyAttachmentName };
