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

export class R<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Records an `email_clicked` analytics event then 302s the user to a validated destination. Destination is checked against a static allowlist (`/`, `/upload`, `/pricing`, `/login`); unknown values fall back to `/`. Unknown or missing tokens record an anonymous click and still redirect — never fails user-visibly.
   *
   * @tags Email
   * @name EmailList
   * @summary Email click redirect
   * @request GET:/r/email
   * @secure
   */
  emailList = (
    query?: {
      /** Email token from inactivity_emails.token or re_engagement_emails.token */
      t?: string;
      /** Campaign — disambiguates which table to resolve the token against */
      c?: "inactivity" | "reengagement";
      /** Destination path (allowlisted); falls back to `/` if unknown */
      to?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<any, void>({
      path: `/r/email`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
