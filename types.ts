export enum QuestionType {
  SingleChoice = 'single_choice',
  MultiChoice = 'multi_choice',
  TrueFalse = 'true_false',
  ShortAnswer = 'short_answer',
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[]; // 选项 A, B, C, D
  correctAnswer: string;
  explanation?: string;
}

export interface QuestionBank {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  questions: Question[];
  icon: string;
  themeColor: string;
}

export enum AppView {
  Home = 'HOME',
  Upload = 'UPLOAD',
  Quiz = 'QUIZ',
  Result = 'RESULT',
}

export interface QuizState {
  bankId: string;
  currentQuestionIndex: number;
  score: number;
  answers: Record<string, string>; // questionId -> userAnswer
  isFinished: boolean;
}

export type ParsingStatus = 'extracting' | 'generating' | 'switching_model' | 'processing';