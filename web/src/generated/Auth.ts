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

export class Auth<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description form_post callback from Apple. Verifies state, exchanges code for id_token, signs the user in.
   *
   * @tags Authentication
   * @name AppleCallbackCreate
   * @summary Apple OAuth callback
   * @request POST:/auth/apple/callback
   * @secure
   */
  appleCallbackCreate = (params: RequestParams = {}) =>
    this.request<any, void>({
      path: `/auth/apple/callback`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * @description Accepts an Apple identity token from a native ASAuthorizationController flow, verifies it against Apple's JWKS using the App ID audience (APPLE_NATIVE_CLIENT_ID), and issues a session cookie. Does not use the web OAuth code flow.
   *
   * @tags Authentication
   * @name AppleNativeCreate
   * @summary Apple Sign In from native iOS/macOS clients
   * @request POST:/auth/apple/native
   * @secure
   */
  appleNativeCreate = (
    data: {
      identityToken: string;
      email?: string;
      fullName?: {
        givenName?: string;
        familyName?: string;
      };
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        ok?: boolean;
      },
      void
    >({
      path: `/auth/apple/native`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
}
