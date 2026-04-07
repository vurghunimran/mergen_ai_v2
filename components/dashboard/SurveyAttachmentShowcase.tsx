import { FileText, Images } from "lucide-react";
import ImageWithFallback from "@/components/dashboard/ImageWithFallback";
import {
  formatAttachmentSize,
  hasSurveyAttachments,
  type SurveyAttachments
} from "@/lib/survey-attachments";

type AttachmentTone = "neutral" | "orange" | "purple";

type SurveyAttachmentShowcaseProps = {
  attachments?: SurveyAttachments;
  title?: string;
  description?: string;
  tone?: AttachmentTone;
  className?: string;
};

const toneClasses: Record<
  AttachmentTone,
  {
    container: string;
    icon: string;
    eyebrow: string;
    title: string;
    body: string;
    card: string;
    badge: string;
    link: string;
  }
> = {
  neutral: {
    container: "border-gray-200 bg-white",
    icon: "bg-[#f4f4f5] text-[#52525b]",
    eyebrow: "text-[#667085]",
    title: "text-[#111827]",
    body: "text-[#667085]",
    card: "border-gray-200 bg-[#fcfcfd]",
    badge: "bg-[#f4f4f5] text-[#52525b]",
    link: "text-[#d85d1c] hover:text-[#b54708]"
  },
  orange: {
    container: "border-[#f0e3d7] bg-[#fffaf5]",
    icon: "bg-[#fff3e7] text-[#f35b04]",
    eyebrow: "text-[#d85d1c]",
    title: "text-[#111827]",
    body: "text-[#6b7280]",
    card: "border-[#f0e3d7] bg-white",
    badge: "bg-[#fff3e7] text-[#d85d1c]",
    link: "text-[#c2410c] hover:text-[#9a3412]"
  },
  purple: {
    container: "border-[#dccbff] bg-[#faf7ff]",
    icon: "bg-[#efe7ff] text-[#7c3aed]",
    eyebrow: "text-[#7c3aed]",
    title: "text-[#1f2937]",
    body: "text-[#6b7280]",
    card: "border-[#dccbff] bg-white",
    badge: "bg-[#f3eeff] text-[#7c3aed]",
    link: "text-[#6d3fd1] hover:text-[#5b21b6]"
  }
};

export default function SurveyAttachmentShowcase({
  attachments,
  title = "Extra context",
  description = "These optional materials are available to help respondents understand the survey.",
  tone = "neutral",
  className = ""
}: SurveyAttachmentShowcaseProps) {
  if (!hasSurveyAttachments(attachments)) {
    return null;
  }

  const styles = toneClasses[tone];
  const imageCount = attachments?.images.length ?? 0;
  const supportingFile = attachments?.supportingFile;

  return (
    <section className={`rounded-[24px] border p-5 ${styles.container} ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${styles.eyebrow}`}>Survey attachments</p>
          <h3 className={`mt-2 text-[20px] font-semibold ${styles.title}`}>{title}</h3>
          <p className={`mt-2 max-w-3xl text-[15px] leading-7 ${styles.body}`}>{description}</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${styles.badge}`}>
          <Images className="h-4 w-4" />
          <span>
            {imageCount} image{imageCount === 1 ? "" : "s"}
            {supportingFile ? " + 1 file" : ""}
          </span>
        </div>
      </div>

      {imageCount > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attachments?.images.map((image) => (
            <figure key={image.id} className={`overflow-hidden rounded-[22px] border p-3 ${styles.card}`}>
              <div className="overflow-hidden rounded-[18px] bg-[#f8fafc]">
                <ImageWithFallback
                  src={image.dataUrl}
                  alt={image.name}
                  className="h-44 w-full object-cover"
                />
              </div>
              <figcaption className="mt-3 flex items-center justify-between gap-3">
                <p className={`break-words text-sm font-medium ${styles.title}`}>{image.name}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.badge}`}>
                  {formatAttachmentSize(image.sizeInBytes)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {supportingFile ? (
        <div className={`mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border p-4 ${styles.card}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.icon}`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${styles.title}`}>{supportingFile.name}</p>
              <p className={`text-sm ${styles.body}`}>{formatAttachmentSize(supportingFile.sizeInBytes)}</p>
            </div>
          </div>
          <a
            href={supportingFile.dataUrl}
            download={supportingFile.name}
            className={`text-sm font-semibold transition ${styles.link}`}
          >
            Download file
          </a>
        </div>
      ) : null}
    </section>
  );
}
