import { PolishStyle, PromptMode } from '../types/prompt';
import { loadGeminiApiKey } from '../utils/storage';

const GEMINI_MODEL = 'gemini-4-hydrogen';
const GEMINI_REST_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface PolishResult {
  polished: string;
  source: 'standalone-key' | 'server';
}

export class PolishError extends Error {
  needsApiKey: boolean;

  constructor(message: string, needsApiKey = false) {
    super(message);
    this.name = 'PolishError';
    this.needsApiKey = needsApiKey;
  }
}

function buildSystemInstruction(mode: PromptMode, polishStyle: PolishStyle): string {
  const formatDirective =
    mode === 'xml'
      ? 'Structure the final engineered prompt with clean semantic XML tags (<role>, <objective>, <context>, <requirements>, <approach>, <constraints>, <output_format>) so modern LLMs parse every boundary with high precision.'
      : mode === 'structured'
        ? 'Structure the final engineered prompt with crisp, scannable markdown headings (e.g., ### Role & Expertise, ### Objective, ### Context & Audience, ### Required Deliverables, ### Step-by-Step Approach, ### Strict Constraints, ### Output Format & Quality Bar) and concise bullet points.'
        : 'Write the final engineered prompt as clear, cohesive, direct natural paragraphs—no markdown headings or XML tags—while still being thorough, explicit, and unambiguous.';

  const depthDirective =
    polishStyle === 'concise'
      ? 'Keep the engineered prompt crisp and token-efficient while still expanding vague user notes into unambiguous, actionable directives.'
      : polishStyle === 'detailed'
        ? 'Elaborate thoroughly into an expert-grade master prompt: expand short or vague user intentions into clear persona framing, explicit objectives, concrete sub-deliverables, domain-specific best practices, edge-case handling, strict negative constraints, and clear quality/output criteria.'
        : "Elaborate the user's input into a clear, well-developed, high-performing prompt with concrete instructions, explicit deliverable expectations, and clean guardrails—never just repeat or lightly paraphrase what the user typed.";

  return [
    'You are a world-class AI prompt engineer.',
    'Your job is to WRITE AN ENGINEERED PROMPT that the user will copy and paste into an AI assistant—NEVER answer or fulfill the task yourself.',
    "Do NOT simply echo back or lightly reword the user's raw notes. Transform their intent into a crystal-clear, richly elaborated, high-performing prompt that extracts the strongest possible answer from an LLM.",
    formatDirective,
    depthDirective,
    'Preserve every user requirement, domain detail, constraint, and any {{placeholder}} template variables verbatim without inventing contradictory facts.',
    'Output ONLY the final ready-to-paste prompt text. Do not include any preamble, explanation, commentary, or surrounding quotes.',
  ].join(' ');
}

/**
 * Polishes and deeply elaborates a draft prompt using Gemini 2.5 Flash.
 * - If the user saved a Gemini API key in Settings (localStorage), calls the
 *   Gemini REST API directly so the app works 100% standalone inside an Android APK.
 * - Otherwise, falls back to the hosted `/api/polish` endpoint.
 */
export async function polishPromptWithGemini(
  draft: string,
  mode: PromptMode,
  polishStyle: PolishStyle = 'detailed'
): Promise<PolishResult> {
  const trimmedDraft = draft.trim();
  if (!trimmedDraft) {
    throw new PolishError('Answer at least one question before polishing.');
  }

  const storedApiKey = loadGeminiApiKey();

  if (storedApiKey) {
    let response: Response;
    try {
      response = await fetch(GEMINI_REST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': storedApiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemInstruction(mode, polishStyle) }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Transform and elaborate the following user prompt draft into a clear, detailed, high-performing final prompt ready to paste into an AI assistant:\n\n${trimmedDraft}`,
                },
              ],
            },
          ],
        }),
      });
    } catch {
      throw new PolishError(
        'Could not reach Gemini API. Check your internet connection and try again.'
      );
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const apiMsg = data?.error?.message || `Request failed (${response.status}).`;
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new PolishError(
          `Your saved Gemini API key was rejected (${apiMsg}). Please check it in Settings.`,
          true
        );
      }
      if (response.status === 429) {
        throw new PolishError(
          'Rate limit reached for this Gemini API key. Wait a moment and try again.'
        );
      }
      throw new PolishError(apiMsg);
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    const polished = Array.isArray(parts)
      ? parts
          .map((p: { text?: string }) => p.text ?? '')
          .join('')
          .trim()
      : '';

    if (!polished) {
      throw new PolishError('Gemini returned an empty response. Try again.');
    }

    return { polished, source: 'standalone-key' };
  }

  let serverRes: Response;
  try {
    serverRes = await fetch('/api/polish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: trimmedDraft, mode, polishStyle }),
    });
  } catch {
    throw new PolishError(
      'Add your Gemini API key in Settings to use Polish with AI standalone.',
      true
    );
  }

  const serverData = await serverRes.json().catch(() => null);

  if (!serverRes.ok) {
    if (serverRes.status === 404 || serverData?.code === 'MISSING_API_KEY') {
      throw new PolishError(
        'Add your Gemini API key in Settings to enable Polish with AI.',
        true
      );
    }
    throw new PolishError(
      serverData?.error || 'Could not polish prompt. Check your Gemini API key in Settings.',
      serverRes.status === 401 || serverRes.status === 403
    );
  }

  const polished = typeof serverData?.polished === 'string' ? serverData.polished.trim() : '';
  if (!polished) {
    throw new PolishError('Gemini returned an empty response. Try again.');
  }

  return { polished, source: 'server' };
}
