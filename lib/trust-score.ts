import type {
  StoredSurveyQuestion,
  SurveyAnswerValue,
  SurveySubmissionAnswer,
  SurveyTrustEvaluationRequest,
  SurveyTrustEvaluationResponse
} from "@/lib/dashboard-data";

export const MIN_TRUST_CREDITS = 20;
export const MAX_TRUST_CREDITS = 70;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAnswerText(answer: SurveyAnswerValue) {
  if (Array.isArray(answer)) {
    return answer.filter(Boolean).join(", ").trim();
  }

  return answer.trim();
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function expectedSurveyDurationSeconds(questions: StoredSurveyQuestion[]) {
  return questions.reduce((total, question) => {
    switch (question.type) {
      case "Open question":
        return total + 50;
      case "Ranking":
        return total + 32;
      case "Multiple choice":
        return total + 20;
      case "Likert scale":
      case "Rating scale":
        return total + 14;
      case "Yes / No":
      case "Single select":
      default:
        return total + 12;
    }
  }, 0);
}

function buildSummary(score: number, strengths: string[], risks: string[]) {
  if (score >= 85) {
    return "High-confidence response with relevant and well-paced answers.";
  }

  if (score >= 65) {
    return risks.length > 0
      ? "Mostly reliable response, with a few signals that should be watched."
      : "Reliable response with generally relevant answers.";
  }

  if (strengths.length > 0) {
    return "Mixed-quality response. Some useful answers are present, but trust signals are weaker.";
  }

  return "Low-confidence response due to weak relevance, very short answers, or unrealistic completion speed.";
}

export function calculateCreditsFromTrustScore(score: number) {
  const boundedScore = clamp(Math.round(score), 0, 100);
  return clamp(MIN_TRUST_CREDITS + Math.round((boundedScore / 100) * (MAX_TRUST_CREDITS - MIN_TRUST_CREDITS)), MIN_TRUST_CREDITS, MAX_TRUST_CREDITS);
}

export function buildSurveySubmissionAnswers(questions: StoredSurveyQuestion[], answers: Record<string, SurveyAnswerValue>) {
  return questions.map<SurveySubmissionAnswer>((question) => ({
    questionId: question.id,
    questionText: question.text,
    questionType: question.type,
    answer: answers[question.id] ?? ""
  }));
}

export function buildFallbackTrustEvaluation(
  request: SurveyTrustEvaluationRequest
): SurveyTrustEvaluationResponse {
  const normalizedAnswers = request.answers.map((answer) => ({
    ...answer,
    text: normalizeAnswerText(answer.answer)
  }));

  const answeredCount = normalizedAnswers.filter((answer) => answer.text.length > 0).length;
  const openAnswers = normalizedAnswers.filter((answer) => answer.questionType === "Open question");
  const detailedOpenAnswers = openAnswers.filter((answer) => wordCount(answer.text) >= 12).length;
  const repeatedAnswerCount =
    normalizedAnswers.length - new Set(normalizedAnswers.map((answer) => answer.text.toLowerCase()).filter(Boolean)).size;
  const expectedDuration = expectedSurveyDurationSeconds(request.questions);
  const timeRatio = expectedDuration > 0 ? request.completionTimeSeconds / expectedDuration : 1;

  let score = 52;

  score += Math.round((answeredCount / Math.max(request.questions.length, 1)) * 18);
  score += detailedOpenAnswers * 6;
  score -= repeatedAnswerCount * 4;

  if (timeRatio >= 0.9 && timeRatio <= 2.6) {
    score += 14;
  } else if (timeRatio >= 0.6) {
    score += 6;
  } else {
    score -= 16;
  }

  const strengths: string[] = [];
  const risks: string[] = [];

  if (detailedOpenAnswers > 0) {
    strengths.push("Open-ended answers include useful detail.");
  }

  if (timeRatio >= 0.9) {
    strengths.push("Completion time looks realistic for the survey length.");
  } else if (timeRatio < 0.6) {
    risks.push("Survey was completed unusually quickly for the question load.");
  }

  if (repeatedAnswerCount > 1) {
    risks.push("Several answers repeat the same pattern, which lowers confidence.");
  }

  if (openAnswers.length > 0 && detailedOpenAnswers === 0) {
    risks.push("Open-ended responses are very short or generic.");
  }

  const trustScore = clamp(score, 0, 100);

  return {
    trustScore,
    credits: calculateCreditsFromTrustScore(trustScore),
    summary: buildSummary(trustScore, strengths, risks),
    strengths: strengths.slice(0, 3),
    risks: risks.slice(0, 3),
    completionTimeSeconds: request.completionTimeSeconds,
    source: "fallback"
  };
}
