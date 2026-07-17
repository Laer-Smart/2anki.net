import RequestDeveloperAccessUseCase, {
  resolvePayingStatus,
} from './RequestDeveloperAccessUseCase';

describe('resolvePayingStatus', () => {
  it('reports lifetime, subscriber, or free in priority order', () => {
    expect(
      resolvePayingStatus({
        userId: 1,
        email: 'a@b.c',
        patreon: true,
        subscriber: true,
      })
    ).toBe('lifetime');
    expect(
      resolvePayingStatus({
        userId: 1,
        email: 'a@b.c',
        patreon: false,
        subscriber: true,
      })
    ).toBe('subscriber');
    expect(
      resolvePayingStatus({
        userId: 1,
        email: 'a@b.c',
        patreon: false,
        subscriber: false,
      })
    ).toBe('free');
  });
});

describe('RequestDeveloperAccessUseCase', () => {
  it('emails support with the requester id, email, and paying status', async () => {
    const send = jest.fn().mockResolvedValue({ didSend: true });
    const emailService = { sendDeveloperAccessRequestEmail: send } as never;

    const sent = await new RequestDeveloperAccessUseCase(emailService).execute({
      userId: 42,
      email: 'dev@example.com',
      patreon: false,
      subscriber: true,
    });

    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledWith('42', 'dev@example.com', 'subscriber');
  });
});
