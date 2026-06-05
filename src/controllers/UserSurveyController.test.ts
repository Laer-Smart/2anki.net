import { Request, Response } from 'express';
import { UserSurveyController } from './UserSurveyController';
import {
  InMemoryUserSurveyRepository,
  IUserSurveyRepository,
} from '../data_layer/UserSurveyRepository';
import { ShouldShowSurveyUseCase } from '../usecases/surveys/ShouldShowSurveyUseCase';
import { RecordSurveyResponseUseCase } from '../usecases/surveys/RecordSurveyResponseUseCase';

const mockResponse = (owner: unknown) => {
  const res = {} as Response;
  res.locals = { owner };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (body: unknown) => {
  return { body } as Request;
};

const buildController = (repository: IUserSurveyRepository) => {
  return new UserSurveyController(
    new ShouldShowSurveyUseCase(repository),
    new RecordSurveyResponseUseCase(repository)
  );
};

describe('UserSurveyController', () => {
  describe('shouldShow', () => {
    it('returns 401 when no owner is present', async () => {
      const controller = buildController(new InMemoryUserSurveyRepository());
      const res = mockResponse(null);

      await controller.shouldShow(mockRequest({}), res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated.' });
    });

    it('returns shouldShow true for a user with no prior row', async () => {
      const controller = buildController(new InMemoryUserSurveyRepository());
      const res = mockResponse(42);

      await controller.shouldShow(mockRequest({}), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shouldShow: true });
    });

    it('returns shouldShow false once a row exists', async () => {
      const repository = new InMemoryUserSurveyRepository();
      await repository.upsert('42', 'post_login_v1', {
        improvement: null,
        studying: null,
        status: 'dismissed',
      });
      const controller = buildController(repository);
      const res = mockResponse(42);

      await controller.shouldShow(mockRequest({}), res);

      expect(res.json).toHaveBeenCalledWith({ shouldShow: false });
    });
  });

  describe('submit', () => {
    it('returns 401 when no owner is present', async () => {
      const controller = buildController(new InMemoryUserSurveyRepository());
      const res = mockResponse(null);

      await controller.submit(mockRequest({ status: 'answered' }), res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 on an invalid status', async () => {
      const controller = buildController(new InMemoryUserSurveyRepository());
      const res = mockResponse(42);

      await controller.submit(mockRequest({ status: 'nope' }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid status.' });
    });

    it('returns 400 when improvement is not a string', async () => {
      const controller = buildController(new InMemoryUserSurveyRepository());
      const res = mockResponse(42);

      await controller.submit(
        mockRequest({ status: 'answered', improvement: 5 }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 201 on an answered submission with only improvement', async () => {
      const repository = new InMemoryUserSurveyRepository();
      const controller = buildController(repository);
      const res = mockResponse(42);

      await controller.submit(
        mockRequest({ status: 'answered', improvement: 'More themes' }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Thanks for the input.',
      });
      expect(repository.getData('42', 'post_login_v1')).toEqual({
        status: 'answered',
        improvement: 'More themes',
        studying: null,
      });
    });

    it('returns 201 on a dismissal with no text', async () => {
      const repository = new InMemoryUserSurveyRepository();
      const controller = buildController(repository);
      const res = mockResponse(42);

      await controller.submit(mockRequest({ status: 'dismissed' }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(repository.getData('42', 'post_login_v1')).toEqual({
        status: 'dismissed',
        improvement: null,
        studying: null,
      });
    });

    it('never echoes raw row fields in the response body', async () => {
      const controller = buildController(new InMemoryUserSurveyRepository());
      const res = mockResponse(42);

      await controller.submit(
        mockRequest({ status: 'answered', studying: 'Science' }),
        res
      );

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(Object.keys(body)).toEqual(['message']);
    });
  });
});
