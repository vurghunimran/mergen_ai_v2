import type { StoredSurveyQuestion, SurveySubmissionAnswer } from '@/lib/dashboard-data';
import { RequestError } from './request';
export function validateAnswers(questions: StoredSurveyQuestion[], input: unknown): SurveySubmissionAnswer[] {
  if (!Array.isArray(input) || questions.length === 0 || input.length !== questions.length || input.length > 25) throw new RequestError('Answer every question.');
  const ids = new Set<string>();
  return questions.map(question => {
    const matches = input.filter(a => a && typeof a === 'object' && a.questionId === question.id);
    if (ids.has(question.id) || matches.length !== 1) throw new RequestError('Invalid or duplicate question.');
    ids.add(question.id);
    const answer: unknown = matches[0].answer;
    if (question.type === 'Open question') {
      if (typeof answer !== 'string' || !answer.trim() || answer.length > 4000) throw new RequestError('Invalid written answer.');
    } else if (question.type === 'Multiple choice' || question.type === 'Ranking') {
      if (!Array.isArray(answer) || answer.length === 0 || new Set(answer).size !== answer.length ||
          answer.some(v => typeof v !== 'string' || !question.options.includes(v)) ||
          (question.type === 'Ranking' && answer.length !== question.options.length)) throw new RequestError('Invalid answer selection.');
    } else if (typeof answer !== 'string' || !question.options.includes(answer)) throw new RequestError('Invalid answer selection.');
    return { questionId: question.id, questionText: question.text, questionType: question.type, answer: answer as string | string[] };
  });
}
export function validateDuration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 86400) throw new RequestError('Invalid completion time.');
  return value;
}
