/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Feedback<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Re-engagement
   * @name OnboardingList
   * @summary Validate a re-engagement survey token
   * @request GET:/feedback/onboarding
   * @secure
   */
  onboardingList = (
    query: {
      uid: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<void, void>({
      path: `/feedback/onboarding`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Re-engagement
   * @name OnboardingCreate
   * @summary Submit re-engagement survey feedback
   * @request POST:/feedback/onboarding
   * @secure
   */
  onboardingCreate = (
    data: {
      token: string;
      stoppedReason: string;
      contentType: string;
      comment?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<void, void>({
      path: `/feedback/onboarding`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
}
