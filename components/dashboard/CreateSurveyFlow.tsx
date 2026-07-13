"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  CreditCard,
  Eye,
  ImagePlus,
  Paperclip,
  Plus,
  Rocket,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import ImageWithFallback from "@/components/dashboard/ImageWithFallback";
import AutoDismissNotice from "@/components/ui/auto-dismiss-notice";
import {
  getCreateSurveyDraftStorageKey,
  SURVEY_PREVIEW_STORAGE_KEY,
  type StoredSurveyQuestion,
  type SurveyPreviewPayload,
  type SurveyAudience,
  type SurveyCheckoutPayload,
  type SurveyQuestionType
} from "@/lib/dashboard-data";
import {
  AI_DETAILED_SURVEY_FEE,
  academicQuestionCountOptions,
  academicRespondentCountOptions,
  formatUsd,
  getAcademicSurveyBasePrice
} from "@/lib/survey-pricing";
import {
  surveyRegionCountries,
  surveyRegionGroups,
  surveyRegionTargets,
  surveyRegionTotalTarget,
  type SurveyRegion
} from "@/lib/country-regions";
import {
  educationLevelOptions as communityEducationLevelOptions,
  familyStatusOptions as communityFamilyStatusOptions,
  interestOptions as communityInterestOptions,
  residenceOptions as communityResidenceOptions,
  salaryRangeOptions as communitySalaryRangeOptions
} from "@/lib/auth-options";
import {
  questionOptionsForType,
  surveyQuestionTypes,
  type SurveyAssistantRequest,
  type SurveyAssistantResponse
} from "@/lib/survey-assistant";
import { getSurveyActiveWindowDays } from "@/lib/survey-rollout";
import {
  createSurveyImageAttachment,
  createSurveySupportingFileAttachment
} from "@/lib/survey-attachment-browser";
import {
  MAX_SURVEY_IMAGES,
  buildEmptySurveyAttachments,
  formatAttachmentSize,
  hasSurveyAttachments,
  parseSurveyAttachments,
  type SurveyAttachments,
  type SurveyImageAttachment
} from "@/lib/survey-attachments";

const STEP_TITLE_CLASS_NAME = "text-[34px] font-bold tracking-[-0.04em] text-[#7c3412]";

type CreateSurveyStage = "define" | "generate" | "payment" | "launch";
type QuestionType = SurveyQuestionType;

type SurveyQuestion = StoredSurveyQuestion;

type SurveyDraft = {
  surveyTitle: string;
  surveyDescription: string;
  attachments: SurveyAttachments;
  researchArea: string;
  targetRegion: string;
  generalAudience: boolean;
  selectedCountries: string[];
  ageMin: number;
  ageMax: number;
  financialSituation: string;
  gender: string;
  education: string;
  residence: string;
  familyStatus: string;
  interests: string[];
  questionCount: number;
  respondentCount: 50 | 100 | 250 | 500 | 1000;
  assistantPrompt: string;
  researchScope: string;
  hypothesis: string;
  questions: SurveyQuestion[];
  includeDetailedAI: boolean;
};

type SavedCreateSurveyDraft = {
  stage: CreateSurveyStage;
  draft: SurveyDraft;
  savedAt: string;
};

type Props = {
  userId: string;
  onBackToDashboard: () => void;
  onStartCheckout: (payload: SurveyCheckoutPayload) => Promise<{ checkoutUrl: string }>;
};

const researchAreas = [
  "Education Science",
  "Psychology",
  "Sociology",
  "Economics",
  "Health Science",
  "Political Science",
  "Computer Science",
  "Environmental Science",
  "Business",
  "Communication Studies"
] as const;

const financialRanges = ["All salary ranges", ...communitySalaryRangeOptions];

const genderOptions = ["All genders", "Female", "Male", "Non-binary", "Prefer not to say"] as const;
const educationOptions = ["Any education level", ...communityEducationLevelOptions];
const residenceOptions = ["Any residence type", ...communityResidenceOptions];
const familyStatusOptions = ["Any family status", ...communityFamilyStatusOptions];
const interestOptions = communityInterestOptions;

const legacyInterestMapping: Record<string, string> = {
  "Online learning": "Education",
  "Career growth": "Business",
  Research: "Science",
  Entertainment: "Media and Entertainment",
  Sustainability: "Environment",
  Entrepreneurship: "Business"
};

const questionTypeOptions: QuestionType[] = surveyQuestionTypes;

const stageItems: Array<{ id: CreateSurveyStage; label: string }> = [
  { id: "define", label: "Define" },
  { id: "generate", label: "Generate" },
  { id: "payment", label: "Payment" },
  { id: "launch", label: "Launch" }
];

function buildInitialDraft(): SurveyDraft {
  return {
    surveyTitle: "",
    surveyDescription: "",
    attachments: buildEmptySurveyAttachments(),
    researchArea: "Education Science",
    targetRegion: "North America",
    generalAudience: false,
    selectedCountries: ["United States", "Canada"],
    ageMin: 25,
    ageMax: 55,
    financialSituation: "All salary ranges",
    gender: "All genders",
    education: "Any education level",
    residence: "Any residence type",
    familyStatus: "Any family status",
    interests: ["Education"],
    questionCount: 10,
    respondentCount: 250,
    assistantPrompt: "",
    researchScope: "",
    hypothesis: "",
    questions: [],
    includeDetailedAI: false
  };
}

function sanitizeDraftInterests(interests: string[] | undefined) {
  const normalizedInterests = (interests ?? [])
    .map((interest) => legacyInterestMapping[interest] ?? interest)
    .filter((interest, index, values) => interestOptions.includes(interest) && values.indexOf(interest) === index)
    .slice(0, 3);

  return normalizedInterests.length > 0 ? normalizedInterests : ["Education"];
}

function sanitizeDraftFinancialSituation(value: string | undefined) {
  const normalizedValue =
    value === "Under $500 / month"
      ? "Up to $500"
      : value === "$500 - $1,000 / month"
        ? "Up to $1,000"
        : value === "$1,001 - $2,500 / month"
          ? "Up to $2,500"
          : value === "$2,501 - $5,000 / month"
            ? "Up to $5,000"
            : value === "$5,001 - $10,000 / month"
              ? "Up to $10,000"
              : value === "$10,000+ / month"
                ? "$10,000+"
                : value;

  return financialRanges.includes(normalizedValue ?? "")
    ? (normalizedValue as string)
    : "All salary ranges";
}

