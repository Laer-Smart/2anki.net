import { Request, Response } from 'express';
import UnlimitedCheckoutController from './UnlimitedCheckoutController';
import { UnlimitedCheckoutUseCase } from '../usecases/checkout/UnlimitedCheckoutUseCase';

const makeResponse = (locals: Record<string, unknown> = {}) => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    locals: { owner: 42, email: 'user@example.com', ...locals },
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
};

const makeUseCase = () =>
  ({
    execute: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
  } as unknown as UnlimitedCheckoutUseCase);

describe('UnlimitedCheckoutController', () => {
  it('returns 400 when interval is missing', async () => {
    const req = { body: {} } as Request;
    const res = makeResponse();
    const controller = new UnlimitedCheckoutController(makeUseCase());

    await controller.createSession(req, res as unknown as Response);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: expect.any(String) });
  });

  it('returns 400 when interval is invalid', async () => {
    const req = { body: { interval: 'weekly' } } as Request;
    const res = makeResponse();
    const controller = new UnlimitedCheckoutController(makeUseCase());

    await controller.createSession(req, res as unknown as Response);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: expect.any(String) });
  });

  it('returns 200 with url when interval is month', async () => {
    const req = { body: { interval: 'month' } } as Request;
    const res = makeResponse();
    const uc = makeUseCase();
    const controller = new UnlimitedCheckoutController(uc);

    await controller.createSession(req, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ url: 'https://checkout.stripe.com/test' });
    expect((uc.execute as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 'month', userId: 42, userEmail: 'user@example.com' })
    );
  });

  it('returns 200 with url when interval is year', async () => {
    const req = { body: { interval: 'year' } } as Request;
    const res = makeResponse();
    const uc = makeUseCase();
    const controller = new UnlimitedCheckoutController(uc);

    await controller.createSession(req, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ url: 'https://checkout.stripe.com/test' });
    expect((uc.execute as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 'year', userId: 42, userEmail: 'user@example.com' })
    );
  });

  it('propagates use case errors', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('stripe down'));
    const uc = { execute } as unknown as UnlimitedCheckoutUseCase;
    const req = { body: { interval: 'month' } } as Request;
    const res = makeResponse();
    const controller = new UnlimitedCheckoutController(uc);

    await expect(controller.createSession(req, res as unknown as Response)).rejects.toThrow('stripe down');
  });
});
