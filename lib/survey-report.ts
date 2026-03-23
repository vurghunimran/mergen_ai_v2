import type {
  ClientSurvey,
  SurveyAnswerValue,
  SurveyReportResponse
} from "@/lib/dashboard-data";

export type ReportChartPoint = {
  label: string;
  value: number;
};

export type SurveyQuestionChart = {
  questionId: string;
  questionText: string;
  questionType: string;
  dataPoints: ReportChartPoint[];
};

export type ReportTimelinePoint = {
  label: string;
  responses: number;
  averageTrust: number;
};

export type SurveySignalHighlight = {
  questionId: string;
  questionText: string;
  answerLabel: string;
  count: number;
  share: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function formatAnswerValue(answer: SurveyAnswerValue) {
  if (Array.isArray(answer)) {
    return answer.filter(Boolean).join(" | ");
  }

  return answer.trim();
}

export function getSurveyResponseCount(survey: ClientSurvey) {
  return survey.rawResponses?.length ?? 0;
}

export function getAverageTrustScore(survey: ClientSurvey) {
  const responseCount = getSurveyResponseCount(survey);

  if (responseCount === 0) {
    return 0;
  }

  const totalTrust = (survey.rawResponses ?? []).reduce((sum, response) => sum + response.trustScore, 0);
  return Math.round(totalTrust / responseCount);
}

export function getAverageCompletionMinutes(survey: ClientSurvey) {
  const responseCount = getSurveyResponseCount(survey);

  if (responseCount === 0) {
    return 0;
  }

  const totalSeconds = (survey.rawResponses ?? []).reduce((sum, response) => sum + response.completionTimeSeconds, 0);
  return totalSeconds / responseCount / 60;
}

export function getSurveyCompletionRate(survey: ClientSurvey) {
  if (survey.targetResponses <= 0) {
    return 0;
  }

  return clamp(Math.round((getSurveyResponseCount(survey) / survey.targetResponses) * 100), 0, 100);
}

export function buildTrustDistribution(survey: ClientSurvey): ReportChartPoint[] {
  const buckets = [
    { label: "0-39", value: 0 },
    { label: "40-59", value: 0 },
    { label: "60-79", value: 0 },
    { label: "80-100", value: 0 }
  ];

  for (const response of survey.rawResponses ?? []) {
    const score = response.trustScore;

    if (score < 40) {
      buckets[0].value += 1;
    } else if (score < 60) {
      buckets[1].value += 1;
    } else if (score < 80) {
      buckets[2].value += 1;
    } else {
      buckets[3].value += 1;
    }
  }

  return buckets;
}

export function buildQuestionCharts(survey: ClientSurvey): SurveyQuestionChart[] {
  return (survey.questions ?? [])
    .filter((question) => question.type !== "Open question")
    .map((question) => {
      const counts = new Map<string, number>();

      for (const option of question.options) {
        counts.set(option, 0);
      }

      for (const response of survey.rawResponses ?? []) {
        const answer = response.answers.find((item) => item.questionId === question.id)?.answer;

        if (!answer) {
          continue;
        }

        if (Array.isArray(answer)) {
          for (const selectedValue of answer) {
            counts.set(selectedValue, (counts.get(selectedValue) ?? 0) + 1);
          }
          continue;
        }

        counts.set(answer, (counts.get(answer) ?? 0) + 1);
      }

      return {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        dataPoints: Array.from(counts.entries()).map(([label, value]) => ({ label, value }))
      };
    })
    .filter((question) => question.dataPoints.some((dataPoint) => dataPoint.value > 0))
    .slice(0, 4);
}

export function buildResponseTimeline(survey: ClientSurvey): ReportTimelinePoint[] {
  const dailyBuckets = new Map<string, { responses: number; trustTotal: number }>();

  for (const response of survey.rawResponses ?? []) {
    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric"
    }).format(new Date(response.submittedAt));
    const currentBucket = dailyBuckets.get(label) ?? { responses: 0, trustTotal: 0 };
    currentBucket.responses += 1;
    currentBucket.trustTotal += response.trustScore;
    dailyBuckets.set(label, currentBucket);
  }

  return Array.from(dailyBuckets.entries())
    .map(([label, value]) => ({
      label,
      responses: value.responses,
      averageTrust: Math.round(value.trustTotal / Math.max(1, value.responses))
    }))
    .slice(-7);
}

export function buildSignalHighlights(survey: ClientSurvey): SurveySignalHighlight[] {
  return buildQuestionCharts(survey)
    .map((chart) => {
      const dominantPoint = chart.dataPoints.reduce(
        (best, current) => (current.value > best.value ? current : best),
        chart.dataPoints[0]
      );

      return {
        questionId: chart.questionId,
        questionText: chart.questionText,
        answerLabel: dominantPoint.label,
        count: dominantPoint.value,
        share:
          getSurveyResponseCount(survey) > 0
            ? clamp(Math.round((dominantPoint.value / getSurveyResponseCount(survey)) * 100), 0, 100)
            : 0
      };
    })
    .filter((item) => item.count > 0)
    .slice(0, 3);
}