function sanitizeDraftEducation(value: string | undefined) {
  const normalizedValue =
    value === "High school"
      ? "High School"
      : value === "Bachelor's degree"
        ? "Bachelor's Degree"
        : value === "Master's degree"
          ? "Master's Degree"
          : value;

  return educationOptions.includes(normalizedValue ?? "")
    ? (normalizedValue as string)
    : "Any education level";
}

function sanitizeDraftResidence(value: string | undefined) {
  const normalizedValue =
    value === "Urban area"
      ? "City (Urban area)"
      : value === "Suburban area"
        ? "Suburban area (City outskirts)"
        : value === "Village"
          ? "Village (Rural area)"
          : value;

  return residenceOptions.includes(normalizedValue ?? "")
    ? (normalizedValue as string)
    : "Any residence type";
}

function sanitizeDraftFamilyStatus(value: string | undefined) {
  const normalizedValue =
    value === "Partnered"
      ? "In a relationship"
      : value === "Parent / guardian"
        ? "Any family status"
        : value;

  return familyStatusOptions.includes(normalizedValue ?? "")
    ? (normalizedValue as string)
    : "Any family status";
}

function buildTargetLabel(draft: SurveyDraft) {
  if (draft.generalAudience) {
    return "General Audience";
  }

  if (draft.selectedCountries.length > 0) {
    return draft.selectedCountries.join(", ");
  }

  return draft.targetRegion;
}

function buildCommunityMessage(draft: SurveyDraft) {
  const trimmedDescription = draft.surveyDescription.trim();

  if (trimmedDescription) {
    return trimmedDescription;
  }

  return `${draft.researchArea} survey for ${draft.gender.toLowerCase()} respondents aged ${draft.ageMin}-${draft.ageMax} in ${buildTargetLabel(draft)}.`;
}

function buildInterestSummary(interests: string[]) {
  if (interests.length === 0) {
    return "without a specific interest filter";
  }

  return `with interest in ${interests.join(", ").toLowerCase()}`;
}

function buildDefaultPrompt(draft: SurveyDraft) {
  return `I want to research ${draft.surveyTitle || "audience preferences"} with respondents in ${buildTargetLabel(draft)} for ${draft.researchArea.toLowerCase()}.`;
}

function buildDefaultScope(draft: SurveyDraft) {
  return `Target respondents aged ${draft.ageMin}-${draft.ageMax}, ${draft.gender.toLowerCase()}, ${draft.education.toLowerCase()}, living in ${draft.residence.toLowerCase()}, ${buildInterestSummary(draft.interests)}.`;
}

function buildDefaultHypothesis(draft: SurveyDraft) {
  return `Respondents across ${buildTargetLabel(draft)} will show clear preference differences around ${draft.surveyTitle || "the topic"} based on education level and financial situation.`;
}

function generateQuestionText(index: number, draft: SurveyDraft) {
  const topic = draft.surveyTitle || draft.researchArea;
  const templates = [
    `How important is ${topic.toLowerCase()} when you evaluate options in ${buildTargetLabel(draft)}?`,
    `Which factor matters most when thinking about ${topic.toLowerCase()}?`,
    `How satisfied are you with current experiences related to ${topic.toLowerCase()}?`,
    `What is the biggest challenge you face regarding ${topic.toLowerCase()} today?`,
    `How likely are you to recommend a better solution for ${topic.toLowerCase()}?`,
    `Which change would most improve your experience with ${topic.toLowerCase()}?`,
    `How does your education level influence your expectations about ${topic.toLowerCase()}?`,
    `What motivates you to engage more with ${topic.toLowerCase()} offerings?`
  ];

  return templates[index % templates.length];
}

function generateQuestions(draft: SurveyDraft) {
  return Array.from({ length: draft.questionCount }, (_, index) => {
    const type = questionTypeOptions[index % questionTypeOptions.length];
    return {
      id: `question-${index + 1}-${Date.now()}`,
      text: generateQuestionText(index, draft),
      type,
      options: questionOptionsForType(type)
    };
  });
}

function syncQuestionsToCount(questions: SurveyQuestion[], draft: SurveyDraft) {
  const trimmedQuestions = questions.slice(0, draft.questionCount);

  if (trimmedQuestions.length === draft.questionCount) {
    return trimmedQuestions;
  }

  const fallbackQuestions = generateQuestions(draft);
  return [...trimmedQuestions, ...fallbackQuestions.slice(trimmedQuestions.length, draft.questionCount)];
}

function formatDraftSavedAt() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

