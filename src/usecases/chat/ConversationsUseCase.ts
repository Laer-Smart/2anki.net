import type {
  IConversationsRepository,
  ConversationSummary,
  ConversationWithMessages,
} from '../../data_layer/ConversationsRepository';
import { extractCards, ChatCard } from './ChatUseCase';
import { isChatCardTemplate } from './chatTemplates';

const MAX_TITLE_LENGTH = 120;

export class InvalidTitleError extends Error {
  constructor() {
    super('Invalid title');
    this.name = 'InvalidTitleError';
  }
}

export interface ConversationMessageView {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
  cards?: ChatCard[];
  contentBefore?: string;
  contentAfter?: string;
}

export interface ConversationView {
  id: number;
  title: string;
  draft: string | null;
  templateSlug: string | null;
  created_at: Date;
  updated_at: Date;
  messages: ConversationMessageView[];
}

export class InvalidTemplateError extends Error {
  constructor() {
    super('Invalid template');
    this.name = 'InvalidTemplateError';
  }
}

const MAX_DRAFT_LENGTH = 100_000;

export class InvalidDraftError extends Error {
  constructor() {
    super('Invalid draft');
    this.name = 'InvalidDraftError';
  }
}

function hydrateMessages(
  conv: ConversationWithMessages
): ConversationMessageView[] {
  return conv.messages.map((m) => {
    if (m.role !== 'assistant') {
      return m;
    }
    const { cards, contentBefore, contentAfter } = extractCards(m.content, true);
    return {
      ...m,
      ...(cards != null ? { cards } : {}),
      ...(contentBefore != null ? { contentBefore } : {}),
      ...(contentAfter != null ? { contentAfter } : {}),
    };
  });
}

export class ConversationsUseCase {
  constructor(private readonly repo: IConversationsRepository) {}

  list(userId: number): Promise<ConversationSummary[]> {
    return this.repo.listForUser(userId);
  }

  async get(input: {
    userId: number;
    conversationId: number;
  }): Promise<ConversationView | null> {
    const conv = await this.repo.findForUser(input);
    if (conv == null) return null;
    return {
      id: conv.id,
      title: conv.title,
      draft: conv.draft,
      templateSlug: conv.templateSlug,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      messages: hydrateMessages(conv),
    };
  }

  async saveDraft(input: {
    userId: number;
    conversationId: number;
    content: string | null;
  }): Promise<boolean> {
    let normalised: string | null;
    if (input.content == null) {
      normalised = null;
    } else {
      if (typeof input.content !== 'string') {
        throw new InvalidDraftError();
      }
      if (input.content.length > MAX_DRAFT_LENGTH) {
        throw new InvalidDraftError();
      }
      normalised = input.content.length === 0 ? null : input.content;
    }
    return this.repo.saveDraft({
      userId: input.userId,
      conversationId: input.conversationId,
      content: normalised,
    });
  }

  async rename(input: {
    userId: number;
    conversationId: number;
    title: string;
  }): Promise<boolean> {
    const trimmed = input.title.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LENGTH) {
      throw new InvalidTitleError();
    }
    return this.repo.rename({
      userId: input.userId,
      conversationId: input.conversationId,
      title: trimmed,
    });
  }

  delete(input: { userId: number; conversationId: number }): Promise<boolean> {
    return this.repo.softDelete(input);
  }

  async saveTemplate(input: {
    userId: number;
    conversationId: number;
    templateSlug: string | null;
  }): Promise<boolean> {
    if (input.templateSlug != null && !isChatCardTemplate(input.templateSlug)) {
      throw new InvalidTemplateError();
    }
    return this.repo.saveTemplate({
      userId: input.userId,
      conversationId: input.conversationId,
      templateSlug: input.templateSlug,
    });
  }
}
