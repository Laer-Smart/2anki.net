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

import { HttpClient, RequestParams } from "./http-client";

export class Unsubscribe<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Re-engagement
   * @name UnsubscribeList
   * @summary Unsubscribe from re-engagement emails
   * @request GET:/unsubscribe
   * @secure
   */
  unsubscribeList = (
    query: {
      uid: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<void, void>({
      path: `/unsubscribe`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