export default function CreateSurveyFlow({ userId, onBackToDashboard, onStartCheckout }: Props) {
  const draftStorageKey = getCreateSurveyDraftStorageKey(userId);
  const surveyImagesInputRef = useRef<HTMLInputElement | null>(null);
  const surveyFileInputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<CreateSurveyStage>("define");
  const [draft, setDraft] = useState<SurveyDraft>(buildInitialDraft);
  const [draftNotice, setDraftNotice] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [launchComplete, setLaunchComplete] = useState(false);
  const [launchTimestamp, setLaunchTimestamp] = useState("");
  const [launchMatchedRecipients, setLaunchMatchedRecipients] = useState(0);
  const [launchSentEmails, setLaunchSentEmails] = useState(0);
  const [launchNotificationError, setLaunchNotificationError] = useState("");
  const [isLaunchNoticeVisible, setIsLaunchNoticeVisible] = useState(true);

  useEffect(() => {
    try {
      const storedDraft = window.localStorage.getItem(draftStorageKey);
      if (!storedDraft) return;

      const parsedDraft = JSON.parse(storedDraft) as SavedCreateSurveyDraft;

      if (parsedDraft?.draft && parsedDraft?.stage) {
        const restoredDraft = {
          ...buildInitialDraft(),
          ...parsedDraft.draft,
          attachments: parseSurveyAttachments(parsedDraft.draft.attachments) ?? buildEmptySurveyAttachments(),
          interests: sanitizeDraftInterests(parsedDraft.draft.interests),
          financialSituation: sanitizeDraftFinancialSituation(parsedDraft.draft.financialSituation),
          education: sanitizeDraftEducation(parsedDraft.draft.education),
          residence: sanitizeDraftResidence(parsedDraft.draft.residence),
          familyStatus: sanitizeDraftFamilyStatus(parsedDraft.draft.familyStatus)
        };

        setDraft({
          ...restoredDraft
        });
        setStage(parsedDraft.stage);
        setDraftNotice(`Draft restored from ${parsedDraft.savedAt}.`);
      }
    } catch {
      // Ignore malformed local draft.
    }
  }, [draftStorageKey]);

  const pricing = useMemo(() => {
    const selectedQuestionCount = draft.questions.length || draft.questionCount;
    const { questionTier, basePrice } = getAcademicSurveyBasePrice(selectedQuestionCount, draft.respondentCount);
    const aiDetailedFee = draft.includeDetailedAI ? AI_DETAILED_SURVEY_FEE : 0;
    const total = basePrice + aiDetailedFee;

    return {
      selectedQuestionCount,
      questionTier,
      basePrice,
      aiDetailedFee,
      isTierAdjusted: selectedQuestionCount !== questionTier,
      total
    };
  }, [draft.includeDetailedAI, draft.questionCount, draft.questions.length, draft.respondentCount]);

  useEffect(() => {
    setIsLaunchNoticeVisible(true);
  }, [launchNotificationError, launchSentEmails]);

  const currentStageIndex = stageItems.findIndex((item) => item.id === stage);
  const currentRegion = surveyRegionGroups.includes(draft.targetRegion as SurveyRegion)
    ? (draft.targetRegion as SurveyRegion)
    : surveyRegionGroups[0];
  const availableCountries = surveyRegionCountries[currentRegion].filter(
    (country) => !draft.selectedCountries.includes(country)
  );
  const currentRegionTarget = surveyRegionTargets[currentRegion];
  const ageMinPercentage = ((draft.ageMin - 18) / (80 - 18)) * 100;
  const ageMaxPercentage = ((draft.ageMax - 18) / (80 - 18)) * 100;
  const surveyActiveWindowDays = getSurveyActiveWindowDays(draft.respondentCount);

  function updateDraft<Key extends keyof SurveyDraft>(field: Key, value: SurveyDraft[Key]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value
    }));
  }

  function buildCheckoutPayload() {
    return {
      title: draft.surveyTitle,
      targetResponses: draft.respondentCount,
      questionCount: draft.questions.length || draft.questionCount,
      description: buildCommunityMessage(draft),
      researchDescription: draft.assistantPrompt || buildDefaultPrompt(draft),
      researchScope: draft.researchScope || buildDefaultScope(draft),
      hypothesis: draft.hypothesis || buildDefaultHypothesis(draft),
      audience: {
        countries: draft.generalAudience ? [] : draft.selectedCountries,
        generalAudience: draft.generalAudience,
        ageMin: draft.ageMin,
        ageMax: draft.ageMax,
        gender: draft.gender,
        education: draft.education,
        interests: draft.interests,
        salaryRange: draft.financialSituation,
        residence: draft.residence,
        familyStatus: draft.familyStatus,
        researchArea: draft.researchArea
      },
      questions: draft.questions,
      includeDetailedAI: draft.includeDetailedAI,
      attachments: hasSurveyAttachments(draft.attachments) ? draft.attachments : undefined
    } satisfies SurveyCheckoutPayload;
  }

  function saveDraftToLocalStorage(nextStage: CreateSurveyStage, nextDraft: SurveyDraft) {
    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        stage: nextStage,
        draft: nextDraft,
        savedAt: formatDraftSavedAt()
      } satisfies SavedCreateSurveyDraft)
    );
  }

  async function handleSurveyImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setAttachmentError("");

    const remainingSlots = MAX_SURVEY_IMAGES - draft.attachments.images.length;

    if (remainingSlots <= 0) {
      setAttachmentError(`You can upload up to ${MAX_SURVEY_IMAGES} images for a survey.`);
      return;
    }

    const nextImages: SurveyImageAttachment[] = [];
    const filesToProcess = files.slice(0, remainingSlots);
    let nextError = "";

    for (const file of filesToProcess) {
      try {
        nextImages.push(await createSurveyImageAttachment(file));
      } catch (error) {
        nextError = error instanceof Error ? error.message : "Could not process one of the selected images.";
        break;
      }
    }

    if (nextImages.length > 0) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        attachments: {
          ...currentDraft.attachments,
          images: [...currentDraft.attachments.images, ...nextImages]
        }
      }));
    }

    if (!nextError && files.length > remainingSlots) {
      nextError = `Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} can be added. Surveys are limited to ${MAX_SURVEY_IMAGES} images.`;
    }

    if (nextError) {
      setAttachmentError(nextError);
    }
  }

  async function handleSupportingFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setAttachmentError("");

    try {
      const supportingFile = await createSurveySupportingFileAttachment(file);

      setDraft((currentDraft) => ({
        ...currentDraft,
        attachments: {
          ...currentDraft.attachments,
          supportingFile
        }
      }));
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Could not process the selected file.");
    }
  }

  function handleRemoveSurveyImage(imageId: string) {
    setAttachmentError("");
    setDraft((currentDraft) => ({
      ...currentDraft,
      attachments: {
        ...currentDraft.attachments,
        images: currentDraft.attachments.images.filter((image) => image.id !== imageId)
      }
    }));
  }

  function handleRemoveSupportingFile() {
    setAttachmentError("");
    setDraft((currentDraft) => ({
      ...currentDraft,
      attachments: {
        ...currentDraft.attachments,
        supportingFile: undefined
      }
    }));
  }

  function toggleInterest(interest: string) {
    setDraft((currentDraft) => {
      const isSelected = currentDraft.interests.includes(interest);

      if (isSelected) {
        return {
          ...currentDraft,
          interests: currentDraft.interests.filter((item) => item !== interest)
        };
      }

      if (currentDraft.interests.length >= 3) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        interests: [...currentDraft.interests, interest]
      };
    });
  }

  function handleRegionChange(nextRegion: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      targetRegion: nextRegion
    }));
  }

  function handleGeneralAudienceToggle() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      generalAudience: !currentDraft.generalAudience
    }));
  }

  function handleCountryAdd(country: string) {
    if (!country) return;

    setDraft((currentDraft) => {
      if (currentDraft.selectedCountries.includes(country) || currentDraft.selectedCountries.length >= 7) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        selectedCountries: [...currentDraft.selectedCountries, country]
      };
    });
  }

  function handleCountryRemove(country: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      selectedCountries: currentDraft.selectedCountries.filter((item) => item !== country)
    }));
  }

  function handleAgeMinChange(nextMin: number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ageMin: Math.min(nextMin, currentDraft.ageMax - 1)
    }));
  }

  function handleAgeMaxChange(nextMax: number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ageMax: Math.max(nextMax, currentDraft.ageMin + 1)
    }));
  }

  function buildEnrichedDraft() {
    return {
      ...draft,
      assistantPrompt: draft.assistantPrompt || buildDefaultPrompt(draft),
      researchScope: draft.researchScope || buildDefaultScope(draft),
      hypothesis: draft.hypothesis || buildDefaultHypothesis(draft)
    };
  }

  async function requestAIGeneration(nextDraft: SurveyDraft) {
    const payload: SurveyAssistantRequest = {
      surveyTitle: nextDraft.surveyTitle,
      researchArea: nextDraft.researchArea,
      targetRegion: nextDraft.targetRegion,
      generalAudience: nextDraft.generalAudience,
      selectedCountries: nextDraft.generalAudience ? [] : nextDraft.selectedCountries,
      ageMin: nextDraft.ageMin,
      ageMax: nextDraft.ageMax,
      financialSituation: nextDraft.financialSituation,
      gender: nextDraft.gender,
      education: nextDraft.education,
      residence: nextDraft.residence,
      familyStatus: nextDraft.familyStatus,
      interests: nextDraft.interests,
      questionCount: nextDraft.questionCount,
      respondentCount: nextDraft.respondentCount,
      assistantPrompt: nextDraft.assistantPrompt,
      researchScope: nextDraft.researchScope,
      hypothesis: nextDraft.hypothesis
    };

    const response = await fetch("/api/survey-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseBody = (await response.json()) as Partial<SurveyAssistantResponse> & { error?: string };

    if (!response.ok || !responseBody.questions) {
      throw new Error(responseBody.error ?? "AI survey generation failed.");
    }

    return responseBody as SurveyAssistantResponse;
  }

  async function handleGenerateFromDefine() {
    const enrichedDraft = buildEnrichedDraft();
    setGenerationError("");
    setDraftNotice("");
    setIsGeneratingQuestions(true);

    try {
      const aiResult = await requestAIGeneration(enrichedDraft);

      setDraft({
        ...enrichedDraft,
        assistantPrompt: aiResult.assistantPrompt,
        researchScope: aiResult.researchScope,
        hypothesis: aiResult.hypothesis,
        questions: syncQuestionsToCount(aiResult.questions, enrichedDraft)
      });
      setDraftNotice("AI questions generated.");
      setStage("generate");
    } catch (error) {
      setDraft({
        ...enrichedDraft,
        questions: generateQuestions(enrichedDraft)
      });
      setGenerationError(
        error instanceof Error
          ? `${error.message} Template questions were generated so you can keep editing.`
          : "AI survey generation failed. Template questions were generated so you can keep editing."
      );
      setStage("generate");
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  async function handleGenerateQuestions() {
    const enrichedDraft = buildEnrichedDraft();
    setGenerationError("");
    setDraftNotice("");
    setIsGeneratingQuestions(true);

    try {
      const aiResult = await requestAIGeneration(enrichedDraft);

      setDraft({
        ...enrichedDraft,
        assistantPrompt: aiResult.assistantPrompt,
        researchScope: aiResult.researchScope,
        hypothesis: aiResult.hypothesis,
        questions: syncQuestionsToCount(aiResult.questions, enrichedDraft)
      });
      setDraftNotice("AI questions generated.");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "AI survey generation failed.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  function handleQuestionChange(questionId: string, nextText: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question) =>
        question.id === questionId ? { ...question, text: nextText } : question
      )
    }));
  }

  function handleQuestionTypeChange(questionId: string, nextType: QuestionType) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              type: nextType,
              options: questionOptionsForType(nextType)
            }
          : question
      )
    }));
  }

  function handleOptionChange(questionId: string, optionIndex: number, nextValue: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option, index) => (index === optionIndex ? nextValue : option))
            }
          : question
      )
    }));
  }

  function handleAddOption(questionId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [...question.options, `Option ${question.options.length + 1}`]
            }
          : question
      )
    }));
  }

  function handleRemoveOption(questionId: string, optionIndex: number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question) => {
        if (question.id !== questionId || question.options.length <= 2) {
          return question;
        }

        return {
          ...question,
          options: question.options.filter((_, index) => index !== optionIndex)
        };
      })
    }));
  }

  function handleAddQuestion() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions:
        currentDraft.questions.length >= 25
          ? currentDraft.questions
          : [
              ...currentDraft.questions,
              {
                id: `question-${currentDraft.questions.length + 1}-${Date.now()}`,
                text: `New question ${currentDraft.questions.length + 1}`,
                type: "Open question",
                options: questionOptionsForType("Open question")
              }
            ],
      questionCount: currentDraft.questions.length >= 25 ? currentDraft.questionCount : currentDraft.questions.length + 1
    }));
  }

  function handleRemoveQuestion(questionId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions:
        currentDraft.questions.length <= 5
          ? currentDraft.questions
          : currentDraft.questions.filter((question) => question.id !== questionId),
      questionCount: currentDraft.questions.length <= 5 ? currentDraft.questionCount : currentDraft.questions.length - 1
    }));
  }

  function handleSaveDraft() {
    try {
      saveDraftToLocalStorage(stage, draft);
      setAttachmentError("");
      setDraftNotice("Changes saved!");
    } catch {
      setDraftNotice("");
      setAttachmentError("This draft is too large to save locally. Remove some uploaded images or files and try again.");
    }
  }

  function handleRemoveSurveyDraft() {
    if (!window.confirm("Remove this survey draft?")) {
      return;
    }

    window.localStorage.removeItem(draftStorageKey);
    window.localStorage.removeItem(SURVEY_PREVIEW_STORAGE_KEY);
    setDraft(buildInitialDraft());
    setStage("define");
    setDraftNotice("");
    setAttachmentError("");
    setGenerationError("");
    onBackToDashboard();
  }

  function handleOpenPreview() {
    const previewPayload: SurveyPreviewPayload = {
      title: draft.surveyTitle || "Survey Preview",
      subtitle: `${draft.researchArea} survey for respondents in ${buildTargetLabel(draft)} aged ${draft.ageMin}-${draft.ageMax}.`,
      questions: syncQuestionsToCount(draft.questions.length ? draft.questions : generateQuestions(draft), draft),
      createdAt: new Date().toISOString(),
      draftStorageKey
    };

    try {
      saveDraftToLocalStorage(stage, draft);
      window.localStorage.setItem(SURVEY_PREVIEW_STORAGE_KEY, JSON.stringify(previewPayload));
      setAttachmentError("");
      window.location.assign("/survey-preview?section=create-survey");
    } catch {
      setAttachmentError("Preview could not be prepared locally. Remove some uploaded images or files and try again.");
    }
  }

  async function handleCompletePayment() {
    if (launchComplete || isCompletingPayment) {
      return;
    }

    setIsCompletingPayment(true);
    setCheckoutError("");

    try {
      try {
        saveDraftToLocalStorage(stage, draft);
      } catch {
        throw new Error("The survey attachments are too large to keep during checkout. Reduce the uploaded images or file and try again.");
      }

      const { checkoutUrl } = await onStartCheckout(buildCheckoutPayload());

      window.location.assign(checkoutUrl);
      return;
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Could not start Polar checkout. Check Polar env settings and try again."
      );
    } finally {
      setIsCompletingPayment(false);
    }
  }

  function handleBackAfterLaunch() {
    setStage("define");
    setDraft(buildInitialDraft());
    setDraftNotice("");
    setAttachmentError("");
    setGenerationError("");
    setLaunchComplete(false);
    setLaunchTimestamp("");
    setLaunchMatchedRecipients(0);
    setLaunchSentEmails(0);
    setLaunchNotificationError("");
    setIsLaunchNoticeVisible(true);
    onBackToDashboard();
  }

  return (
    <section className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#8a94a6] transition hover:text-[#7c3412]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
          <h1 className={STEP_TITLE_CLASS_NAME}>Create New Survey</h1>
          <p className="mt-2 text-[16px] text-[#667085]">Build your survey from audience definition to launch.</p>
        </div>
        <div className="rounded-full bg-[#fff4ea] px-4 py-2 text-sm font-medium text-[#e56a1f]">
          {draft.surveyTitle || "Untitled survey"}
        </div>
      </div>

      <div className="rounded-[32px] border border-gray-200 bg-white px-6 py-7 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:px-8">
        <div className="relative hidden md:block">
          <div className="absolute left-[8%] right-[8%] top-8 h-[3px] rounded-full bg-[#eceff3]" />
          <div className="grid grid-cols-4 gap-6">
            {stageItems.map((item, index) => {
              const isActive = item.id === stage;
              const isComplete = index < currentStageIndex;

              return (
                <div key={item.id} className="relative z-10 flex flex-col items-center text-center">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-[26px] font-semibold transition ${
                      isActive || isComplete ? "bg-[#ff7a45] text-white shadow-[0_10px_24px_rgba(255,122,69,0.24)]" : "bg-[#eef1f5] text-[#98a2b3]"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className={`mt-4 text-[15px] font-semibold uppercase tracking-[0.18em] ${isActive || isComplete ? "text-[#d85d1c]" : "text-[#98a2b3]"}`}>
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:hidden">
          {stageItems.map((item, index) => {
            const isActive = item.id === stage;
            const isComplete = index < currentStageIndex;

            return (
              <div key={item.id} className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-[20px] font-semibold ${
                    isActive || isComplete ? "bg-[#ff7a45] text-white" : "bg-[#eef1f5] text-[#98a2b3]"
                  }`}
                >
                  {index + 1}
                </div>
                <p className={`text-[14px] font-semibold uppercase tracking-[0.16em] ${isActive || isComplete ? "text-[#d85d1c]" : "text-[#98a2b3]"}`}>
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {stage === "define" ? (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3e7]">
                <SlidersHorizontal className="h-5 w-5 text-[#f35b04]" />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold text-[#111827]">Audience Preferences</h2>
                <p className="text-[15px] text-[#8a94a6]">Define who should answer your research survey.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Survey title</span>
                <input
                  type="text"
                  value={draft.surveyTitle}
                  onChange={(event) => updateDraft("surveyTitle", event.target.value)}
                  placeholder="Women in Education Research in Asia"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Message for community members</span>
                <textarea
                  value={draft.surveyDescription}
                  onChange={(event) => updateDraft("surveyDescription", event.target.value)}
                  rows={4}
                  placeholder="Tell community members what this survey is about, why their input matters, and what they should expect before they begin."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                />
                <p className="mt-2 text-xs text-[#98a2b3]">
                  This message is shown to members before they start answering the survey.
                </p>
              </label>

              <div className="rounded-[24px] border border-dashed border-[#ffd1ad] bg-[#fffaf5] p-5 md:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold text-[#7c3412]">Optional visual context</p>
                    <p className="mt-2 text-sm leading-7 text-[#8a5a3d]">
                      Add up to 3 images and 1 supporting file if you want respondents to see your product visually or review statistical data before they answer.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <input
                      ref={surveyImagesInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSurveyImagesChange}
                      className="hidden"
                    />
                    <input
                      ref={surveyFileInputRef}
                      type="file"
                      accept=".csv,.doc,.docx,.json,.pdf,.ppt,.pptx,.txt,.xls,.xlsx"
                      onChange={handleSupportingFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => surveyImagesInputRef.current?.click()}
                      disabled={draft.attachments.images.length >= MAX_SURVEY_IMAGES}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#f35b04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d94f03] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Add images
                    </button>
                    <button
                      type="button"
                      onClick={() => surveyFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#ffd1ad] bg-white px-4 py-3 text-sm font-semibold text-[#d85d1c] transition hover:border-[#f35b04] hover:text-[#c2410c]"
                    >
                      <Paperclip className="h-4 w-4" />
                      {draft.attachments.supportingFile ? "Replace file" : "Add file"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8a94a6]">
                    <span>{draft.attachments.images.length} / {MAX_SURVEY_IMAGES} images added</span>
                    <span>Images are optimized automatically before save</span>
                    <span>Supporting file is optional</span>
                  </div>

                  {draft.attachments.images.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {draft.attachments.images.map((image) => (
                        <div key={image.id} className="overflow-hidden rounded-[22px] border border-[#f6d9c1] bg-white p-3">
                          <div className="overflow-hidden rounded-[18px] bg-[#fcfcfd]">
                            <ImageWithFallback
                              src={image.dataUrl}
                              alt={image.name}
                              className="h-40 w-full object-cover"
                            />
                          </div>
                          <div className="mt-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="break-words text-sm font-semibold text-[#111827]">{image.name}</p>
                              <p className="mt-1 text-xs text-[#98a2b3]">{formatAttachmentSize(image.sizeInBytes)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSurveyImage(image.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#f6d9c1] text-[#d85d1c] transition hover:border-[#f35b04] hover:text-[#c2410c]"
                              aria-label={`Remove ${image.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#f6d9c1] bg-white px-4 py-5 text-sm text-[#8a5a3d]">
                      No survey images added yet. This is optional.
                    </div>
                  )}

                  {draft.attachments.supportingFile ? (
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#f6d9c1] bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3e7] text-[#f35b04]">
                          <Paperclip className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">{draft.attachments.supportingFile.name}</p>
                          <p className="text-xs text-[#98a2b3]">
                            {formatAttachmentSize(draft.attachments.supportingFile.sizeInBytes)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSupportingFile}
                        className="inline-flex items-center gap-2 rounded-full border border-[#f6d9c1] px-4 py-2 text-sm font-semibold text-[#d85d1c] transition hover:border-[#f35b04] hover:text-[#c2410c]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove file
                      </button>
                    </div>
                  ) : null}

                  {attachmentError ? (
                    <AutoDismissNotice
                      message={attachmentError}
                      tone="error"
                      variant="inline"
                      onDismiss={() => setAttachmentError("")}
                    />
                  ) : null}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Research area</span>
                <select
                  value={draft.researchArea}
                  onChange={(event) => updateDraft("researchArea", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {researchAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
              <div className="mb-5">
                <h3 className="text-[18px] font-semibold text-[#344054]">Target Regions</h3>
                <p className="mt-1 text-sm text-[#98a2b3]">
                  Build your audience from the stage-one community rollout covering {surveyRegionTotalTarget.toLocaleString()} planned members across the regions below.
                </p>
              </div>

              <div className="mb-5 rounded-[22px] border border-[#ffd8bf] bg-[#fff7f1] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#7c3412]">General Audience</p>
                    <p className="mt-1 text-sm text-[#8a5a3d]">
                      Search across the whole community instead of specific countries. Other filters still apply, and lower-activity members are prioritized first.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneralAudienceToggle}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                      draft.generalAudience
                        ? "bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] text-white shadow-[0_14px_30px_rgba(255,106,0,0.18)]"
                        : "border border-[#ffd1ad] bg-white text-[#d85d1c] hover:bg-[#fff4ea]"
                    }`}
                  >
                    {draft.generalAudience ? "Enabled" : "Use General Audience"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#4b5563]">Regional group</span>
                  <select
                    value={draft.targetRegion}
                    onChange={(event) => handleRegionChange(event.target.value)}
                    disabled={draft.generalAudience}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                  >
                    {surveyRegionGroups.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-[#98a2b3]">
                    {draft.generalAudience
                      ? "General audience is active, so the survey can reach members across the full rollout."
                      : `Planned panel size for ${currentRegion}: ${currentRegionTarget.toLocaleString()} members.`}
                  </p>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#4b5563]">Countries from current region</span>
                  <select
                    value=""
                    onChange={(event) => {
                      handleCountryAdd(event.target.value);
                      event.target.value = "";
                    }}
                    disabled={
                      draft.generalAudience ||
                      availableCountries.length === 0 ||
                      draft.selectedCountries.length >= 7
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00] disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    <option value="">Add a country from this region</option>
                    {availableCountries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-[#98a2b3]">
                    Only countries from the first-stage rollout are selectable here.
                    {currentRegion === "Eastern Asia" ? " China is intentionally reserved for a later stage." : ""}
                  </p>
                </label>
              </div>

              {draft.generalAudience ? (
                <div className="mt-5 rounded-2xl border border-dashed border-[#ffd1ad] bg-white px-4 py-4 text-sm text-[#8a5a3d]">
                  We will look across the full community instead of limiting this survey to selected countries.
                </div>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {draft.selectedCountries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => handleCountryRemove(country)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#ffd1ad] bg-[#fff4ea] px-4 py-2 text-sm font-medium text-[#d85d1c]"
                      >
                        {country}
                        <X className="h-4 w-4" />
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-[#98a2b3]">
                    {draft.selectedCountries.length} / 7 countries selected. You can switch regions without losing the countries already added.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-[#344054]">Age Range</h3>
                  <p className="mt-1 text-sm text-[#98a2b3]">Select the age window for your audience.</p>
                </div>
                <div className="rounded-2xl bg-[#fff0f1] px-4 py-2 text-[22px] font-semibold text-[#ef476f]">
                  {draft.ageMin} - {draft.ageMax}
                </div>
              </div>

              <div className="relative pt-4">
                <div className="absolute left-0 right-0 top-8 h-2 rounded-full bg-[#e5e7eb]" />
                <div
                  className="absolute top-8 h-2 rounded-full bg-[linear-gradient(90deg,#ff7a00_0%,#ef6b39_100%)]"
                  style={{
                    left: `${ageMinPercentage}%`,
                    width: `${ageMaxPercentage - ageMinPercentage}%`
                  }}
                />
                <input
                  type="range"
                  min={18}
                  max={80}
                  value={draft.ageMin}
                  onChange={(event) => handleAgeMinChange(Number(event.target.value))}
                  className="pointer-events-none absolute left-0 right-0 top-4 h-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[5px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#ef6b39] [&::-webkit-slider-thumb]:shadow-[0_6px_18px_rgba(15,23,42,0.18)]"
                />
                <input
                  type="range"
                  min={18}
                  max={80}
                  value={draft.ageMax}
                  onChange={(event) => handleAgeMaxChange(Number(event.target.value))}
                  className="pointer-events-none absolute left-0 right-0 top-4 h-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[5px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#ef6b39] [&::-webkit-slider-thumb]:shadow-[0_6px_18px_rgba(15,23,42,0.18)]"
                />
                <div className="mt-14 grid grid-cols-6 text-[13px] font-medium text-[#98a2b3]">
                  {["18", "25", "35", "45", "60", "80+"].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Financial situation</span>
                <select
                  value={draft.financialSituation}
                  onChange={(event) => updateDraft("financialSituation", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {financialRanges.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Gender</span>
                <select
                  value={draft.gender}
                  onChange={(event) => updateDraft("gender", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {genderOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Education</span>
                <select
                  value={draft.education}
                  onChange={(event) => updateDraft("education", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {educationOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Place of residence</span>
                <select
                  value={draft.residence}
                  onChange={(event) => updateDraft("residence", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {residenceOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Family status</span>
                <select
                  value={draft.familyStatus}
                  onChange={(event) => updateDraft("familyStatus", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {familyStatusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-[#4b5563]">Interests</p>
              <div className="flex flex-wrap gap-3">
                {interestOptions.map((interest) => {
                  const isSelected = draft.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isSelected
                          ? "border-[#ffb57a] bg-[#fff4ea] text-[#d85d1c]"
                          : "border-gray-200 bg-white text-[#667085] hover:border-[#ffd1ad]"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[#98a2b3]">Select up to 3 interests to keep the audience focused.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3e7]">
                <Sparkles className="h-5 w-5 text-[#f35b04]" />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold text-[#111827]">Survey Scope</h2>
                <p className="text-[15px] text-[#8a94a6]">Set the draft size and target respondent count.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#4b5563]">Number of questions</p>
                    <p className="mt-1 text-xs text-[#98a2b3]">Academic pricing tiers: 5, 10, 15, 20, 25</p>
                  </div>
                  <div className="rounded-2xl bg-[#fff0f1] px-4 py-2 text-xl font-semibold text-[#ef476f]">{draft.questionCount}</div>
                </div>
                <div className="mt-6 grid grid-cols-5 gap-2">
                  {academicQuestionCountOptions.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => updateDraft("questionCount", count)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                        draft.questionCount === count
                          ? "border-[#ef6b39] bg-[#fff0e8] text-[#c2410c]"
                          : "border-gray-200 bg-white text-[#667085] hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Number of respondents</span>
                <select
                  value={draft.respondentCount}
                  onChange={(event) => updateDraft("respondentCount", Number(event.target.value) as SurveyDraft["respondentCount"])}
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {academicRespondentCountOptions.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleGenerateFromDefine}
                disabled={
                  !draft.surveyTitle.trim() ||
                  (!draft.generalAudience && draft.selectedCountries.length === 0) ||
                  isGeneratingQuestions
                }
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Wand2 className="h-4 w-4" />
                {isGeneratingQuestions ? "Generating..." : "Generate Questions"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "generate" ? (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[232px_minmax(0,1fr)]">
          <div className="xl:sticky xl:top-6">
            <div className="rounded-[26px] border border-gray-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff3e7]">
                  <Bot className="h-4 w-4 text-[#f35b04]" />
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-[#111827]">AI Assistant</h2>
                  <p className="text-xs text-[#8a94a6]">Guide the survey direction.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3.5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#4b5563]">Main description</span>
                  <textarea
                    value={draft.assistantPrompt}
                    onChange={(event) => updateDraft("assistantPrompt", event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#4b5563]">Research scope</span>
                  <textarea
                    value={draft.researchScope}
                    onChange={(event) => updateDraft("researchScope", event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#4b5563]">Hypothesis</span>
                  <textarea
                    value={draft.hypothesis}
                    onChange={(event) => updateDraft("hypothesis", event.target.value)}
                    rows={2}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleGenerateQuestions}
                  disabled={isGeneratingQuestions}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGeneratingQuestions ? "Generating..." : "Generate Questions"}
                </button>

                {generationError ? (
                  <AutoDismissNotice
                    message={generationError}
                    tone="error"
                    variant="inline"
                    onDismiss={() => setGenerationError("")}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-semibold text-[#111827]">Survey Canvas</h2>
                <p className="text-[15px] text-[#8a94a6]">Edit questions directly, change response types, and preview the real survey in a new tab.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {draftNotice ? (
                  <AutoDismissNotice
                    message={draftNotice}
                    tone="success"
                    variant="inline"
                    onDismiss={() => setDraftNotice("")}
                    className="max-w-sm"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setStage("define")}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSurveyDraft}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f1c8d6] bg-[#fff5f8] px-4 py-2.5 text-sm font-semibold text-[#ad2a62] transition hover:border-[#e89bbc]"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Survey
                </button>
              </div>
            </div>

            {attachmentError ? (
              <AutoDismissNotice
                message={attachmentError}
                tone="error"
                variant="inline"
                onDismiss={() => setAttachmentError("")}
                className="mb-5"
              />
            ) : null}

            <div className="space-y-4">
              {draft.questions.map((question, index) => (
                <div key={question.id} className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-[#fff3e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#d85d1c]">
                        Q{index + 1}
                      </div>
                      <div className="text-sm text-[#98a2b3]">Editable</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={question.type}
                        onChange={(event) => handleQuestionTypeChange(question.id, event.target.value as QuestionType)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#4b5563] outline-none transition focus:border-[#ff6a00]"
                      >
                        {questionTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(question.id)}
                        disabled={draft.questions.length <= 5}
                        className="rounded-xl border border-gray-200 bg-white p-2 text-[#98a2b3] transition hover:border-[#ffd1ad] hover:text-[#d85d1c] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={question.text}
                    onChange={(event) => handleQuestionChange(question.id, event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                  />

                  {question.type !== "Open question" ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#4b5563]">Answer options</p>
                        {question.type !== "Yes / No" && question.type !== "Rating scale" && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(question.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#667085] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add option
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(event) => handleOptionChange(question.id, optionIndex, event.target.value)}
                              disabled={question.type === "Yes / No" || question.type === "Rating scale"}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#ff6a00] disabled:bg-gray-50 disabled:text-[#98a2b3]"
                            />
                            {question.type !== "Yes / No" && question.type !== "Rating scale" ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(question.id, optionIndex)}
                                className="rounded-xl border border-gray-200 bg-white p-2 text-[#98a2b3] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={draft.questions.length >= 25}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>

              <button
                type="button"
                onClick={() => setStage("payment")}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90"
              >
                Proceed to Payment
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "payment" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3e7]">
                <CreditCard className="h-5 w-5 text-[#f35b04]" />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold text-[#111827]">Payment</h2>
                <p className="text-[15px] text-[#8a94a6]">Review checkout details before future DodoPayment integration.</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <p className="text-sm font-medium text-[#98a2b3]">Survey title</p>
                <p className="mt-2 text-[20px] font-semibold text-[#111827]">{draft.surveyTitle}</p>
              </div>
              <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <p className="text-sm font-medium text-[#98a2b3]">Audience</p>
                <p className="mt-2 text-[20px] font-semibold text-[#111827]">{buildTargetLabel(draft)}</p>
              </div>
              <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <p className="text-sm font-medium text-[#98a2b3]">Questions</p>
                <p className="mt-2 text-[20px] font-semibold text-[#111827]">{pricing.selectedQuestionCount}</p>
              </div>
              <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <p className="text-sm font-medium text-[#98a2b3]">Respondents</p>
                <p className="mt-2 text-[20px] font-semibold text-[#111827]">{draft.respondentCount}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-gray-200 bg-[#fff9f4] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-[#7c3412]">AI-based detailed survey</h3>
                  <p className="mt-1 text-sm text-[#8a94a6]">Add AI-generated extra detail and deeper recommendation notes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateDraft("includeDetailedAI", !draft.includeDetailedAI)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    draft.includeDetailedAI ? "bg-[#f35b04]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      draft.includeDetailedAI ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-3 text-sm font-medium text-[#d85d1c]">+ $20</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
            <h2 className="text-[22px] font-semibold text-[#111827]">Receipt</h2>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-sm text-[#667085]">
                <span>Academic survey package</span>
                <span>{formatUsd(pricing.basePrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#667085]">
                <span>{pricing.questionTier} questions x {draft.respondentCount} respondents</span>
                <span>Included</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#667085]">
                <span>Survey active window</span>
                <span>{surveyActiveWindowDays} days</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#667085]">
                <span>AI-based detailed survey</span>
                <span>{formatUsd(pricing.aiDetailedFee)}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-4">
                <div className="flex items-center justify-between text-[18px] font-semibold text-[#111827]">
                  <span>Total</span>
                  <span>{formatUsd(pricing.total)}</span>
                </div>
              </div>
            </div>

            {pricing.isTierAdjusted ? (
              <p className="mt-4 rounded-2xl bg-[#fff9f4] px-4 py-3 text-xs leading-6 text-[#8a5a3d]">
                You currently have {pricing.selectedQuestionCount} prepared questions. Pricing rounds this up to the{" "}
                {pricing.questionTier}-question academic tier.
              </p>
            ) : null}

            <p className="mt-6 rounded-2xl bg-[#fcfcfd] px-4 py-3 text-sm text-[#8a94a6]">
              You will be redirected to Polar Checkout to complete the payment securely.
            </p>

            {checkoutError ? (
              <AutoDismissNotice
                message={checkoutError}
                tone="error"
                variant="inline"
                onDismiss={() => setCheckoutError("")}
                className="mt-4"
              />
            ) : null}

            <button
              type="button"
              onClick={handleCompletePayment}
              disabled={isCompletingPayment}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CreditCard className="h-4 w-4" />
              {isCompletingPayment ? "Redirecting..." : "Pay with Polar"}
            </button>
          </div>
        </div>
      ) : null}

      {stage === "launch" ? (
        <div className="overflow-hidden rounded-[32px] border border-[#ffe1ca] bg-[linear-gradient(180deg,#fff9f4_0%,#ffffff_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
          <div className="relative overflow-hidden px-8 py-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,0,0.10),transparent_55%)]" />
            <div className="absolute -left-8 top-6 h-28 w-28 rounded-full bg-[#fff1e4] blur-2xl" />
            <div className="absolute -right-8 top-6 h-28 w-28 rounded-full bg-[#ffe8d2] blur-2xl" />

            <div className="relative">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#fff3e7] shadow-[0_18px_44px_rgba(243,91,4,0.18)]">
                <CheckCircle2 className="h-12 w-12 text-[#f35b04]" />
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#fff4ea] px-4 py-2 text-sm font-semibold text-[#d85d1c]">
                <CircleCheckBig className="h-4 w-4" />
                Payment successful
              </div>
              <h2 className="mt-6 text-[38px] font-bold tracking-[-0.04em] text-[#7c3412]">Survey is ready to launch</h2>
              <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-7 text-[#667085]">
                Your payment has been processed successfully and the survey has been added to your dashboard with launch-ready status.
              </p>
              {isLaunchNoticeVisible ? (
                launchNotificationError ? (
                  <AutoDismissNotice
                    message={launchNotificationError}
                    tone="error"
                    onDismiss={() => setIsLaunchNoticeVisible(false)}
                    className="mx-auto mt-4 max-w-2xl text-left"
                  />
                ) : launchSentEmails > 0 ? (
                  <AutoDismissNotice
                    message={`${launchSentEmails} matching community members were notified by email.`}
                    tone="success"
                    onDismiss={() => setIsLaunchNoticeVisible(false)}
                    className="mx-auto mt-4 max-w-2xl text-left"
                    noticeKey={`launch-sent-${launchSentEmails}`}
                  />
                ) : (
                  <AutoDismissNotice
                    message="Survey published successfully. No community members matched the current audience criteria yet."
                    tone="info"
                    onDismiss={() => setIsLaunchNoticeVisible(false)}
                    className="mx-auto mt-4 max-w-2xl text-left"
                    noticeKey="launch-no-match"
                  />
                )
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 border-t border-[#ffe1ca] bg-white px-8 py-8 md:grid-cols-4">
            <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
              <p className="text-sm font-medium text-[#98a2b3]">Survey title</p>
              <p className="mt-2 text-[18px] font-semibold text-[#111827]">{draft.surveyTitle}</p>
            </div>
            <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
              <p className="text-sm font-medium text-[#98a2b3]">Launch date</p>
              <p className="mt-2 text-[18px] font-semibold text-[#111827]">{launchTimestamp}</p>
            </div>
            <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
              <p className="text-sm font-medium text-[#98a2b3]">Questions</p>
              <p className="mt-2 text-[18px] font-semibold text-[#111827]">{draft.questions.length || draft.questionCount}</p>
            </div>
            <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
              <p className="text-sm font-medium text-[#98a2b3]">Respondents</p>
              <p className="mt-2 text-[18px] font-semibold text-[#111827]">{draft.respondentCount}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-white px-8 py-8">
            <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-[28px] border border-[#ffe1ca] bg-[#fff9f4] p-6 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e4]">
                  <Rocket className="h-5 w-5 text-[#f35b04]" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#7c3412]">Launch Summary</h3>
                  <p className="text-sm text-[#8a94a6]">The survey now appears in your dashboard and can begin collecting responses.</p>
                </div>
              </div>
              <p className="text-[15px] leading-7 text-[#667085]">
                {draft.researchArea} study for {draft.gender.toLowerCase()} respondents aged {draft.ageMin}-{draft.ageMax} in {buildTargetLabel(draft)}, {buildInterestSummary(draft.interests)}.
              </p>
              {launchMatchedRecipients > 0 ? (
                <p className="text-sm text-[#7c3412]">
                  Matching recipients found: {launchMatchedRecipients}. Emails sent: {launchSentEmails}.
                </p>
              ) : null}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleBackAfterLaunch}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90"
              >
                Back to Dashboard
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
