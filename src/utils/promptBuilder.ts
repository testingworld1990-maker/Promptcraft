import {
  DEFAULT_BOOSTERS,
  PromptAnswers,
  PromptBoosters,
  PromptMode,
  QuestionKey,
} from '../types/prompt';

function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function stripTrailingPeriod(text: string): string {
  return text.trim().replace(/[.!?]+$/, '').trim();
}

function lowercaseInitial(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  // Preserve acronyms like "SQL", "API", "UX", "B2B", or "I "
  if (/^[A-Z]{2,}\b/.test(trimmed) || /^I(\s|'|$)/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function capitalizeInitial(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function splitIntoCleanItems(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Split on newlines first; if single line, split on commas/semicolons unless inside a long prose sentence
  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)]+\s*/, '').trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines;
  }

  // Split comma/semicolon-separated items (common from chips or quick lists)
  const parts = trimmed
    .split(/\s*[;,]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Only treat as a multi-item list if each segment looks like a concise item rather than a single complex clause
  if (parts.length >= 2 && parts.every((p) => p.split(/\s+/).length <= 14)) {
    return parts;
  }

  return [trimmed];
}

function joinNaturalList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return lowercaseInitial(stripTrailingPeriod(items[0]));
  if (items.length === 2) {
    return `${lowercaseInitial(stripTrailingPeriod(items[0]))} and ${lowercaseInitial(stripTrailingPeriod(items[1]))}`;
  }
  const head = items
    .slice(0, -1)
    .map((i) => lowercaseInitial(stripTrailingPeriod(i)))
    .join(', ');
  const tail = lowercaseInitial(stripTrailingPeriod(items[items.length - 1]));
  return `${head}, and ${tail}`;
}

function formatRoleStatement(role: string): string {
  const cleaned = stripTrailingPeriod(role);
  if (!cleaned) return '';
  if (/^(act as|you are|behave as|imagine you are|serve as)/i.test(cleaned)) {
    return ensureSentence(capitalizeInitial(cleaned));
  }
  if (/^(a|an|the)\s+/i.test(cleaned)) {
    return `You are ${lowercaseInitial(cleaned)}.`;
  }
  const article = /^[aeiou]/i.test(cleaned) ? 'an' : 'a';
  return `You are ${article} ${cleaned}.`;
}

function formatTaskDirective(task: string): string {
  const cleaned = task.trim();
  if (!cleaned) return '';

  // Keep multiline tasks (e.g. templates containing {{code_snippet}}) readable
  if (cleaned.includes('\n')) {
    return cleaned;
  }

  const withoutPrefix = cleaned
    .replace(/^(i want you to|please|can you|could you|help me to|help me)\s+/i, '')
    .trim();

  if (/^(write|create|build|design|explain|summarize|review|analyze|brainstorm|draft|rewrite|generate|develop|plan|compare|outline|extract|refactor|translate|teach|evaluate|improve)/i.test(withoutPrefix)) {
    return `Your primary objective is to ${lowercaseInitial(stripTrailingPeriod(withoutPrefix))}.`;
  }

  return `Your primary objective is: ${ensureSentence(capitalizeInitial(cleaned))}`;
}

function getActiveBoosterLines(boosters: PromptBoosters): string[] {
  const lines: string[] = [];
  if (boosters.askQuestionsFirst) {
    lines.push(
      'Before producing the final output, ask up to 3 brief, high-impact clarifying questions if any critical information is missing or ambiguous.'
    );
  }
  if (boosters.stepByStep) {
    lines.push(
      'Work through the problem methodically step by step—breaking down key assumptions and trade-offs—before presenting your final answer.'
    );
  }
  if (boosters.includeExamples) {
    lines.push(
      'Illustrate every major recommendation or concept with concrete, realistic examples rather than abstract generalities.'
    );
  }
  if (boosters.selfVerify) {
    lines.push(
      'Before finalizing, review your draft against every requirement and constraint above and tighten anything that feels vague, incomplete, or off-tone.'
    );
  }
  return lines;
}

/**
 * Synthesizes the user's raw answers into a clear, detailed, ready-to-paste AI prompt
 * (elaborating intent into actionable instructions instead of echoing raw fragments).
 */
