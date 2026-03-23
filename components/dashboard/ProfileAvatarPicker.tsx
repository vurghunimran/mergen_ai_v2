"use client";

import { type ChangeEvent, useRef } from "react";
import { Trash2, Upload } from "lucide-react";
import ImageWithFallback from "@/components/dashboard/ImageWithFallback";
import {
  createOptimizedAvatarDataUrl,
  getAvatarPresets,
  getDefaultAvatarSrc,
  resolveAvatarSrc
} from "@/lib/profile-avatars";
import type { AvatarMode, UserRole } from "@/lib/supabase/types";

export type ProfileAvatarValue = {
  avatarMode: AvatarMode;
  avatarPreset: string;
  avatarCustomDataUrl: string;
};

type ProfileAvatarPickerProps = {
  role: UserRole;
  value: ProfileAvatarValue;
  onChange: (value: ProfileAvatarValue) => void;
  onError: (message: string) => void;
  onClearError: () => void;
  isDark: boolean;
};

export default function ProfileAvatarPicker({
  role,
  value,
  onChange,
  onError,
  onClearError,
  isDark
}: ProfileAvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const presets = getAvatarPresets(role);
  const currentSrc = resolveAvatarSrc({
    role,
    avatarMode: value.avatarMode,
    avatarPreset: value.avatarPreset,
    avatarCustomDataUrl: value.avatarCustomDataUrl
  });
  const defaultSrc = getDefaultAvatarSrc(role);
  const accentSoftBackground = role === "client" ? (isDark ? "bg-[#2f2116]" : "bg-[#fff2e4]") : isDark ? "bg-[#2e2142]" : "bg-[#f3eeff]";
  const accentSoftBorder = role === "client" ? "border-[#ffd4b5]" : "border-[#dac8ff]";
  const accentButtonClassName =
    role === "client"
      ? "bg-[#f35b04] text-white hover:bg-[#d94f03]"
      : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]";
  const subtleButtonClassName =
    role === "client"
      ? isDark
        ? "border-[#493328] text-[#ffd8c0] hover:border-[#f35b04]"
        : "border-[#ffd6ba] text-[#f35b04] hover:border-[#f35b04]"
      : isDark
        ? "border-[#4c376d] text-[#e5dbff] hover:border-[#7c3aed]"
        : "border-[#d8c5ff] text-[#7c3aed] hover:border-[#7c3aed]";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    onClearError();

    try {
      const avatarCustomDataUrl = await createOptimizedAvatarDataUrl(file);

      onChange({
        ...value,
        avatarMode: "custom",
        avatarCustomDataUrl
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not process the selected image.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className={`rounded-[28px] border p-5 ${isDark ? "border-[#322921] bg-[#181311]" : "border-[#ece3d8] bg-white"}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className={`rounded-full border-4 ${accentSoftBorder} bg-white p-1 shadow-sm`}>
            <ImageWithFallback
              src={currentSrc}
              fallbackSrc={defaultSrc}
              alt="Selected profile avatar"
              className="h-20 w-20 rounded-full object-cover"
            />
          </div>
          <div>
            <h3 className={`text-[20px] font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>Profile picture</h3>
            <p className={`mt-1 text-sm ${isDark ? "text-[#b6ab9e]" : "text-[#667085]"}`}>
              Upload your own image, pick a preset, or remove it to use the default {role === "client" ? "orange" : "purple"} avatar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition ${accentButtonClassName}`}
          >
            <Upload className="h-4 w-4" />
            Upload image
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                avatarMode: "default",
                avatarCustomDataUrl: ""
              })
            }
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${subtleButtonClassName}`}
          >
            <Trash2 className="h-4 w-4" />
            Remove picture
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>Preset options</p>
          <span className={`text-xs ${isDark ? "text-[#a89b91]" : "text-[#8a94a6]"}`}>Changes are saved with account settings</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {presets.map((preset) => {
            const isActive = value.avatarMode === "preset" && value.avatarPreset === preset.key;

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() =>
                  onChange({
                    avatarMode: "preset",
                    avatarPreset: preset.key,
                    avatarCustomDataUrl: ""
                  })
                }
                className={`rounded-[22px] border p-3 text-left transition ${
                  isActive
                    ? `shadow-[0_14px_30px_rgba(15,23,42,0.1)] ${accentSoftBackground} ${accentSoftBorder}`
                    : isDark
                      ? "border-[#322921] bg-[#1f1815] hover:border-[#5b4c42]"
                      : "border-[#ece3d8] bg-[#fffcf8] hover:border-[#dccdbf]"
                }`}
              >
                <ImageWithFallback
                  src={preset.src}
                  fallbackSrc={defaultSrc}
                  alt={preset.label}
                  className="h-20 w-full rounded-[18px] object-cover"
                />
                <p className={`mt-3 text-sm font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>{preset.label}</p>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                avatarMode: "default",
                avatarCustomDataUrl: ""
              })
            }
            className={`rounded-[22px] border p-3 text-left transition ${
              value.avatarMode === "default"
                ? `shadow-[0_14px_30px_rgba(15,23,42,0.1)] ${accentSoftBackground} ${accentSoftBorder}`
                : isDark
                  ? "border-[#322921] bg-[#1f1815] hover:border-[#5b4c42]"
                  : "border-[#ece3d8] bg-[#fffcf8] hover:border-[#dccdbf]"
            }`}
          >
            <div className="flex h-20 items-center justify-center rounded-[18px] bg-white">
              <ImageWithFallback src={defaultSrc} fallbackSrc={defaultSrc} alt="Default avatar" className="h-16 w-16 rounded-full object-cover" />
            </div>
            <p className={`mt-3 text-sm font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>Default</p>
          </button>
        </div>
      </div>
    </div>
  );
}
