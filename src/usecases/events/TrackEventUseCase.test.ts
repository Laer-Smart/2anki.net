import { TrackEventUseCase } from './TrackEventUseCase';
import { EventsSink } from '../../services/events/EventsSink';
import { IEventsRepository, EventRow } from '../../data_layer/EventsRepository';

function makeFakeRepository() {
  const inserted: EventRow[] = [];
  const repo: IEventsRepository = {
    insertEvents: jest.fn(async (rows) => {
      for (const r of rows) inserted.push(r);
    }),
    countByName: jest.fn(async () => 0),
    countDistinctUsers: jest.fn(async () => 0),
    countByNameForUser: jest.fn(async () => 0),
    lastEventAt: jest.fn(async () => null),
    groupPaywallShownByVariantAndSurface: jest.fn(async () => []),
    groupPaywallClicksByVariant: jest.fn(async () => []),
    groupUploadFunnel: jest.fn(async () => []),
    groupUploadFunnelByOrigin: jest.fn(async () => []),
  };
  return { repo, inserted };
}

describe('TrackEventUseCase', () => {
  it('records the event via the sink', async () => {
    const { repo } = makeFakeRepository();
    const sink = new EventsSink(repo, { flushThreshold: 1 });
    const useCase = new TrackEventUseCase(sink);
    useCase.execute({
      name: 'deck_downloaded',
      unknown: false,
      userId: 7,
      anonymousId: 'anon-abc',
      props: { source: 'upload' },
    });
    await sink.flush();
    expect(repo.insertEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'deck_downloaded',
          user_id: 7,
          anonymous_id: 'anon-abc',
          props: { source: 'upload' },
        }),
      ])
    );
  });

  it('strips PII keys before recording', async () => {
    const { repo } = makeFakeRepository();
    const sink = new EventsSink(repo, { flushThreshold: 1 });
    const useCase = new TrackEventUseCase(sink);
    useCase.execute({
      name: 'conversion_succeeded',
      unknown: false,
      userId: null,
      anonymousId: null,
      props: { email: 'x@x.com', source: 'notion', token: 'abc' },
    });
    await sink.flush();
    const [call] = (repo.insertEvents as jest.Mock).mock.calls;
    expect(call[0][0].props).toEqual({ source: 'notion' });
  });

  it('keeps producer_intent_captured prop keys through ingestion', async () => {
    const { repo } = makeFakeRepository();
    const sink = new EventsSink(repo, { flushThreshold: 1 });
    const useCase = new TrackEventUseCase(sink);
    useCase.execute({
      name: 'producer_intent_captured',
      unknown: false,
      userId: 42,
      anonymousId: null,
      props: {
        source: 'pricing_page',
        team_size: '2–10',
        purpose: 'MCAT tutoring for a cohort of students',
      },
    });
    await sink.flush();
    const [call] = (repo.insertEvents as jest.Mock).mock.calls;
    expect(call[0][0].props).toEqual({
      source: 'pricing_page',
      team_size: '2–10',
      purpose: 'MCAT tutoring for a cohort of students',
    });
  });

  it('throws when props exceed 1KB', () => {
    const { repo } = makeFakeRepository();
    const sink = new EventsSink(repo);
    const useCase = new TrackEventUseCase(sink);
    expect(() =>
      useCase.execute({
        name: 'conversion_succeeded',
        unknown: false,
        userId: null,
        anonymousId: null,
        props: { data: 'x'.repeat(1025) },
      })
    ).toThrow('1 KB');
  });
});
