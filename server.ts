import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

type PromptFormatMode = 'casual' | 'structured' | 'xml';
type PolishGoalStyle = 'balanced' | 'concise' | 'detailed';

function buildPolishSystemInstruction(
  mode: PromptFormatMode,
  polishStyle: PolishGoalStyle
): string {
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
        : 'Elaborate the user\'s input into a clear, well-developed, high-performing prompt with concrete instructions, explicit deliverable expectations, and clean guardrails—never just repeat or lightly paraphrase what the user typed.';

  return [
    'You are a world-class AI prompt engineer.',
    'Your job is to WRITE AN ENGINEERED PROMPT that the user will copy and paste into an AI assistant—NEVER answer or fulfill the task yourself.',
    'Do NOT simply echo back or lightly reword the user\'s raw notes. Transform their intent into a crystal-clear, richly elaborated, high-performing prompt that extracts the strongest possible answer from an LLM.',
    formatDirective,
    depthDirective,
    'Preserve every user requirement, domain detail, constraint, and any {{placeholder}} template variables verbatim without inventing contradictory facts.',
    'Output ONLY the final ready-to-paste prompt text. Do not include any preamble, explanation, commentary, or surrounding quotes.',
  ].join(' ');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/polish', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        res.status(400).json({
          code: 'MISSING_API_KEY',
          error: 'No server Gemini API key is configured. Add your Gemini API key in Settings.',
        });
        return;
      }

      const draft = typeof req.body?.draft === 'string' ? req.body.draft.trim() : '';
      const mode: PromptFormatMode =
        req.body?.mode === 'casual' || req.body?.mode === 'xml'
          ? req.body.mode
          : 'structured';
      const polishStyle: PolishGoalStyle =
        req.body?.polishStyle === 'concise' || req.body?.polishStyle === 'balanced'
          ? req.body.polishStyle
          : 'detailed';

      if (!draft) {
        res.status(400).json({ error: 'Draft prompt cannot be empty.' });
        return;
      }

      if (draft.length > 15000) {
        res.status(400).json({ error: 'Draft prompt is too long to polish.' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Transform and elaborate the following user prompt draft into a clear, detailed, high-performing final prompt ready to paste into an AI assistant:\n\n${draft}`,
        config: {
          systemInstruction: buildPolishSystemInstruction(mode, polishStyle),
        },
      });

      const polished = response.text?.trim();
      if (!polished) {
        res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
        return;
      }

      res.json({ polished });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to polish prompt.';
      const status =
        message.includes('API_KEY_INVALID') || message.includes('403')
          ? 401
          : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : 500;
      res.status(status).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PromptCraft server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
