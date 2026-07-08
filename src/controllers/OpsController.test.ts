import express from 'express';

import OpsController from './OpsController';
import { GetOpsMetricsUseCase } from '../usecases/ops/GetOpsMetricsUseCase';
import { GetBusinessMetricsUseCase } from '../usecases/ops/GetBusinessMetricsUseCase';
import { GetReturnRateMetricsUseCase } from '../usecases/ops/GetReturnRateMetricsUseCase';
import { DeleteInactiveUsersUseCase } from '../usecases/ops/DeleteInactiveUsersUseCase';

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    json,
    status,
    end: jest.fn(),
    set: jest.fn(),
  } as unknown as express.Response & {
    json: jest.Mock;
    status: jest.Mock;
    set: jest.Mock;
  };
};

describe('OpsController.getMetrics', () => {
  it('passes the query window down to the use case and returns its result', async () => {
    const fakeMetrics = { window: '24h' };
    const useCase = {
      execute: jest.fn().mockResolvedValue(fakeMetrics),
    } as unknown as GetOpsMetricsUseCase;
    const controller = new OpsController(useCase);
    const req = { query: { window: '24h' } } as unknown as express.Request;
    const res = buildRes();

    await controller.getMetrics(req, res);

    expect(useCase.execute as jest.Mock).toHaveBeenCalledWith('24h');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeMetrics);
  });

  it('responds 500 when the use case throws', async () => {
    const useCase = {
      execute: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as GetOpsMetricsUseCase;
    const controller = new OpsController(useCase);
    const req = { query: {} } as unknown as express.Request;
    const res = buildRes();
    const errSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await controller.getMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    errSpy.mockRestore();
  });
});

describe('OpsController.getBusinessMetrics', () => {
  it('returns the use case result with status 200', async () => {
    const fake = { mrr_usd: 4820 };
    const opsUseCase = {} as unknown as GetOpsMetricsUseCase;
    const businessUseCase = {
      execute: jest.fn().mockResolvedValue(fake),
    } as unknown as GetBusinessMetricsUseCase;
    const controller = new OpsController(opsUseCase, businessUseCase);
    const req = {} as unknown as express.Request;
    const res = buildRes();

    await controller.getBusinessMetrics(req, res);

    expect(businessUseCase.execute as jest.Mock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fake);
  });

  it('responds 500 when the use case throws', async () => {
    const opsUseCase = {} as unknown as GetOpsMetricsUseCase;
    const businessUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('stripe down')),
    } as unknown as GetBusinessMetricsUseCase;
    const controller = new OpsController(opsUseCase, businessUseCase);
    const req = {} as unknown as express.Request;
    const res = buildRes();
    const errSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await controller.getBusinessMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    errSpy.mockRestore();
  });
});

describe('OpsController.getReturnRateMetrics', () => {
  it('returns 500 when the use case is not configured', async () => {
    const opsUseCase = {} as unknown as GetOpsMetricsUseCase;
    const controller = new OpsController(opsUseCase);
    const req = {} as unknown as express.Request;
    const res = buildRes();

    await controller.getReturnRateMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });

  it('returns 200 with the use case result', async () => {
    const fakeResult = {
      overall: { '7d': 21, '14d': 34, '30d': 48 },
      by_source_type: [
        {
          source_type: 'page',
          cohort_size: 100,
          returned_7d: 21,
          returned_14d: 34,
          returned_30d: 48,
          return_rate_7d_pct: 21,
          return_rate_14d_pct: 34,
          return_rate_30d_pct: 48,
        },
      ],
      as_of: '2026-05-25T00:00:00.000Z',
    };
    const opsUseCase = {} as unknown as GetOpsMetricsUseCase;
    const returnRateUseCase = {
      execute: jest.fn().mockResolvedValue(fakeResult),
    } as unknown as GetReturnRateMetricsUseCase;
    const controller = new OpsController(
      opsUseCase,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      returnRateUseCase
    );
    const req = {} as unknown as express.Request;
    const res = buildRes();

    await controller.getReturnRateMetrics(req, res);

    expect(returnRateUseCase.execute as jest.Mock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeResult);
  });

  it('responds 500 when the use case throws', async () => {
    const opsUseCase = {} as unknown as GetOpsMetricsUseCase;
    const returnRateUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('db down')),
    } as unknown as GetReturnRateMetricsUseCase;
    const controller = new OpsController(
      opsUseCase,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      returnRateUseCase
    );
    const req = {} as unknown as express.Request;
    const res = buildRes();
    const errSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await controller.getReturnRateMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    errSpy.mockRestore();
  });
});

describe('OpsController.deleteInactiveUsers', () => {
  const buildController = (useCase: DeleteInactiveUsersUseCase) =>
    new OpsController(
      {} as unknown as GetOpsMetricsUseCase,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      useCase
    );

  it('defaults to a dry run when dryRun is not specified', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue({ count: 5, dryRun: true }),
    } as unknown as DeleteInactiveUsersUseCase;
    const controller = buildController(useCase);
    const req = { query: {} } as unknown as express.Request;
    const res = buildRes();

    await controller.deleteInactiveUsers(req, res);

    expect(useCase.execute as jest.Mock).toHaveBeenCalledWith(true);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 5, dryRun: true });
  });

  it('deletes for real only when dryRun=false is passed', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue({ count: 3, dryRun: false }),
    } as unknown as DeleteInactiveUsersUseCase;
    const controller = buildController(useCase);
    const req = { query: { dryRun: 'false' } } as unknown as express.Request;
    const res = buildRes();

    await controller.deleteInactiveUsers(req, res);

    expect(useCase.execute as jest.Mock).toHaveBeenCalledWith(false);
  });

  it('returns 500 when the use case is not configured', async () => {
    const controller = new OpsController({} as unknown as GetOpsMetricsUseCase);
    const req = { query: {} } as unknown as express.Request;
    const res = buildRes();

    await controller.deleteInactiveUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});