export function buildOpenResponseSamples(survey: ClientSurvey) {
  return (survey.questions ?? [])
    .filter((question) => question.type === "Open question")
    .map((question) => ({
      question: question.text,
      responses: (survey.rawResponses ?? [])
        .map((response) => response.answers.find((item) => item.questionId === question.id)?.answer)
        .map((answer) => (answer ? formatAnswerValue(answer) : ""))
        .filter((answer) => answer.length > 0)
        .slice(0, 8)
    }))
    .filter((item) => item.responses.length > 0);
}

export function buildRawDataCsv(survey: ClientSurvey) {
  const questions = survey.questions ?? [];
  const headers = [
    "response_id",
    "submitted_at",
    "respondent_id",
    "completion_time_seconds",
    "trust_score",
    "earned_credits",
    ...questions.map((question) => question.text)
  ];

  const rows = (survey.rawResponses ?? []).map((response) => [
    response.id,
    response.submittedAt,
    response.respondentId,
    String(response.completionTimeSeconds),
    String(response.trustScore),
    String(response.earnedCredits),
    ...questions.map((question) => {
      const answer = response.answers.find((item) => item.questionId === question.id)?.answer;
      return answer ? formatAnswerValue(answer) : "";
    })
  ]);

  const allRows = [headers, ...rows];

  return allRows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

export function buildFallbackSurveyReport(survey: ClientSurvey): SurveyReportResponse {
  const responseCount = getSurveyResponseCount(survey);
  const averageTrustScore = getAverageTrustScore(survey);
  const averageCompletionMinutes = getAverageCompletionMinutes(survey);
  const completionRate = survey.targetResponses > 0 ? Math.round((responseCount / survey.targetResponses) * 100) : 0;
  const trustDistribution = buildTrustDistribution(survey);
  const strongestBucket = trustDistribution.reduce((best, current) => (current.value > best.value ? current : best), trustDistribution[0]);
  const questionCharts = buildQuestionCharts(survey);
  const strongestQuestion = questionCharts[0];

  return {
    executiveSummary:
      responseCount > 0
        ? `${survey.name} has collected ${responseCount} responses, reaching ${completionRate}% of the target with an average trust score of ${averageTrustScore}/100 and an average completion time of ${averageCompletionMinutes.toFixed(1)} minutes.`
        : `No validated responses are available yet for ${survey.name}.`,
    keyInsights:
      responseCount > 0
        ? [
            `Most responses fall in the ${strongestBucket.label} trust-score band.`,
            strongestQuestion
              ? `The clearest structured signal appears in "${strongestQuestion.questionText}".`
              : "Structured question patterns will become clearer as more responses arrive.",
            survey.hypothesis
              ? `Current collection can be compared against the stated hypothesis: ${survey.hypothesis}`
              : "A stronger hypothesis statement would improve future reporting precision."
          ]
        : ["Collect more responses before generating the detailed AI report."],
    futurePredictions:
      responseCount > 0
        ? [
            `If the current response pace continues, the survey is on track to reach roughly ${clamp(
              responseCount + Math.round(responseCount * 0.35),
              responseCount,
              survey.targetResponses
            )} responses before the current window closes.`,
            averageTrustScore >= 75
              ? "The dataset is likely to remain reliable enough for directional forecasting as more responses arrive."
              : "Data quality should improve if lower-trust submissions are filtered before final analysis."
          ]
        : ["Future prediction is not available until validated raw responses are collected."],
    recommendations:
      responseCount > 0
        ? [
            "Review the raw CSV alongside the trust-score distribution before making final research claims.",
            survey.researchScope
              ? `Keep the final interpretation tied to the original scope: ${survey.researchScope}`
              : "Document the intended research scope before publishing conclusions.",
            survey.hypothesis
              ? "Compare the strongest response patterns directly against the hypothesis in the final report."
              : "Add a clearer hypothesis so the next AI report can evaluate it directly."
          ]
        : ["Wait for the first wave of community responses before requesting the paid AI report."],
    methodologyNote:
      "This report combines respondent trust scores, completion timing, structured-answer distributions, and AI interpretation of open-text responses.",
    dataQualityNote:
      responseCount > 0
        ? `Average trust score is ${averageTrustScore}/100 across ${responseCount} validated response records.`
        : "No validated raw responses are available yet."
  };
}

export function buildSurveyReportContext(survey: ClientSurvey) {
  return {
    title: survey.name,
    description: survey.description,
    research_description: survey.researchDescription,
    research_scope: survey.researchScope,
    hypothesis: survey.hypothesis,
    target_responses: survey.targetResponses,
    collected_responses: getSurveyResponseCount(survey),
    average_trust_score: getAverageTrustScore(survey),
    average_completion_minutes: Number(getAverageCompletionMinutes(survey).toFixed(2)),
    trust_distribution: buildTrustDistribution(survey),
    question_charts: buildQuestionCharts(survey),
    open_response_samples: buildOpenResponseSamples(survey)
  };
}
