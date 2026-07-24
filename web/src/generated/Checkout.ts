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

export class Checkout<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Redirects the recovery-email recipient back to their expired Stripe Checkout session via the Stripe-hosted recovery URL. The token is the single-use UUID minted when the recovery email was sent. Unknown, malformed, or expired tokens fall back to the pricing page — the endpoint never fails user-visibly.
   *
   * @tags Payments
   * @name ResumeList
   * @summary Resume an abandoned Stripe checkout
   * @request GET:/checkout/resume
   * @secure
   */
  resumeList = (
    query?: {
      /**
       * Recovery token from the abandoned-checkout email
       * @format uuid
       */
      token?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<any, void>({
      path: `/checkout/resume`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
