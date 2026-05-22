import type Anthropic from '@anthropic-ai/sdk';
import type { IChatMessagesRepository } from '../../data_layer/ChatMessagesRepository';
import type { IConversationsRepository } from '../../data_layer/ConversationsRepository';
import { buildAttachmentBlocks, type ChatAttachment } from './buildAttachmentBlocks';

const FREE_MONTHLY_LIMIT = 20;
const FREE_MODEL = 'claude-haiku-4-5-20251001';
const PATREON_MODEL = 'claude-sonnet-4-6';
const MAX_HISTORY_TURNS = 10;
const MAX_TOKENS = 4096;
const AUTO_TITLE_MAX_LENGTH = 60;

const STUDY_ASSISTANT_SYSTEM_PROMPT = `You are a study assistant for 2anki, a tool that turns notes into Anki flashcards.

Help users understand material, answer study questions, and generate flashcards. When generating flashcards, you MUST wrap them in a JSON code block using EXACTLY this format:

\`\`\`json
[{"front": "question or term", "back": "answer or definition"}]
\`\`\`

For fill-in-the-blank or cloze cards, put the answer inline using Anki cloze syntax on the front and leave back empty:

\`\`\`json
[{"front": "The capital of France is {{c1::Paris}}.", "back": ""}]
\`\`\`

Use {{c1::...}}, {{c2::...}}, {{c3::...}} for separate blanks within the same card. Do not use bare ___ placeholders — the deck builder expects Anki cloze syntax for cloze cards.

Never output raw JSON without the code fence. Always include the opening \`\`\`json and closing \`\`\` markers.

Supported input on 2anki:
- Best: Notion HTML export (.zip with toggles — toggles become front/back automatically)
- Also: Markdown (.md), CSV, plain HTML, .apkg (existing Anki decks), PDF, .docx, .pptx, .xlsx

Never recommend OCR, image-to-text tools, screenshots, or "describe what's in the image". 2anki does not extract text from images, and routing users there wastes their time.

If a user uploads or mentions an image, photo, screenshot, or scanned page: tell them 2anki works with text, not images. Give them two options — (1) export the source from Notion as HTML, or (2) type or paste the notes directly into chat and you'll generate cards from that. Pick one and move forward.

After any explanation, offer to turn it into flashcards if the user hasn't already asked. Keep responses focused — this is a study tool, not a general assistant.`;

export interface ChatCard {
  front: string;
  back: string;
}