export function buildPrompt(
  answers: PromptAnswers,
  mode: PromptMode,
  boosters: PromptBoosters = DEFAULT_BOOSTERS
): string {
  const task = answers.task.trim();
  const role = answers.role.trim();
  const context = answers.context.trim();
  const details = answers.details.trim();
  const avoid = answers.avoid.trim();
  const format = answers.format.trim();

  if (!task && !role && !context && !details && !avoid && !format) {
    return '';
  }

  const detailItems = splitIntoCleanItems(details);
  const avoidItems = splitIntoCleanItems(avoid);
  const formatItems = splitIntoCleanItems(format);
  const boosterLines = getActiveBoosterLines(boosters);

  if (mode === 'xml') {
    const blocks: string[] = [];

    if (role) {
      blocks.push(
        `<role>\n${formatRoleStatement(role)} Apply senior-level domain expertise, sound judgment, and practical best practices from this discipline throughout your response.\n</role>`
      );
    }

    if (task) {
      const taskBody = task.includes('\n')
        ? `${task}\n\nDeliver a thorough, concrete, and immediately usable result—not a superficial overview or filler commentary.`
        : `${formatTaskDirective(task)} Deliver a thorough, concrete, and immediately usable result rather than vague advice or surface-level commentary.`;
      blocks.push(`<objective>\n${taskBody}\n</objective>`);
    }

    if (context) {
      blocks.push(
        `<context_and_audience>\nTailor the framing, depth, vocabulary, and priorities of your response specifically for this audience and background:\n${ensureSentence(capitalizeInitial(context))}\nEnsure every point directly addresses their real needs and level of familiarity.\n</context_and_audience>`
      );
    }

    if (detailItems.length > 0) {
      const list = detailItems
        .map((item) => `- ${capitalizeInitial(stripTrailingPeriod(item))}`)
        .join('\n');
      blocks.push(
        `<requirements>\nExplicitly include and substantively develop all of the following essential elements:\n${list}\nIntegrate each element meaningfully rather than mentioning it in passing.\n</requirements>`
      );
    }

    if (avoidItems.length > 0) {
      const list = avoidItems
        .map((item) => `- ${capitalizeInitial(stripTrailingPeriod(item))}`)
        .join('\n');
      blocks.push(
        `<constraints>\nStrictly avoid all of the following anywhere in your response:\n${list}\nKeep every sentence accurate, purposeful, and completely free of these pitfalls.\n</constraints>`
      );
    }

    if (formatItems.length > 0) {
      const list = formatItems
        .map((item) => `- ${capitalizeInitial(stripTrailingPeriod(item))}`)
        .join('\n');
      blocks.push(
        `<output_format_and_tone>\nFollow these exact presentation, length, and voice guidelines:\n${list}\nPrioritize clarity, scannability, and polish so the response can be used immediately without extra cleanup.\n</output_format_and_tone>`
      );
    } else {
      blocks.push(
        `<output_format_and_tone>\nOrganize your response clearly with logical structure, concise phrasing, and zero filler so it is immediately usable.\n</output_format_and_tone>`
      );
    }

    if (boosterLines.length > 0) {
      blocks.push(
        `<execution_guidelines>\n${boosterLines.map((l) => `- ${l}`).join('\n')}\n</execution_guidelines>`
      );
    }

    return blocks.join('\n\n');
  }

  if (mode === 'structured') {
    const sections: string[] = [];

    if (role) {
      sections.push(
        `### Role & Expertise\n${formatRoleStatement(role)} Draw on senior-level domain expertise, practical judgment, and proven best practices from this discipline to guide every part of your response.`
      );
    }

    if (task) {
      const taskBody = task.includes('\n')
        ? `${task}\n\nApproach this directly and thoroughly—deliver a complete, actionable result ready to use right away rather than generic high-level advice.`
        : `${formatTaskDirective(task)} Approach this directly and thoroughly—deliver a complete, actionable result ready to use right away rather than generic high-level advice.`;
      sections.push(`### Primary Objective\n${taskBody}`);
    }

    if (context) {
      sections.push(
        `### Target Audience & Context\nCalibrate the depth, framing, and relevance specifically for the following situation and audience:\n${ensureSentence(capitalizeInitial(context))} Make sure every point speaks directly to their priorities and level of familiarity.`
      );
    }

    if (detailItems.length > 0) {
      const list = detailItems
        .map((item) => `- ${capitalizeInitial(stripTrailingPeriod(item))}`)
        .join('\n');
      sections.push(
        `### Key Requirements & Must-Haves\nMake sure your response explicitly incorporates and develops each of the following elements:\n${list}\nWeave these in substantively rather than treating them as a quick afterthought.`
      );
    }

    if (avoidItems.length > 0) {
      const list = avoidItems
        .map((item) => `- ${capitalizeInitial(stripTrailingPeriod(item))}`)
        .join('\n');
      sections.push(
        `### Strict Constraints (What to Avoid)\nDo not include any of the following anywhere in your output:\n${list}\nKeep every line sharp, grounded, and completely free of these pitfalls.`
      );
    }

    if (formatItems.length > 0) {
      const list = formatItems
        .map((item) => `- ${capitalizeInitial(stripTrailingPeriod(item))}`)
        .join('\n');
      sections.push(
        `### Output Format & Tone\nDeliver the final response following these exact presentation and voice guidelines:\n${list}\nPrioritize clarity, scannability, and finish so the output is ready to use as-is.`
      );
    } else {
      sections.push(
        `### Output Format & Quality\nPresent the final answer in a clean, well-structured, easy-to-scan format with clear reasoning and zero unnecessary filler.`
      );
    }

    if (boosterLines.length > 0) {
      sections.push(
        `### Execution & Quality Standards\n${boosterLines.map((l) => `- ${l}`).join('\n')}`
      );
    }

    return sections.join('\n\n');
  }

  // Casual mode: clear, richly elaborated, natural prose prompt
  const paragraphs: string[] = [];

  if (role) {
    paragraphs.push(
      `${formatRoleStatement(role)} Bring practical, expert-level judgment and clear thinking to every part of your response.`
    );
  }

  if (task) {
    const taskParagraph = task.includes('\n')
      ? `${task}\n\nPlease deliver a thorough, concrete, and immediately usable result rather than surface-level commentary.`
      : `${formatTaskDirective(task)} Please deliver a thorough, concrete, and immediately usable result rather than vague advice or filler.`;
    paragraphs.push(taskParagraph);
  }

  if (context) {
    paragraphs.push(
      `Keep this audience and background front and center as you respond: ${ensureSentence(capitalizeInitial(context))} Calibrate your depth, examples, and language so everything directly fits their needs and familiarity.`
    );
  }

  if (detailItems.length > 0) {
    paragraphs.push(
      `Make sure to thoroughly cover and integrate these essential elements: ${joinNaturalList(detailItems)}. Develop each point meaningfully rather than mentioning it briefly.`
    );
  }

  if (avoidItems.length > 0) {
    paragraphs.push(
      `Steer completely clear of the following throughout your answer: ${joinNaturalList(avoidItems)}. Keep every sentence purposeful and grounded.`
    );
  }

  if (formatItems.length > 0) {
    paragraphs.push(
      `Present your response following these format and tone guidelines: ${joinNaturalList(formatItems)}. Make the final result crisp, clear, and ready to use right away.`
    );
  } else {
    paragraphs.push(
      `Keep the response well-organized, clear, and directly usable without unnecessary preamble or filler.`
    );
  }

  if (boosterLines.length > 0) {
    paragraphs.push(boosterLines.join(' '));
  }

  return paragraphs.join('\n\n');
}

