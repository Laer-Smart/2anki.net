import { Request, Response } from 'express';
import { EventsController } from './EventsController';
import { TrackEventUseCase } from '../usecases/events/TrackEventUseCase';
import { EventsSink } from '../services/events/EventsSink';
import { IEventsRepository } from '../data_layer/EventsRepository';

function makeFakeRepository(): IEventsRepository {
  return {
    insertEvents: jest.fn(async () => undefined),
    countByName: jest.fn(async () => 0),
    countDistinctUsers: jest.fn(async () => 0),
    countByNameForUser: jest.fn(async () => 0),
  };
}

function buildMocks(opts: {
  userId?: number | null;
  anonId?: string | null;
}) {
  const repo = makeFakeRepository();
  const sink = new EventsSink(repo);
  const useCase = new TrackEventUseCase(sink);
  const executeSpy = jest.spyOn(useCase, 'execute');
  const controller = new EventsController(useCase);

  const req = {
    body: {},
    cookies: opts.anonId != null ? { anon_id: opts.anonId } : {},
  } as unknown as Request;

  const res = {
    locals: { owner: opts.userId ?? undefined },
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return { controller, req, res, executeSpy };
}

describe('EventsController', () => {
  it('returns 400 when name is missing', () => {
    const { controller, req, res } = buildMocks({});
    req.body = {};
    controller.track(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when name is not in KNOWN_EVENTS', () => {
    const { controller, req, res } = buildMocks({});
    req.body = { name: 'hacked_event_name' };
    controller.track(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when props is an array', () => {
    const { controller, req, res } = buildMocks({});
    req.body = { name: 'deck_downloaded', props: [1, 2, 3] };
    controller.track(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when props exceed 1KB', () => {
    const { controller, req, res } = buildMocks({});
    req.body = {
      name: 'deck_downloaded',
      props: { data: 'x'.repeat(1025) },
    };
    controller.track(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 202 with a valid known event', () => {
    const { controller, req, res } = buildMocks({ userId: 5, anonId: 'anon-x' });
    req.body = { name: 'deck_downloaded' };
    controller.track(req, res);
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('reads userId from res.locals.owner and never from request body', () => {
    const { controller, req, res, executeSpy } = buildMocks({
      userId: 99,
      anonId: 'anon-y',
    });
    req.body = { name: 'conversion_succeeded', props: { user_id: 1 } };
    controller.track(req, res);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 99 })
    );
  });

  it('reads anonymousId from cookie', () => {
    const { controller, req, res, executeSpy } = buildMocks({
      anonId: 'cookie-anon',
    });
    req.body = { name: 'upload_error_chat_shown' };
    controller.track(req, res);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ anonymousId: 'cookie-anon' })
    );
  });

  it('passes null anonymousId when cookie is absent', () => {
    const { controller, req, res, executeSpy } = buildMocks({});
    req.body = { name: 'deck_downloaded' };
    controller.track(req, res);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ anonymousId: null })
    );
  });

  it.each([
    'photo_entry_point_viewed',
    'photo_entry_point_clicked',
    'photo_upload_started',
    'photo_quota_reached',
  ])('returns 202 for new photo event: %s', (eventName) => {
    const { controller, req, res } = buildMocks({ userId: 1 });
    req.body = { name: eventName };
    controller.track(req, res);
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it.each([
    'sidebar_auto_minimize_fired',
    'sidebar_auto_minimize_reverted',
    'card_size_selected',
  ])('returns 202 for sidebar/card-size event: %s', (eventName) => {
    const { controller, req, res } = buildMocks({ userId: 1 });
    req.body = { name: eventName };
    controller.track(req, res);
    expect(res.status).toHaveBeenCalledWith(202);
  });
});
