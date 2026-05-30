import { Router } from 'express';
import { getDatabase } from '../data_layer';
import { UserSurveyController } from '../controllers/UserSurveyController';
import { UserSurveyRepository } from '../data_layer/UserSurveyRepository';
import { ShouldShowSurveyUseCase } from '../usecases/surveys/ShouldShowSurveyUseCase';
import { RecordSurveyResponseUseCase } from '../usecases/surveys/RecordSurveyResponseUseCase';
import RequireAuthentication from './middleware/RequireAuthentication';

/**
 * @swagger
 * /api/surveys/post-login:
 *   get:
 *     summary: Check whether the post-login survey should be shown
 *     tags: [Surveys]
 *     responses:
 *       200:
 *         description: Whether to show the survey for this user
 *   post:
 *     summary: Record a post-login survey response or dismissal
 *     tags: [Surveys]
 *     responses:
 *       201:
 *         description: Response recorded
 */
function userSurveyRouter(): Router {
  const router = Router();
  const repository = new UserSurveyRepository(getDatabase());
  const shouldShowUseCase = new ShouldShowSurveyUseCase(repository);
  const recordUseCase = new RecordSurveyResponseUseCase(repository);
  const controller = new UserSurveyController(shouldShowUseCase, recordUseCase);

  router.get('/api/surveys/post-login', RequireAuthentication, (req, res) =>
    controller.shouldShow(req, res)
  );

  router.post('/api/surveys/post-login', RequireAuthentication, (req, res) =>
    controller.submit(req, res)
  );

  return router;
}

export default userSurveyRouter;
