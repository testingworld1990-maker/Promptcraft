import {
  ActiveDraftState,
  DEFAULT_BOOSTERS,
  EMPTY_ANSWERS,
  SavedPrompt,
} from '../types/prompt';

const SAVED_PROMPTS_KEY = 'promptcraft_saved_prompts_v1';
const GEMINI_API_KEY_STORAGE = 'promptcraft_gemini_api_key';
const ACTIVE_DRAFT_KEY = 'promptcraft_active_draft_v1';

function isValidSavedPrompt(item: unknown): item is SavedPrompt {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.finalPrompt === 'string' &&
    typeof obj.answers === 'object' &&
    obj.answers !== null
  );
}

export function loadSavedPrompts(): SavedPrompt[] {
  try {
    const raw = window.localStorage.getItem(SAVED_PROMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSavedPrompt).map((item) => ({
      ...item,
      answers: { ...EMPTY_ANSWERS, ...item.answers },
      boosters: item.boosters ? { ...DEFAULT_BOOSTERS, ...item.boosters } : undefined,
      isPinned: Boolean(item.isPinned),
    }));
  } catch {
    return [];
  }
}

export function persistSavedPrompts(prompts: SavedPrompt[]): boolean {
  try {
    window.localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts));
    return true;
  } catch {
    return false;
  }
}

export function loadActiveDraft(): ActiveDraftState | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const mode =
      parsed.mode === 'casual' || parsed.mode === 'structured' || parsed.mode === 'xml'
        ? parsed.mode
        : 'structured';
    const polishStyle =
      parsed.polishStyle === 'balanced' ||
      parsed.polishStyle === 'concise' ||
      parsed.polishStyle === 'detailed'
        ? parsed.polishStyle
        : 'detailed';
    const currentStepIndex =
      typeof parsed.currentStepIndex === 'number' &&
      parsed.currentStepIndex >= 0 &&
      parsed.currentStepIndex <= 5
        ? parsed.currentStepIndex
        : 0;
    return {
      answers: { ...EMPTY_ANSWERS, ...(parsed.answers ?? {}) },
      mode,
      boosters: { ...DEFAULT_BOOSTERS, ...(parsed.boosters ?? {}) },
      currentStepIndex,
      polishStyle,
    };
  } catch {
    return null;
  }
}

export function saveActiveDraft(draft: ActiveDraftState): void {
  try {
    window.localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage quota errors in restricted WebViews
  }
}

export function loadGeminiApiKey(): string {
  try {
    return window.localStorage.getItem(GEMINI_API_KEY_STORAGE)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function saveGeminiApiKey(key: string): boolean {
  try {
    const trimmed = key.trim();
    if (!trimmed) {
      window.localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    } else {
      window.localStorage.setItem(GEMINI_API_KEY_STORAGE, trimmed);
    }
    return true;
  } catch {
    return false;
  }
}

export function generatePromptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseImportedPromptsJson(rawJson: string): SavedPrompt[] | null {
  try {
    const parsed = JSON.parse(rawJson);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray(parsed.prompts)
        ? parsed.prompts
        : null;
    if (!list) return null;
    const valid = (list as unknown[]).filter(isValidSavedPrompt).map((item) => ({
      ...item,
      id: item.id || generatePromptId(),
      answers: { ...EMPTY_ANSWERS, ...item.answers },
      mode:
        item.mode === 'casual' || item.mode === 'structured' || item.mode === 'xml'
          ? item.mode
          : ('structured' as const),
      boosters: item.boosters ? { ...DEFAULT_BOOSTERS, ...item.boosters } : undefined,
      isPinned: Boolean(item.isPinned),
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
    }));
    return valid;
  } catch {
    return null;
  }
}
