import express from 'express';

jest.mock('../../../data_layer', () => ({
  getDatabase: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../services/EmailService/EmailService', () => ({
  getDefaultEmailService: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../data_layer/UsersRepository');
jest.mock('../../../services/UsersService');

jest.mock('../../../lib/integrations/stripe', () => ({
  getStripe: jest.fn().mockReturnValue({
    customers: { retrieve: jest.fn() },
  }),
  updateStoreSubscription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/SubscriptionService', () => ({
  __esModule: true,
  default: {
    findActiveStripeSubscriptions: jest.fn(),
  },
}));

import { handleUploadLimitError } from './handleUploadLimitError';
import UsersService from '../../../services/UsersService';
import SubscriptionService from '../../../services/SubscriptionService';
import {
  getStripe,
  updateStoreSubscription,
} from '../../../lib/integrations/stripe';

const mockedFindActive =
  SubscriptionService.findActiveStripeSubscriptions as jest.MockedFunction<
    typeof SubscriptionService.findActiveStripeSubscriptions
  >;
const mockedUpdateStoreSubscription =
  updateStoreSubscription as jest.MockedFunction<
    typeof updateStoreSubscription
  >;
const mockedStripe = getStripe() as any;

function mockResponse(owner?: string): express.Response {
  return {
    locals: { owner },
    redirect: jest.fn(),
  } as unknown as express.Response;
}

function mockRequest(): express.Request {
  return {} as express.Request;
}

describe('handleUploadLimitError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users to /limit with file_size kind by default', async () => {
    const res = mockResponse(undefined);
    await handleUploadLimitError(mockRequest(), res);
    expect(res.redirect).toHaveBeenCalledWith('/limit?kind=file_size');
  });

  it('redirects with card_count kind when error message matches', async () => {
    const res = mockResponse(undefined);
    await handleUploadLimitError(
      mockRequest(),
      res,
      new Error('You can only add 100 cards')
    );
    expect(res.redirect).toHaveBeenCalledWith('/limit?kind=card_count');
  });

  it('redirects authenticated users with no Stripe subscription to /limit?kind=file_size', async () => {
    (
      UsersService as jest.MockedClass<typeof UsersService>
    ).prototype.getUserById = jest
      .fn()
      .mockResolvedValue({ id: '1', email: 'user@example.com' });
    mockedFindActive.mockResolvedValue([]);

    const res = mockResponse('owner-1');
    await handleUploadLimitError(
      mockRequest(),
      res,
      new Error('File too large')
    );

    expect(res.redirect).toHaveBeenCalledWith('/limit?kind=file_size');
  });

  it('redirects authenticated users with card_count error to /limit?kind=card_count', async () => {
    (
      UsersService as jest.MockedClass<typeof UsersService>
    ).prototype.getUserById = jest
      .fn()
      .mockResolvedValue({ id: '1', email: 'user@example.com' });
    mockedFindActive.mockResolvedValue([]);

    const res = mockResponse('owner-1');
    await handleUploadLimitError(
      mockRequest(),
      res,
      new Error('You can only add 100 cards')
    );

    expect(res.redirect).toHaveBeenCalledWith('/limit?kind=card_count');
  });

  it('syncs subscription and redirects to upload when active Stripe sub exists but is missing from DB', async () => {
    (
      UsersService as jest.MockedClass<typeof UsersService>
    ).prototype.getUserById = jest
      .fn()
      .mockResolvedValue({ id: '1', email: 'user@example.com' });
    const fakeSub = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
    } as any;
    mockedFindActive.mockResolvedValue([fakeSub]);
    mockedStripe.customers.retrieve.mockResolvedValue({
      id: 'cus_123',
      email: 'user@example.com',
    });

    const res = mockResponse('owner-1');
    await handleUploadLimitError(mockRequest(), res);

    expect(mockedUpdateStoreSubscription).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/upload');
  });

  it('falls back to /limit?kind=file_size when Stripe call throws', async () => {
    (
      UsersService as jest.MockedClass<typeof UsersService>
    ).prototype.getUserById = jest
      .fn()
      .mockResolvedValue({ id: '1', email: 'user@example.com' });
    mockedFindActive.mockRejectedValue(new Error('Stripe unavailable'));

    const res = mockResponse('owner-1');
    await handleUploadLimitError(mockRequest(), res);

    expect(res.redirect).toHaveBeenCalledWith('/limit?kind=file_size');
  });
});