export interface ChatUser {
  owner: number;
  patreon: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessageResult {
  content: string;
  conversationId: number;
  contentBefore?: string;
  contentAfter?: string;
  cards?: ChatCard[];
}

function buildAutoTitle(firstMessage: string): string {
  const trimmed = firstMessage.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return 'New conversation';
  if (trimmed.length <= AUTO_TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, AUTO_TITLE_MAX_LENGTH).trimEnd()}…`;
}

export class ChatRateLimitError extends Error {
  readonly resetDate: string;

  constructor(resetDate: string) {
    super('Message limit reached');
    this.name = 'ChatRateLimitError';
    this.resetDate = resetDate;
  }
}

function firstOfNextMonth(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toISOString();
}

export interface ExtractCardsResult {
  cards: ChatCard[] | undefined;
  contentBefore: string | undefined;
  contentAfter: string | undefined;
}

function parseCardArray(raw: string): ChatCard[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;
  const cards: ChatCard[] = [];
  for (const item of parsed) {
    if (
      item != null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).front === 'string' &&
      typeof (item as Record<string, unknown>).back === 'string'
    ) {
      cards.push({
        front: (item as { front: string }).front,
        back: (item as { back: string }).back,
      });
    }
  }
  return cards.length > 0 ? cards : undefined;
}

export function extractCards(text: string): ExtractCardsResult {
  const fencedMatch = /```json\s*([\s\S]*?)```/.exec(text);
  if (fencedMatch != null) {
    const cards = parseCardArray(fencedMatch[1]);
    if (cards != null) {
      const before = text.slice(0, fencedMatch.index).trim();
      const after = text.slice(fencedMatch.index + fencedMatch[0].length).trim();
      return {
        cards,
        contentBefore: before.length > 0 ? before : undefined,
        contentAfter: after.length > 0 ? after : undefined,
      };
    }
  }

  // Fallback: detect a raw JSON array that starts with [{"front": ...}]
  const rawMatch = /((?:^|\n)\s*)(\[\s*\{[\s\S]*\}\s*\])/.exec(text);
  if (rawMatch != null) {
    const cards = parseCardArray(rawMatch[2]);
    if (cards != null) {
      const before = text.slice(0, rawMatch.index).trim();
      const after = text.slice(rawMatch.index + rawMatch[0].length).trim();
      return {
        cards,
        contentBefore: before.length > 0 ? before : undefined,
        contentAfter: after.length > 0 ? after : undefined,
      };
    }
  }

  return { cards: undefined, contentBefore: undefined, contentAfter: undefined };
}

export class ChatConversationNotFoundError extends Error {
  constructor() {
    super('Conversation not found');
    this.name = 'ChatConversationNotFoundError';
  }
}

export class ChatUseCase {
  constructor(
    private readonly messagesRepo: IChatMessagesRepository,
    private readonly conversationsRepo: IConversationsRepository,
    private readonly anthropic: Anthropic
  ) {}

  async execute(input: {
    user: ChatUser;
    content: string;
    conversationHistory: ChatMessage[];
    conversationId?: number | null;
    onToken?: (text: string) => void;
    attachments?: ChatAttachment[];
  }): Promise<SendMessageResult> {
    const { user, content, conversationHistory, onToken } = input;
    const attachments = input.attachments ?? [];

    if (!user.patreon) {
      const count = await this.messagesRepo.countThisMonth(user.owner);
      if (count >= FREE_MONTHLY_LIMIT) {
        throw new ChatRateLimitError(firstOfNextMonth());
      }
    }

    let conversationId: number;
    if (input.conversationId != null) {
      const existing = await this.conversationsRepo.findForUser({
        userId: user.owner,
        conversationId: input.conversationId,
      });
      if (existing == null) {
        throw new ChatConversationNotFoundError();
      }
      conversationId = existing.id;
    } else {
      conversationId = await this.conversationsRepo.create({
        userId: user.owner,
        title: buildAutoTitle(content),
      });
    }

    const model = user.patreon ? PATREON_MODEL : FREE_MODEL;

    const recentHistory = conversationHistory.slice(-MAX_HISTORY_TURNS);
    const attachmentBlocks = buildAttachmentBlocks(attachments);
    const userContent: Anthropic.MessageParam['content'] =
      attachmentBlocks.length > 0
        ? [...attachmentBlocks, { type: 'text', text: content }]
        : content;
    const messages: Anthropic.MessageParam[] = [
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent },
    ];

    await this.messagesRepo.insert({
      userId: user.owner,
      conversationId,
      role: 'user',
      content,
    });

    const stream = this.anthropic.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: STUDY_ASSISTANT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    if (onToken != null) {
      stream.on('text', onToken);
    }

    const finalMessage = await stream.finalMessage();

    const assistantContent = finalMessage.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    await this.messagesRepo.insert({
      userId: user.owner,
      conversationId,
      role: 'assistant',
      content: assistantContent,
    });
    await this.conversationsRepo.touch({ userId: user.owner, conversationId });
    await this.conversationsRepo.saveDraft({
      userId: user.owner,
      conversationId,
      content: null,
    });

    const { cards, contentBefore, contentAfter } = extractCards(assistantContent);

    return {
      content: assistantContent,
      conversationId,
      ...(cards != null ? { cards } : {}),
      ...(contentBefore != null ? { contentBefore } : {}),
      ...(contentAfter != null ? { contentAfter } : {}),
    };
  }
}
