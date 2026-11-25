export type QuestionKey = 'task' | 'role' | 'context' | 'details' | 'avoid' | 'format';

export type StepColorKey = 'coral' | 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';

export type PromptMode = 'casual' | 'structured' | 'xml';

export type PolishStyle = 'balanced' | 'concise' | 'detailed';

export type AppTab = 'builder' | 'saved';

export interface PromptAnswers {
  task: string;
  role: string;
  context: string;
  details: string;
  avoid: string;
  format: string;
}

export interface PromptBoosters {
  stepByStep: boolean;
  askQuestionsFirst: boolean;
  includeExamples: boolean;
  selfVerify: boolean;
}

export interface QuestionConfig {
  id: QuestionKey;
  stepNumber: number;
  shortLabel: string;
  isOptional: boolean;
  colorKey: StepColorKey;
  question: string;
  helperText: string;
  placeholder: string;
  suggestions: string[];
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'Writing' | 'Coding' | 'Strategy' | 'Learning' | 'Marketing';
  summary: string;
  mode: PromptMode;
  answers: PromptAnswers;
  boosters?: Partial<PromptBoosters>;
}

export interface SavedPrompt {
  id: string;
  title: string;
  answers: PromptAnswers;
  mode: PromptMode;
  boosters?: PromptBoosters;
  finalPrompt: string;
  isPolished: boolean;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ActiveDraftState {
  answers: PromptAnswers;
  mode: PromptMode;
  boosters: PromptBoosters;
  currentStepIndex: number;
  polishStyle: PolishStyle;
}

export const EMPTY_ANSWERS: PromptAnswers = {
  task: '',
  role: '',
  context: '',
  details: '',
  avoid: '',
  format: '',
};

export const DEFAULT_BOOSTERS: PromptBoosters = {
  stepByStep: false,
  askQuestionsFirst: false,
  includeExamples: false,
  selfVerify: false,
};
