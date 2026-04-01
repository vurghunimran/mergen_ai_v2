import type { ClientSurvey, StoredSurveyQuestion, SurveySubmissionAnswer } from "@/lib/dashboard-data";

type PersonalityKey = "analytical" | "global" | "casual" | "curious";

type PersonalityProfile = {
  emoji: string;
  label: string;
  description: string;
};

const WELCOME_SURVEY_CREATED_AT = "2026-04-01T00:00:00.000Z";

const PERSONALITY_PROFILES: Record<PersonalityKey, PersonalityProfile> = {
  analytical: {
    emoji: "🧠",
    label: "The Analytical Thinker",
    description: "You like clear logic, thoughtful answers, and surveys that feel smart and useful."
  },
  global: {
    emoji: "🌍",
    label: "The Global Explorer",
    description: "You are drawn to big-picture topics and the kind of research that can improve the world."
  },
  casual: {
    emoji: "😎",
    label: "The Casual Contributor",
    description: "You keep things light, honest, and efficient, especially when a survey feels quick and fun."
  },
  curious: {
    emoji: "🤓",
    label: "The Curious Researcher",
    description: "Interesting topics pull you in, and you naturally explore questions with curiosity and personality."
  }
};

export const WELCOME_SURVEY_ID = 9_000_000_000_001;
export const WELCOME_SURVEY_CREDITS = 50;
export const WELCOME_SURVEY_TITLE = "Discover Your Research Personality (and Earn Your First Credits 😎)";
export const WELCOME_SURVEY_INTRO = [
  "Welcome to Mergen!",
  "Let's see what kind of research hero you are.",
  "Complete this fun survey and earn your first credits 🎁"
].join(" ");

export const WELCOME_SURVEY_QUESTIONS: StoredSurveyQuestion[] = [
  {
    id: "welcome-q1",
    text: "When you see a survey, what is your first reaction?",
    type: "Single select",
    options: [
      '😍 "Finally! I love surveys!"',
      '🤔 "Depends on the topic..."',
      '😅 "If it\'s short, why not?"',
      '😴 "Only if I really have nothing to do"'
    ]
  },
  {
    id: "welcome-q2",
    text: "If your opinion were a superpower, what would it be?",
    type: "Single select",
    options: ["🧠 Changing minds", "📊 Solving problems", "🌍 Improving the world", "😎 Winning arguments"]
  },
  {
    id: "welcome-q3",
    text: "How do you usually answer surveys?",
    type: "Single select",
    options: [
      "Carefully and thoughtfully",
      "Quickly but honestly",
      "Depends on my mood",
      "I overthink every question"
    ]
  },
  {
    id: "welcome-q4",
    text: "Which type of survey participant are you?",
    type: "Single select",
    options: ["🎓 The Serious Researcher", "😎 The Casual Clicker", "🤓 The Data Lover", "🧠 The Overthinker"]
  },
  {
    id: "welcome-q5",
    text: "If surveys were a game, what would your strategy be?",
    type: "Single select",
    options: [
      "Play smart and carefully",
      "Play fast and efficient",
      "Play only when interesting",
      "Play just for rewards"
    ]
  },
  {
    id: "welcome-q6",
    text: "How do you feel when you finish a survey?",
    type: "Single select",
    options: ["😌 Productive", "😎 Accomplished", "🎉 Happy (credits!)", '🤔 "That was interesting"']
  },
  {
    id: "welcome-q7",
    text: "Which topic would you enjoy the most?",
    type: "Single select",
    options: ["Technology & AI", "Society & Culture", "Business & Economy", "Random interesting topics"]
  },
  {
    id: "welcome-q8",
    text: "If your brain had a mode when answering surveys, what would it be?",
    type: "Single select",
    options: ["🧠 Analytical mode", "🎯 Focus mode", "😎 Chill mode", "🤔 Overthinking mode"]
  },
  {
    id: "welcome-q9",
    text: "Attention Check (Funny Version): To prove you're not a robot 🤖 please select:",
    type: "Single select",
    options: ["I am definitely human", "Beep boop 🤖", "Maybe I'm a robot", "I forgot"]
  },
  {
    id: "welcome-q10",
    text: "If you could earn rewards, which one would motivate you most?",
    type: "Single select",
    options: ["☕ Coffee / Starbucks", "💰 Cash", "🎧 Spotify / Netflix", "🎁 Surprise rewards"]
  }
];

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function normalizeAnswerValue(answer: SurveySubmissionAnswer["answer"]) {
  if (Array.isArray(answer)) {
    return answer[0] ?? "";
  }

  return answer.trim();
}

function addPoints(
  scores: Record<PersonalityKey, number>,
  updates: Partial<Record<PersonalityKey, number>>
) {
  for (const [key, value] of Object.entries(updates) as Array<[PersonalityKey, number]>) {
    scores[key] += value;
  }
}

function getTieBreakerPriority(answerByQuestionId: Map<string, string>) {
  const priority: PersonalityKey[] = [];
  const modeAnswer = answerByQuestionId.get("welcome-q8");
  const topicAnswer = answerByQuestionId.get("welcome-q7");

  if (modeAnswer === "🧠 Analytical mode" || modeAnswer === "🎯 Focus mode") {
    priority.push("analytical");
  }

  if (modeAnswer === "😎 Chill mode") {
    priority.push("casual");
  }

  if (modeAnswer === "🤔 Overthinking mode") {
    priority.push("curious");
  }

  if (topicAnswer === "Society & Culture") {
    priority.push("global");
  }

  return [...new Set([...priority, "curious", "analytical", "global", "casual"])];
}

export function isWelcomeSurveyId(surveyId: number) {
  return surveyId === WELCOME_SURVEY_ID;
}

