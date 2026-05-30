import {
  UsersId,
} from './Users';

/** Identifier type for public.user_surveys */
export type UserSurveysId = number & { __brand: 'public.user_surveys' };

/** Represents the table public.user_surveys */
export default interface UserSurveysTable {
  id: UserSurveysId;
  user_id: UsersId;
  survey_key: string;
  improvement: string | null;
  studying: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}
