import type { Knex } from 'knex';

export interface ChatMessageRow {
  id: number;
  user_id: number;
  conversation_id: number | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export interface ChatMessageInsert {
  userId: number;
  conversationId: number | null;
  role: 'user' | 'assistant';
  content: string;
}

export interface IChatMessagesRepository {
  insert(entry: ChatMessageInsert): Promise<void>;
  countThisMonth(userId: number): Promise<number>;
  findLatestAssistantInConversation(input: {
    userId: number;
    conversationId: number;
  }): Promise<{ id: number; content: string } | null>;
  updateContent(input: {
    userId: number;
    messageId: number;
    content: string;
  }): Promise<boolean>;
  deleteById(input: { userId: number; messageId: number }): Promise<boolean>;
}

export class ChatMessagesRepository implements IChatMessagesRepository {
  private readonly table = 'chat_messages';

  constructor(private readonly database: Knex) {}

  async insert(entry: ChatMessageInsert): Promise<void> {
    await this.database(this.table).insert({
      user_id: entry.userId,
      conversation_id: entry.conversationId,
      role: entry.role,
      content: entry.content,
    });
  }

  async countThisMonth(userId: number): Promise<number> {
    const firstOfMonth = new Date();
    firstOfMonth.setUTCDate(1);
    firstOfMonth.setUTCHours(0, 0, 0, 0);

    const result = await this.database(this.table)
      .where('user_id', userId)
      .where('created_at', '>=', firstOfMonth)
      .count<{ count: string }>('* as count')
      .first();

    return Number(result?.count ?? 0);
  }

  async findLatestAssistantInConversation(input: {
    userId: number;
    conversationId: number;
  }): Promise<{ id: number; content: string } | null> {
    const row = await this.database(this.table)
      .where({
        user_id: input.userId,
        conversation_id: input.conversationId,
        role: 'assistant',
      })
      .orderBy('created_at', 'desc')
      .first<{ id: number; content: string } | undefined>('id', 'content');
    return row ?? null;
  }

  async updateContent(input: {
    userId: number;
    messageId: number;
    content: string;
  }): Promise<boolean> {
    const updated = await this.database(this.table)
      .where({ id: input.messageId, user_id: input.userId })
      .update({ content: input.content });
    return updated > 0;
  }

  async deleteById(input: { userId: number; messageId: number }): Promise<boolean> {
    const deleted = await this.database(this.table)
      .where({ id: input.messageId, user_id: input.userId })
      .del();
    return deleted > 0;
  }
}

export class InMemoryChatMessagesRepository implements IChatMessagesRepository {
  private readonly rows: Array<{
    id: number;
    user_id: number;
    conversation_id: number | null;
    role: 'user' | 'assistant';
    content: string;
    created_at: Date;
  }> = [];
  private nextId = 1;

  async insert(entry: ChatMessageInsert): Promise<void> {
    this.rows.push({
      id: this.nextId++,
      user_id: entry.userId,
      conversation_id: entry.conversationId,
      role: entry.role,
      content: entry.content,
      created_at: new Date(),
    });
  }

  async countThisMonth(userId: number): Promise<number> {
    const firstOfMonth = new Date();
    firstOfMonth.setUTCDate(1);
    firstOfMonth.setUTCHours(0, 0, 0, 0);

    return this.rows.filter(
      (r) => r.user_id === userId && r.created_at >= firstOfMonth
    ).length;
  }

  async findLatestAssistantInConversation(input: {
    userId: number;
    conversationId: number;
  }): Promise<{ id: number; content: string } | null> {
    const matching = this.rows.filter(
      (r) =>
        r.user_id === input.userId &&
        r.conversation_id === input.conversationId &&
        r.role === 'assistant'
    );
    if (matching.length === 0) return null;
    matching.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return { id: matching[0].id, content: matching[0].content };
  }

  async updateContent(input: {
    userId: number;
    messageId: number;
    content: string;
  }): Promise<boolean> {
    const row = this.rows.find(
      (r) => r.id === input.messageId && r.user_id === input.userId
    );
    if (row == null) return false;
    row.content = input.content;
    return true;
  }

  async deleteById(input: { userId: number; messageId: number }): Promise<boolean> {
    const index = this.rows.findIndex(
      (r) => r.id === input.messageId && r.user_id === input.userId
    );
    if (index === -1) return false;
    this.rows.splice(index, 1);
    return true;
  }

  getAll(): typeof this.rows {
    return this.rows;
  }
}