export function buildWelcomeSurvey(): ClientSurvey {
  return {
    id: WELCOME_SURVEY_ID,
    userId: "mergen-system",
    name: WELCOME_SURVEY_TITLE,
    status: "published",
    responses: 0,
    targetResponses: 1,
    daysRemaining: 3650,
    createdDate: formatCreatedDate(WELCOME_SURVEY_CREATED_AT),
    description: WELCOME_SURVEY_INTRO,
    questionCount: WELCOME_SURVEY_QUESTIONS.length,
    audience: {
      countries: [],
      generalAudience: true,
      ageMin: 0,
      ageMax: 120,
      gender: "All genders",
      education: "Any education level",
      interests: [],
      salaryRange: "All salary ranges",
      residence: "Any residence type",
      familyStatus: "Any family status",
      researchArea: "Welcome survey"
    },
    questions: WELCOME_SURVEY_QUESTIONS,
    researchDescription: WELCOME_SURVEY_INTRO,
    researchScope: "New member onboarding",
    hypothesis: "A playful welcome survey helps new members engage and earn their first credits.",
    includeDetailedAI: false,
    kind: "welcome",
    fixedCredits: WELCOME_SURVEY_CREDITS
  };
}

export function evaluateWelcomeSurvey(answers: SurveySubmissionAnswer[]) {
  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.questionId, normalizeAnswerValue(answer.answer)])
  );
  const scores: Record<PersonalityKey, number> = {
    analytical: 0,
    global: 0,
    casual: 0,
    curious: 0
  };

  switch (answerByQuestionId.get("welcome-q1")) {
    case '😍 "Finally! I love surveys!"':
      addPoints(scores, { curious: 2 });
      break;
    case '🤔 "Depends on the topic..."':
      addPoints(scores, { curious: 1, global: 1 });
      break;
    case '😅 "If it\'s short, why not?"':
      addPoints(scores, { casual: 2 });
      break;
    case '😴 "Only if I really have nothing to do"':
      addPoints(scores, { casual: 1, curious: 1 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q2")) {
    case "🧠 Changing minds":
      addPoints(scores, { curious: 1, global: 1 });
      break;
    case "📊 Solving problems":
      addPoints(scores, { analytical: 2 });
      break;
    case "🌍 Improving the world":
      addPoints(scores, { global: 2 });
      break;
    case "😎 Winning arguments":
      addPoints(scores, { casual: 2 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q3")) {
    case "Carefully and thoughtfully":
      addPoints(scores, { analytical: 2 });
      break;
    case "Quickly but honestly":
      addPoints(scores, { casual: 2 });
      break;
    case "Depends on my mood":
      addPoints(scores, { casual: 1, curious: 1 });
      break;
    case "I overthink every question":
      addPoints(scores, { curious: 2 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q4")) {
    case "🎓 The Serious Researcher":
    case "🤓 The Data Lover":
      addPoints(scores, { analytical: 2 });
      break;
    case "😎 The Casual Clicker":
      addPoints(scores, { casual: 2 });
      break;
    case "🧠 The Overthinker":
      addPoints(scores, { curious: 2 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q5")) {
    case "Play smart and carefully":
      addPoints(scores, { analytical: 2 });
      break;
    case "Play fast and efficient":
    case "Play just for rewards":
      addPoints(scores, { casual: 2 });
      break;
    case "Play only when interesting":
      addPoints(scores, { curious: 1, global: 1 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q6")) {
    case "😌 Productive":
    case "😎 Accomplished":
      addPoints(scores, { analytical: 1 });
      break;
    case "🎉 Happy (credits!)":
      addPoints(scores, { casual: 2 });
      break;
    case '🤔 "That was interesting"':
      addPoints(scores, { curious: 1, global: 1 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q7")) {
    case "Technology & AI":
    case "Business & Economy":
      addPoints(scores, { analytical: 2 });
      break;
    case "Society & Culture":
      addPoints(scores, { global: 2 });
      break;
    case "Random interesting topics":
      addPoints(scores, { curious: 2 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q8")) {
    case "🧠 Analytical mode":
    case "🎯 Focus mode":
      addPoints(scores, { analytical: 2 });
      break;
    case "😎 Chill mode":
      addPoints(scores, { casual: 2 });
      break;
    case "🤔 Overthinking mode":
      addPoints(scores, { curious: 2 });
      break;
    default:
      break;
  }

  switch (answerByQuestionId.get("welcome-q10")) {
    case "☕ Coffee / Starbucks":
      addPoints(scores, { casual: 1, curious: 1 });
      break;
    case "💰 Cash":
      addPoints(scores, { casual: 2 });
      break;
    case "🎧 Spotify / Netflix":
      addPoints(scores, { curious: 1, casual: 1 });
      break;
    case "🎁 Surprise rewards":
      addPoints(scores, { curious: 1, global: 1 });
      break;
    default:
      break;
  }

  const tieBreakerPriority = getTieBreakerPriority(answerByQuestionId);
  const winningKey = (Object.entries(scores) as Array<[PersonalityKey, number]>).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return tieBreakerPriority.indexOf(left[0]) - tieBreakerPriority.indexOf(right[0]);
  })[0]?.[0] ?? "curious";
  const personality = PERSONALITY_PROFILES[winningKey];

  return {
    personalityKey: winningKey,
    personalityEmoji: personality.emoji,
    personalityLabel: personality.label,
    summary: `Congratulations! You've completed your first survey 🎉 Your Research Personality: ${personality.emoji} ${personality.label}. ${personality.description}`,
    earnedCredits: WELCOME_SURVEY_CREDITS
  };
}
