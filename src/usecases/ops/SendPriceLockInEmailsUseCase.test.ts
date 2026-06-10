import { SendPriceLockInEmailsUseCase } from './SendPriceLockInEmailsUseCase';
import { InMemoryPriceLockInEmailRepository } from '../../data_layer/PriceLockInEmailRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';
import type { EventRow } from '../../data_layer/EventsRepository';

function buildEmailService() {
  const sent: Array<{ to: string; token: string; variant: 'a' | 'b' }> = [];
  const service = {
    sendPriceLockInEmail: jest.fn(
      async (to: string, token: string, variant: 'a' | 'b') => {
        sent.push({ to, token, variant });
      }
    ),
  } as unknown as IEmailService;
  return { service, sent };
}

function buildSink() {
  const events: EventRow[] = [];
  return {
    sink: {
      record: (row: EventRow) => {
        events.push(row);
      },
    },
    events,
  };
}

describe('SendPriceLockInEmailsUseCase', () => {
  it('sends nothing in dry-run and returns the segment count', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([
      { id: 2, email: 'a@example.com' },
      { id: 4, email: 'b@example.com' },
    ]);
    const { service, sent } = buildEmailService();
    const { sink, events } = buildSink();
    const useCase = new SendPriceLockInEmailsUseCase(repo, service, sink);

    const result = await useCase.execute(true);

    expect(result).toEqual({
      count: 2,
      dryRun: true,
      variantA: 0,
      variantB: 0,
    });
    expect(sent).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('sends to each eligible user and records the send', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([
      { id: 2, email: 'a@example.com' },
      { id: 3, email: 'b@example.com' },
    ]);
    const { service, sent } = buildEmailService();
    const { sink } = buildSink();
    const useCase = new SendPriceLockInEmailsUseCase(repo, service, sink);

    const result = await useCase.execute(false);

    expect(result.count).toBe(2);
    expect(sent).toHaveLength(2);
    expect(repo.getSentEmails()).toHaveLength(2);
  });

  it('does not double-send a user across two runs', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([
      { id: 2, email: 'a@example.com' },
      { id: 3, email: 'b@example.com' },
    ]);
    const { service, sent } = buildEmailService();
    const { sink } = buildSink();
    const useCase = new SendPriceLockInEmailsUseCase(repo, service, sink);

    await useCase.execute(false, 1);
    await useCase.execute(false, 1);
    await useCase.execute(false, 1);

    const recipients = sent.map((s) => s.to).sort();
    expect(recipients).toEqual(['a@example.com', 'b@example.com']);
  });

  it('splits variant by user id parity', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([
      { id: 2, email: 'even@example.com' },
      { id: 3, email: 'odd@example.com' },
    ]);
    const { service, sent } = buildEmailService();
    const { sink } = buildSink();
    const useCase = new SendPriceLockInEmailsUseCase(repo, service, sink);

    const result = await useCase.execute(false);

    expect(result.variantA).toBe(1);
    expect(result.variantB).toBe(1);
    expect(sent.find((s) => s.to === 'even@example.com')?.variant).toBe('a');
    expect(sent.find((s) => s.to === 'odd@example.com')?.variant).toBe('b');
  });

  it('records an email_batch_sent event with the variant split', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([
      { id: 2, email: 'even@example.com' },
      { id: 3, email: 'odd@example.com' },
    ]);
    const { service } = buildEmailService();
    const { sink, events } = buildSink();
    const useCase = new SendPriceLockInEmailsUseCase(repo, service, sink);

    await useCase.execute(false);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'email_batch_sent',
      props: {
        campaign: 'price_lock_in',
        count: 2,
        variant_a: 1,
        variant_b: 1,
      },
    });
  });

  it('still records the user even when the email send throws', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([{ id: 2, email: 'fail@example.com' }]);
    const service = {
      sendPriceLockInEmail: jest
        .fn()
        .mockRejectedValue(new Error('sendgrid down')),
    } as unknown as IEmailService;
    const { sink } = buildSink();
    const useCase = new SendPriceLockInEmailsUseCase(repo, service, sink);

    const result = await useCase.execute(false);

    expect(result.count).toBe(0);
    expect(repo.getSentEmails()).toHaveLength(1);
    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });
});
