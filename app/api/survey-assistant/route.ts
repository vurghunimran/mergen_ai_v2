import { NextResponse } from "next/server";
import type { StoredSurveyQuestion } from "@/lib/dashboard-data";
import {
  normalizeQuestionOptions,
  surveyQuestionTypes,
  type SurveyAssistantRequest,
  type SurveyAssistantResponse
} from "@/lib/survey-assistant";

type OpenAIResponsesPayload = {
  output_text?: string;
  error?: {
    message?: string;
  };
};

type OpenAISurveyResult = Omit<SurveyAssistantResponse, "questions"> & {
  questions: Array<Pick<StoredSurveyQuestion, "text" | "type" | "options">>;
};

const openAiModel = "gpt-5-mini";

function buildSurveySchema(questionCount: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["assistantPrompt", "researchScope", "hypothesis", "questions"],
    properties: {
      assistantPrompt: {
        type: "string"
      },
      researchScope: {
        type: "string"
      },
      hypothesis: {
        type: "string"
      },
      questions: {
        type: "array",
        minItems: questionCount,
        maxItems: questionCount,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["text", "type", "options"],
          properties: {
            text: {
              type: "string"
            },
            type: {
              type: "string",
              enum: surveyQuestionTypes
            },
            options: {
              type: "array",
              items: {
                type: "string"
              }
            }
          }
        }
      }
    }
  };
}

function buildSystemPrompt() {
  return [
    "You are MERGEN AI, a senior survey research assistant.",
    "Your job is to refine the user's survey direction and generate high-quality survey questions.",
    "Write concise, natural, non-leading questions tailored to the target audience.",
    "Avoid duplicate questions and avoid demographic questions already captured elsewhere unless truly necessary.",
    "Use only these question types: Multiple choice, Single select, Likert scale, Open question, Yes / No, Rating scale, Ranking.",
    "For Open question, options must be ['Free-text response'].",
    "For Yes / No, options must be ['Yes', 'No'].",
    "For Rating scale, options must be ['1', '2', '3', '4', '5'].",
    "For Likert scale, options must be ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'].",
    "For Multiple choice, Single select, and Ranking, provide clear, specific options that fit the question.",
    "Return exactly the number of questions requested."
  ].join(" ");
}

function buildUserPrompt(payload: SurveyAssistantRequest) {
  return JSON.stringify(
    {
      survey_title: payload.surveyTitle,
      research_area: payload.researchArea,
      target_region: payload.targetRegion,
      selected_countries: payload.selectedCountries,
      age_range: [payload.ageMin, payload.ageMax],
      financial_situation: payload.financialSituation,
      gender: payload.gender,
      education: payload.education,
      residence: payload.residence,
      family_status: payload.familyStatus,
      interests: payload.interests,
      question_count: payload.questionCount,
      respondent_count: payload.respondentCount,
      user_prompt: payload.assistantPrompt,
      research_scope: payload.researchScope,
      hypothesis: payload.hypothesis
    },
    null,
    2
  );
}

function fallbackValue(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeSurveyResult(payload: OpenAISurveyResult, requestBody: SurveyAssistantRequest): SurveyAssistantResponse {
  return {
    assistantPrompt: fallbackValue(payload.assistantPrompt, requestBody.assistantPrompt),
    researchScope: fallbackValue(payload.researchScope, requestBody.researchScope),
    hypothesis: fallbackValue(payload.hypothesis, requestBody.hypothesis),
    questions: payload.questions.map((question, index) => ({
      id: `question-${index + 1}-${Date.now()}-${index}`,
      text: question.text.trim(),
      type: question.type,
      options: normalizeQuestionOptions(question.type, question.options)
    }))
  };
}

export async function POST(request: Request) {
  try {
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (!openAiApiKey) {
      return NextResponse.json({ error: "Missing OpenAI configuration. Add OPENAI_API_KEY." }, { status: 500 });
    }

    const requestBody = (await request.json()) as Partial<SurveyAssistantRequest>;
    const questionCount = Math.min(25, Math.max(5, Number(requestBody.questionCount ?? 10)));

    const payload: SurveyAssistantRequest = {
      surveyTitle: (requestBody.surveyTitle ?? "").trim(),
      researchArea: (requestBody.researchArea ?? "").trim() || "Education Science",
      targetRegion: (requestBody.targetRegion ?? "").trim() || "Asia Pacific",
      selectedCountries: Array.isArray(requestBody.selectedCountries) ? requestBody.selectedCountries.filter(Boolean) : [],
      ageMin: Number(requestBody.ageMin ?? 18),
      ageMax: Number(requestBody.ageMax ?? 80),
      financialSituation: (requestBody.financialSituation ?? "").trim() || "All salary ranges",
      gender: (requestBody.gender ?? "").trim() || "All genders",
      education: (requestBody.education ?? "").trim() || "Any education level",
      residence: (requestBody.residence ?? "").trim() || "Any residence type",
      familyStatus: (requestBody.familyStatus ?? "").trim() || "Any family status",
      interests: Array.isArray(requestBody.interests) ? requestBody.interests.filter(Boolean) : [],
      questionCount,
      respondentCount: Number(requestBody.respondentCount ?? 100),
      assistantPrompt: (requestBody.assistantPrompt ?? "").trim(),
      researchScope: (requestBody.researchScope ?? "").trim(),
      hypothesis: (requestBody.hypothesis ?? "").trim()
    };

    if (!payload.surveyTitle && !payload.assistantPrompt) {
      return NextResponse.json(
        { error: "Add a survey title or description before generating questions." },
        { status: 400 }
      );
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: openAiModel,
        reasoning: {
          effort: "medium"
        },
        input: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: buildUserPrompt(payload)
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "survey_generation",
            schema: buildSurveySchema(questionCount),
            strict: true
          }
        }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000)
    });

    const openAiPayload = (await openAiResponse.json()) as OpenAIResponsesPayload;

    if (!openAiResponse.ok) {
      return NextResponse.json(
        { error: openAiPayload.error?.message ?? "OpenAI request failed." },
        { status: 500 }
      );
    }

    if (!openAiPayload.output_text) {
      return NextResponse.json({ error: "OpenAI did not return a valid survey payload." }, { status: 500 });
    }

    const parsedPayload = JSON.parse(openAiPayload.output_text) as OpenAISurveyResult;
    const normalizedPayload = normalizeSurveyResult(parsedPayload, {
      ...payload,
      assistantPrompt: payload.assistantPrompt || `I want to research ${payload.surveyTitle || payload.researchArea}.`,
      researchScope:
        payload.researchScope ||
        `Target respondents aged ${payload.ageMin}-${payload.ageMax}, ${payload.gender}, ${payload.education}, ${payload.residence}.`,
      hypothesis:
        payload.hypothesis ||
        `${payload.surveyTitle || payload.researchArea} will show meaningful differences across the selected audience.`
    });

    return NextResponse.json(normalizedPayload);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to generate survey content." }, { status: 500 });
  }
}
