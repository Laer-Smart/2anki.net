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

export class WellKnown<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Plain-text contact and policy details for security researchers.
   *
   * @tags WellKnown
   * @name SecurityTxtList
   * @summary RFC 9116 security disclosure metadata
   * @request GET:/.well-known/security.txt
   * @secure
   */
  securityTxtList = (params: RequestParams = {}) =>
    this.request<string, any>({
      path: `/.well-known/security.txt`,
      method: "GET",
      secure: true,
      ...params,
    });
}
