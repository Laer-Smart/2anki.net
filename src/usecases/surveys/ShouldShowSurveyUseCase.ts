import { IUserSurveyRepository } from '../../data_layer/UserSurveyRepository';

export class ShouldShowSurveyUseCase {
  constructor(
    private readonly repository: IUserSurveyRepository,
    private readonly surveyKey = 'post_login_v1'
  ) {}

  async execute(userId: string): Promise<boolean> {
    const existing = await this.repository.findByUserAndKey(
      userId,
      this.surveyKey
    );
    if (existing == null) {
      return true;
    }
    return false;
  }
}
