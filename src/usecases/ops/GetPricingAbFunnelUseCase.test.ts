import { GetPricingAbFunnelUseCase } from './GetPricingAbFunnelUseCase';
import {
  PricingAbFunnelService,
  PricingAbFunnelResponse,
} from '../../services/ops/PricingAbFunnelService';

describe('GetPricingAbFunnelUseCase', () => {
  it('delegates to the service with a since date derived from the window param', async () => {
    const fakeResponse: PricingAbFunnelResponse = {
      variants: [],
      surface_breakdown: [],
      since: '2026-04-27T00:00:00.000Z',
      as_of: '2026-05-27T00:00:00.000Z',
    };
    const service = {
      getMetrics: jest.fn().mockResolvedValue(fakeResponse),
    } as unknown as PricingAbFunnelService;
    const useCase = new GetPricingAbFunnelUseCase(service);

    const result = await useCase.execute('30d');

    expect(result).toBe(fakeResponse);
    expect(service.getMetrics as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('uses a 30-day default when no window is provided', async () => {
    const fakeResponse: PricingAbFunnelResponse = {
      variants: [],
      surface_breakdown: [],
      since: '2026-04-27T00:00:00.000Z',
      as_of: '2026-05-27T00:00:00.000Z',
    };
    const service = {
      getMetrics: jest.fn().mockResolvedValue(fakeResponse),
    } as unknown as PricingAbFunnelService;
    const useCase = new GetPricingAbFunnelUseCase(service);

    const result = await useCase.execute(undefined);

    expect(result).toBe(fakeResponse);
    expect(service.getMetrics as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('passes a 7-day since date for the 7d window', async () => {
    const fakeResponse: PricingAbFunnelResponse = {
      variants: [],
      surface_breakdown: [],
      since: '2026-05-20T00:00:00.000Z',
      as_of: '2026-05-27T00:00:00.000Z',
    };
    const service = {
      getMetrics: jest.fn().mockResolvedValue(fakeResponse),
    } as unknown as PricingAbFunnelService;
    const useCase = new GetPricingAbFunnelUseCase(service);

    await useCase.execute('7d');

    const callArg: Date = (service.getMetrics as jest.Mock).mock.calls[0][0];
    const now = new Date();
    const diffDays =
      (now.getTime() - callArg.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6.9);
    expect(diffDays).toBeLessThan(8);
  });
});