export function extractTemplateVariables(text: string): string[] {
  const matches = text.match(/\{\{\s*([a-zA-Z0-9_ -]{1,40})\s*\}\}/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of matches) {
    const name = raw.slice(2, -2).trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

export function applyTemplateVariables(
  text: string,
  values: Record<string, string>
): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_ -]{1,40})\s*\}\}/g, (match, name) => {
    const key = String(name).trim();
    const replacement = values[key]?.trim();
    return replacement ? replacement : match;
  });
}

export function getNextImprovementTip(
  answers: PromptAnswers
): { stepIndex: number; key: QuestionKey; message: string } | null {
  if (!answers.task.trim()) {
    return {
      stepIndex: 0,
      key: 'task',
      message: 'Start by describing what you want the AI to do.',
    };
  }
  if (!answers.role.trim()) {
    return {
      stepIndex: 1,
      key: 'role',
      message: 'Add a Role to sharpen domain expertise.',
    };
  }
  if (!answers.format.trim()) {
    return {
      stepIndex: 2,
      key: 'format',
      message: 'Pick a Format or Tone to shape the output.',
    };
  }
  if (!answers.context.trim()) {
    return {
      stepIndex: 3,
      key: 'context',
      message: 'Optional: Add Audience for a more tailored answer.',
    };
  }
  if (!answers.details.trim()) {
    return {
      stepIndex: 4,
      key: 'details',
      message: 'Optional: List must-have details or examples.',
    };
  }
  if (!answers.avoid.trim()) {
    return {
      stepIndex: 5,
      key: 'avoid',
      message: 'Optional: Add what to avoid to remove filler.',
    };
  }
  return null;
}

export function hasAnyAnswer(answers: PromptAnswers): boolean {
  return Object.values(answers).some((val) => val.trim().length > 0);
}

export function countAnsweredSteps(answers: PromptAnswers): number {
  return Object.values(answers).filter((val) => val.trim().length > 0).length;
}

export function countActiveBoosters(boosters: PromptBoosters): number {
  return Object.values(boosters).filter(Boolean).length;
}

export function isChipSelected(currentValue: string, chip: string): boolean {
  if (!currentValue.trim()) return false;
  const escaped = chip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|,\\s*|;\\s*|\\n\\s*)${escaped}($|,|\\s*;|\\s*\\n)`, 'i');
  return pattern.test(currentValue.trim());
}

export function toggleChipInText(currentValue: string, chip: string): string {
  const trimmed = currentValue.trim();
  if (!trimmed) return chip;

  if (isChipSelected(trimmed, chip)) {
    const segments = trimmed
      .split(/,\s*|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.toLowerCase() !== chip.toLowerCase());
    return segments.join(', ');
  }

  const separator = trimmed.endsWith(',') || trimmed.endsWith('\n') ? ' ' : ', ';
  return `${trimmed}${separator}${chip}`;
}

export function suggestPromptTitle(answers: PromptAnswers): string {
  const source = answers.task.trim() || answers.role.trim() || answers.context.trim();
  if (!source) return 'Untitled Prompt';
  const cleaned = source
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?:]+$/, '')
    .trim();
  if (!cleaned) return 'Untitled Prompt';
  if (cleaned.length <= 44) return cleaned;
  return `${cleaned.slice(0, 41).trimEnd()}...`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy textarea copy for Android WebView compatibility
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function formatRelativeDate(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.round(trimmed.length / 4));
}
