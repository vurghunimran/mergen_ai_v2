import type { AvatarMode, UserRole } from "@/lib/supabase/types";

export type AvatarPresetOption = {
  key: string;
  label: string;
  src: string;
};

export const AVATAR_METADATA_KEYS = {
  mode: "avatar_mode",
  preset: "avatar_preset",
  customDataUrl: "avatar_custom_data_url"
} as const;

const CLIENT_PRESETS: AvatarPresetOption[] = [
  { key: "client-sunrise", label: "Sunrise", src: "/avatars/client-sunrise.svg" },
  { key: "client-graph", label: "Graph", src: "/avatars/client-graph.svg" },
  { key: "client-study", label: "Study", src: "/avatars/client-study.svg" }
] as const;

const COMMUNITY_PRESETS: AvatarPresetOption[] = [
  { key: "community-orbit", label: "Orbit", src: "/avatars/community-orbit.svg" },
  { key: "community-pulse", label: "Pulse", src: "/avatars/community-pulse.svg" },
  { key: "community-lilac", label: "Lilac", src: "/avatars/community-lilac.svg" }
] as const;

export function isAvatarMode(value: unknown): value is AvatarMode {
  return value === "default" || value === "preset" || value === "custom";
}

export function getDefaultAvatarSrc(role: UserRole) {
  return role === "client" ? "/avatars/client-default.svg" : "/avatars/community-default.svg";
}

export function getAvatarPresets(role: UserRole) {
  return role === "client" ? CLIENT_PRESETS : COMMUNITY_PRESETS;
}

export function getDefaultAvatarPreset(role: UserRole) {
  return getAvatarPresets(role)[0]?.key ?? "";
}

function getPresetSrc(role: UserRole, presetKey: string) {
  return getAvatarPresets(role).find((preset) => preset.key === presetKey)?.src ?? "";
}

export function resolveAvatarSelection(
  role: UserRole,
  avatarMode: unknown,
  avatarPreset: unknown,
  avatarCustomDataUrl: unknown
) {
  const safePreset = typeof avatarPreset === "string" && getPresetSrc(role, avatarPreset) ? avatarPreset : getDefaultAvatarPreset(role);
  const safeCustomDataUrl = typeof avatarCustomDataUrl === "string" ? avatarCustomDataUrl : "";
  const safeMode = isAvatarMode(avatarMode) ? avatarMode : "default";

  if (safeMode === "custom" && !safeCustomDataUrl) {
    return {
      avatarMode: "default" as AvatarMode,
      avatarPreset: safePreset,
      avatarCustomDataUrl: ""
    };
  }

  if (safeMode === "preset") {
    return {
      avatarMode: "preset" as AvatarMode,
      avatarPreset: safePreset,
      avatarCustomDataUrl: ""
    };
  }

  if (safeMode === "custom") {
    return {
      avatarMode: "custom" as AvatarMode,
      avatarPreset: safePreset,
      avatarCustomDataUrl: safeCustomDataUrl
    };
  }

  return {
    avatarMode: "default" as AvatarMode,
    avatarPreset: safePreset,
    avatarCustomDataUrl: ""
  };
}

export function resolveAvatarSrc(input: {
  role: UserRole;
  avatarMode: AvatarMode;
  avatarPreset: string;
  avatarCustomDataUrl: string;
}) {
  if (input.avatarMode === "custom" && input.avatarCustomDataUrl) {
    return input.avatarCustomDataUrl;
  }

  if (input.avatarMode === "preset") {
    const presetSrc = getPresetSrc(input.role, input.avatarPreset);

    if (presetSrc) {
      return presetSrc;
    }
  }

  return getDefaultAvatarSrc(input.role);
}

export async function createOptimizedAvatarDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Could not read the selected image."));
      nextImage.src = objectUrl;
    });

    const size = 240;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not prepare the avatar image.");
    }

    const sourceSize = Math.min(image.width, image.height);
    const sourceX = (image.width - sourceSize) / 2;
    const sourceY = (image.height - sourceSize) / 2;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);

    if (!dataUrl) {
      throw new Error("Could not prepare the avatar image.");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
