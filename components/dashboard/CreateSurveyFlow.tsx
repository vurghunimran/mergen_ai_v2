"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  CreditCard,
  Eye,
  Plus,
  Rocket,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { type StoredSurveyQuestion, type SurveyAudience, type SurveyQuestionType } from "@/lib/dashboard-data";
import {
  questionOptionsForType,
  surveyQuestionTypes,
  type SurveyAssistantRequest,
  type SurveyAssistantResponse
} from "@/lib/survey-assistant";

const CREATE_SURVEY_DRAFT_STORAGE_KEY = "mergen-client-create-survey-draft";
const STEP_TITLE_CLASS_NAME = "text-[34px] font-bold tracking-[-0.04em] text-[#7c3412]";

type CreateSurveyStage = "define" | "generate" | "payment" | "launch";
type QuestionType = SurveyQuestionType;

type SurveyQuestion = StoredSurveyQuestion;

type SurveyDraft = {
  surveyTitle: string;
  researchArea: string;
  targetRegion: string;
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

type LaunchPayload = {
  title: string;
  targetResponses: number;
  questionCount: number;
  description: string;
  audience: SurveyAudience;
  questions: StoredSurveyQuestion[];
};

type LaunchResult = {
  matchedRecipients: number;
  sentEmails: number;
  notificationError: string;
};

type Props = {
  onBackToDashboard: () => void;
  onLaunchSurvey: (payload: LaunchPayload) => Promise<LaunchResult>;
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

const regionCountries = {
  Europe: ["United Kingdom", "Germany", "France", "Netherlands", "Italy", "Spain", "Sweden", "Poland", "Portugal"],
  "North America": ["United States", "Canada", "Mexico"],
  "Latin America": ["Brazil", "Argentina", "Chile", "Colombia", "Peru", "Uruguay"],
  MENA: ["United Arab Emirates", "Saudi Arabia", "Egypt", "Morocco", "Jordan", "Qatar", "Turkey"],
  "Asia Pacific": ["India", "Indonesia", "Singapore", "Malaysia", "Thailand", "Vietnam", "Philippines", "Japan", "South Korea"],
  Africa: ["South Africa", "Nigeria", "Kenya", "Ghana", "Morocco", "Egypt"]
} as const;

const regionGroups = Object.keys(regionCountries) as Array<keyof typeof regionCountries>;

const financialRanges = [
  "All salary ranges",
  "Under $500 / month",
  "$500 - $1,000 / month",
  "$1,001 - $2,500 / month",
  "$2,501 - $5,000 / month",
  "$5,001 - $10,000 / month",
  "$10,000+ / month"
] as const;

const genderOptions = ["All genders", "Female", "Male", "Non-binary", "Prefer not to say"] as const;
const educationOptions = [
  "Any education level",
  "High school",
  "Undergraduate",
  "Bachelor's degree",
  "Master's degree",
  "Doctorate"
] as const;
const residenceOptions = ["Any residence type", "Urban area", "Suburban area", "Town", "Village"] as const;
const familyStatusOptions = ["Any family status", "Single", "Married", "Partnered", "Parent / guardian"] as const;
const interestOptions = [
  "Online learning",
  "Career growth",
  "Technology",
  "Research",
  "Health",
  "Finance",
  "Travel",
  "Entertainment",
  "Sustainability",
  "Entrepreneurship"
] as const;

const questionTypeOptions: QuestionType[] = surveyQuestionTypes;

const respondentPricing: Record<SurveyDraft["respondentCount"], number> = {
  50: 45,
  100: 75,
  250: 145,
  500: 265,
  1000: 460
};

const stageItems: Array<{ id: CreateSurveyStage; label: string }> = [
  { id: "define", label: "Define" },
  { id: "generate", label: "Generate" },
  { id: "payment", label: "Payment" },
  { id: "launch", label: "Launch" }
];

function buildInitialDraft(): SurveyDraft {
  return {
    surveyTitle: "",
    researchArea: "Education Science",
    targetRegion: "Asia Pacific",
    selectedCountries: ["India", "Singapore"],
    ageMin: 25,
    ageMax: 55,
    financialSituation: "All salary ranges",
    gender: "All genders",
    education: "Any education level",
    residence: "Any residence type",
    familyStatus: "Any family status",
    interests: ["Online learning"],
    questionCount: 10,
    respondentCount: 250,
    assistantPrompt: "",
    researchScope: "",
    hypothesis: "",
    questions: [],
    includeDetailedAI: false
  };
}

function buildTargetLabel(draft: SurveyDraft) {
  if (draft.selectedCountries.length > 0) {
    return draft.selectedCountries.join(", ");
  }

  return draft.targetRegion;
}

function buildDefaultPrompt(draft: SurveyDraft) {
  return `I want to research ${draft.surveyTitle || "audience preferences"} with respondents in ${buildTargetLabel(draft)} for ${draft.researchArea.toLowerCase()}.`;
}

function buildDefaultScope(draft: SurveyDraft) {
  return `Target respondents aged ${draft.ageMin}-${draft.ageMax}, ${draft.gender.toLowerCase()}, ${draft.education.toLowerCase()}, living in ${draft.residence.toLowerCase()}, with interest in ${draft.interests.join(", ").toLowerCase()}.`;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPreviewQuestionHtml(question: SurveyQuestion, index: number) {
  const title = escapeHtml(question.text);
  const type = escapeHtml(question.type);

  if (question.type === "Open question") {
    return `
      <div class="question-card">
        <div class="question-number">Question ${index + 1}</div>
        <h3>${title}</h3>
        <div class="question-type">${type}</div>
        <textarea class="preview-textarea" placeholder="Type your answer here..." disabled></textarea>
      </div>
    `;
  }

  if (question.type === "Likert scale") {
    return `
      <div class="question-card">
        <div class="question-number">Question ${index + 1}</div>
        <h3>${title}</h3>
        <div class="question-type">${type}</div>
        <div class="likert-grid">
          ${question.options.map((option) => `<div class="likert-pill">${escapeHtml(option)}</div>`).join("")}
        </div>
      </div>
    `;
  }

  if (question.type === "Rating scale") {
    return `
      <div class="question-card">
        <div class="question-number">Question ${index + 1}</div>
        <h3>${title}</h3>
        <div class="question-type">${type}</div>
        <div class="rating-row">
          ${question.options.map((option) => `<div class="rating-pill">${escapeHtml(option)}</div>`).join("")}
        </div>
      </div>
    `;
  }

  if (question.type === "Ranking") {
    return `
      <div class="question-card">
        <div class="question-number">Question ${index + 1}</div>
        <h3>${title}</h3>
        <div class="question-type">${type}</div>
        <div class="ranking-list">
          ${question.options
            .map(
              (option, optionIndex) => `
                <div class="ranking-item">
                  <span class="ranking-index">${optionIndex + 1}</span>
                  ${escapeHtml(option)}
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  const inputType = question.type === "Multiple choice" ? "checkbox" : "radio";

  return `
    <div class="question-card">
      <div class="question-number">Question ${index + 1}</div>
      <h3>${title}</h3>
      <div class="question-type">${type}</div>
      <div class="option-list">
        ${question.options
          .map(
            (option) => `
              <label class="option-row">
                <input type="${inputType}" disabled />
                <span>${escapeHtml(option)}</span>
              </label>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

export default function CreateSurveyFlow({ onBackToDashboard, onLaunchSurvey }: Props) {
  const [stage, setStage] = useState<CreateSurveyStage>("define");
  const [draft, setDraft] = useState<SurveyDraft>(buildInitialDraft);
  const [draftNotice, setDraftNotice] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [launchComplete, setLaunchComplete] = useState(false);
  const [launchTimestamp, setLaunchTimestamp] = useState("");
  const [launchMatchedRecipients, setLaunchMatchedRecipients] = useState(0);
  const [launchSentEmails, setLaunchSentEmails] = useState(0);
  const [launchNotificationError, setLaunchNotificationError] = useState("");

  useEffect(() => {
    try {
      const storedDraft = window.localStorage.getItem(CREATE_SURVEY_DRAFT_STORAGE_KEY);
      if (!storedDraft) return;

      const parsedDraft = JSON.parse(storedDraft) as SavedCreateSurveyDraft;

      if (parsedDraft?.draft && parsedDraft?.stage) {
        setDraft({
          ...buildInitialDraft(),
          ...parsedDraft.draft
        });
        setStage(parsedDraft.stage);
        setDraftNotice(`Draft restored from ${parsedDraft.savedAt}.`);
      }
    } catch {
      // Ignore malformed local draft.
    }
  }, []);

  useEffect(() => {
    if (!draftNotice) return;
    const timeoutId = window.setTimeout(() => setDraftNotice(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [draftNotice]);

  const pricing = useMemo(() => {
    const questionsFee = draft.questionCount * 3;
    const respondentsFee = respondentPricing[draft.respondentCount];
    const aiDetailedFee = draft.includeDetailedAI ? 20 : 0;
    const total = questionsFee + respondentsFee + aiDetailedFee;

    return {
      questionsFee,
      respondentsFee,
      aiDetailedFee,
      total
    };
  }, [draft.includeDetailedAI, draft.questionCount, draft.respondentCount]);

  const currentStageIndex = stageItems.findIndex((item) => item.id === stage);
  const availableCountries = regionCountries[draft.targetRegion as keyof typeof regionCountries].filter(
    (country) => !draft.selectedCountries.includes(country)
  );
  const ageMinPercentage = ((draft.ageMin - 18) / (80 - 18)) * 100;
  const ageMaxPercentage = ((draft.ageMax - 18) / (80 - 18)) * 100;

  function updateDraft<Key extends keyof SurveyDraft>(field: Key, value: SurveyDraft[Key]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value
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
      selectedCountries: nextDraft.selectedCountries,
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
        questions: aiResult.questions
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
        questions: aiResult.questions
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
      questions: [
        ...currentDraft.questions,
        {
          id: `question-${currentDraft.questions.length + 1}-${Date.now()}`,
          text: `New question ${currentDraft.questions.length + 1}`,
          type: "Open question",
          options: questionOptionsForType("Open question")
        }
      ]
    }));
  }

  function handleRemoveQuestion(questionId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.filter((question) => question.id !== questionId)
    }));
  }

  function handleSaveDraft() {
    const payload: SavedCreateSurveyDraft = {
      stage,
      draft,
      savedAt: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date())
    };

    window.localStorage.setItem(CREATE_SURVEY_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    setDraftNotice("Changes saved!");
  }

  function handleOpenPreview() {
    const previewWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!previewWindow) return;

    const html = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(draft.surveyTitle || "Survey Preview")}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: linear-gradient(180deg, #fffaf6 0%, #ffffff 100%);
              color: #1f2937;
            }
            .page {
              max-width: 900px;
              margin: 0 auto;
              padding: 48px 24px 72px;
            }
            .brand {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin-bottom: 32px;
            }
            .brand-mark {
              display: block;
              width: 42px;
              height: auto;
            }
            .brand-name {
              margin-top: 14px;
              font-size: 15px;
              letter-spacing: 0.18em;
              font-weight: 700;
              color: #d85d1c;
            }
            .hero {
              text-align: center;
              margin-bottom: 36px;
            }
            .hero h1 {
              margin: 0;
              font-size: 40px;
              line-height: 1.1;
              color: #7c3412;
            }
            .hero p {
              margin: 12px auto 0;
              max-width: 640px;
              color: #667085;
              font-size: 16px;
              line-height: 1.7;
            }
            .question-list {
              display: grid;
              gap: 20px;
            }
            .question-card {
              border: 1px solid #e5e7eb;
              border-radius: 28px;
              background: white;
              padding: 24px;
              box-shadow: 0 18px 44px rgba(15, 23, 42, 0.04);
            }
            .question-number {
              display: inline-flex;
              padding: 6px 12px;
              border-radius: 999px;
              background: #fff3e7;
              color: #d85d1c;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }
            .question-card h3 {
              margin: 16px 0 8px;
              font-size: 20px;
              line-height: 1.5;
              color: #101828;
            }
            .question-type {
              margin-bottom: 16px;
              color: #98a2b3;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              font-weight: 700;
            }
            .option-list, .ranking-list {
              display: grid;
              gap: 10px;
            }
            .option-row, .ranking-item {
              display: flex;
              align-items: center;
              gap: 12px;
              border-radius: 16px;
              background: #fcfcfd;
              padding: 14px 16px;
              color: #475467;
              font-size: 15px;
            }
            .likert-grid {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 10px;
            }
            .likert-pill, .rating-pill {
              border-radius: 16px;
              background: #fcfcfd;
              padding: 14px 12px;
              text-align: center;
              color: #475467;
              font-size: 14px;
              font-weight: 600;
            }
            .rating-row {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
            }
            .rating-pill {
              width: 52px;
              height: 52px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #d85d1c;
            }
            .ranking-index {
              width: 28px;
              height: 28px;
              border-radius: 999px;
              background: #fff3e7;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: #d85d1c;
              font-size: 13px;
              font-weight: 700;
            }
            .preview-textarea {
              min-height: 120px;
              width: 100%;
              border-radius: 18px;
              border: 1px dashed #d0d5dd;
              background: #fcfcfd;
              padding: 16px;
              color: #98a2b3;
              font-size: 15px;
              resize: vertical;
            }
            @media (max-width: 700px) {
              .hero h1 { font-size: 30px; }
              .likert-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="brand">
              <img class="brand-mark" src="/logo-symbol-orange-hq.svg" alt="MERGEN AI logo" />
              <div class="brand-name">MERGEN AI</div>
            </div>
            <div class="hero">
              <h1>${escapeHtml(draft.surveyTitle || "Survey Preview")}</h1>
              <p>${escapeHtml(
                `${draft.researchArea} survey for respondents in ${buildTargetLabel(draft)} aged ${draft.ageMin}-${draft.ageMax}.`
              )}</p>
            </div>
            <div class="question-list">
              ${draft.questions.map((question, index) => renderPreviewQuestionHtml(question, index)).join("")}
            </div>
          </div>
        </body>
      </html>
    `;

    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
  }

  async function handleCompletePayment() {
    if (launchComplete || isCompletingPayment) {
      return;
    }

    setIsCompletingPayment(true);
    setLaunchNotificationError("");

    try {
      const launchResult = await onLaunchSurvey({
        title: draft.surveyTitle,
        targetResponses: draft.respondentCount,
        questionCount: draft.questions.length || draft.questionCount,
        description: `${draft.researchArea} survey for ${draft.gender.toLowerCase()} respondents aged ${draft.ageMin}-${draft.ageMax} in ${buildTargetLabel(draft)}.`,
        audience: {
          countries: draft.selectedCountries,
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
        questions: draft.questions
      });

      setLaunchMatchedRecipients(launchResult.matchedRecipients);
      setLaunchSentEmails(launchResult.sentEmails);
      setLaunchNotificationError(launchResult.notificationError);
    } catch {
      setLaunchMatchedRecipients(0);
      setLaunchSentEmails(0);
      setLaunchNotificationError("Survey published, but the community email notification request failed.");
    } finally {
      setIsCompletingPayment(false);
    }

    setLaunchComplete(true);
    setLaunchTimestamp(
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(new Date())
    );
    window.localStorage.removeItem(CREATE_SURVEY_DRAFT_STORAGE_KEY);
    setStage("launch");
  }

  function handleBackAfterLaunch() {
    setStage("define");
    setDraft(buildInitialDraft());
    setDraftNotice("");
    setGenerationError("");
    setLaunchComplete(false);
    setLaunchTimestamp("");
    setLaunchMatchedRecipients(0);
    setLaunchSentEmails(0);
    setLaunchNotificationError("");
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
                <p className="mt-1 text-sm text-[#98a2b3]">Switch between region groups and build one list of up to 7 countries across any regions.</p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#4b5563]">Regional group</span>
                  <select
                    value={draft.targetRegion}
                    onChange={(event) => handleRegionChange(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                  >
                    {regionGroups.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#4b5563]">Countries from current region</span>
                  <select
                    value=""
                    onChange={(event) => {
                      handleCountryAdd(event.target.value);
                      event.target.value = "";
                    }}
                    disabled={availableCountries.length === 0 || draft.selectedCountries.length >= 7}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00] disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    <option value="">Add a country from this region</option>
                    {availableCountries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

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

              <p className="mt-3 text-xs text-[#98a2b3]">{draft.selectedCountries.length} / 7 countries selected. You can switch regions without losing the countries already added.</p>
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
                    <p className="mt-1 text-xs text-[#98a2b3]">Minimum 5, maximum 25</p>
                  </div>
                  <div className="rounded-2xl bg-[#fff0f1] px-4 py-2 text-xl font-semibold text-[#ef476f]">{draft.questionCount}</div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={25}
                  value={draft.questionCount}
                  onChange={(event) => updateDraft("questionCount", Number(event.target.value))}
                  className="mt-6 h-2 w-full appearance-none rounded-full bg-[#e5e7eb] accent-[#ef6b39]"
                />
              </div>

              <label className="block rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <span className="mb-2 block text-sm font-medium text-[#4b5563]">Number of respondents</span>
                <select
                  value={draft.respondentCount}
                  onChange={(event) => updateDraft("respondentCount", Number(event.target.value) as SurveyDraft["respondentCount"])}
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]"
                >
                  {[50, 100, 250, 500, 1000].map((count) => (
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
                disabled={!draft.surveyTitle.trim() || draft.selectedCountries.length === 0 || isGeneratingQuestions}
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

                {generationError ? <p className="text-sm font-medium text-[#d85a2f]">{generationError}</p> : null}
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
                  <div className="rounded-full bg-[#eafbf2] px-3 py-2 text-sm font-semibold text-[#12b76a]">
                    {draftNotice}
                  </div>
                ) : null}
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
              </div>
            </div>

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
                        className="rounded-xl border border-gray-200 bg-white p-2 text-[#98a2b3] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
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
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
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
                <p className="text-sm font-medium text-[#98a2b3]">Target countries</p>
                <p className="mt-2 text-[20px] font-semibold text-[#111827]">{buildTargetLabel(draft)}</p>
              </div>
              <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfd] p-5">
                <p className="text-sm font-medium text-[#98a2b3]">Questions</p>
                <p className="mt-2 text-[20px] font-semibold text-[#111827]">{draft.questions.length || draft.questionCount}</p>
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
                <span>Question setup</span>
                <span>${pricing.questionsFee}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#667085]">
                <span>Respondent package</span>
                <span>${pricing.respondentsFee}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#667085]">
                <span>AI-based detailed survey</span>
                <span>${pricing.aiDetailedFee}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-4">
                <div className="flex items-center justify-between text-[18px] font-semibold text-[#111827]">
                  <span>Total</span>
                  <span>${pricing.total}</span>
                </div>
              </div>
            </div>

            <p className="mt-6 rounded-2xl bg-[#fcfcfd] px-4 py-3 text-sm text-[#8a94a6]">
              DodoPayment gateway will be connected here later. This button currently simulates a successful payment.
            </p>

            <button
              type="button"
              onClick={handleCompletePayment}
              disabled={isCompletingPayment}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CreditCard className="h-4 w-4" />
              {isCompletingPayment ? "Publishing..." : "Complete Payment"}
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
              {launchNotificationError ? (
                <p className="mx-auto mt-4 max-w-2xl rounded-2xl border border-[#ffd9bf] bg-[#fff4ea] px-4 py-3 text-sm text-[#c2410c]">
                  {launchNotificationError}
                </p>
              ) : launchSentEmails > 0 ? (
                <p className="mx-auto mt-4 max-w-2xl rounded-2xl border border-[#d5eadf] bg-[#f3fbf6] px-4 py-3 text-sm text-[#166534]">
                  {launchSentEmails} matching community members were notified by email.
                </p>
              ) : (
                <p className="mx-auto mt-4 max-w-2xl rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#667085]">
                  Survey published successfully. No community members matched the current audience criteria yet.
                </p>
              )}
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
                {draft.researchArea} study for {draft.gender.toLowerCase()} respondents aged {draft.ageMin}-{draft.ageMax} in {buildTargetLabel(draft)}, focused on {draft.interests.join(", ").toLowerCase()}.
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
