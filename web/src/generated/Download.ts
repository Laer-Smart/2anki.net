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

import { Error } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Download<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Display the download page for a converted file
   *
   * @tags Download
   * @name DownloadDetail
   * @summary Get download page
   * @request GET:/download/{id}
   * @secure
   */
  downloadDetail = (id: string, params: RequestParams = {}) =>
    this.request<string, Error>({
      path: `/download/${id}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * @description Download multiple files as a bulk package (ZIP)
   *
   * @tags Download
   * @name BulkList
   * @summary Bulk download
   * @request GET:/download/{id}/bulk
   * @secure
   */
  bulkList = (id: string, params: RequestParams = {}) =>
    this.request<Blob, Error>({
      path: `/download/${id}/bulk`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * @description Download a specific file by ID and filename
   *
   * @tags Download
   * @name DownloadDetail2
   * @summary Download specific file
   * @request GET:/download/{id}/{filename}
   * @originalName downloadDetail
   * @duplicate
   * @secure
   */
  downloadDetail2 = (
    id: string,
    filename: string,
    params: RequestParams = {},
  ) =>
    this.request<Blob, Error>({
      path: `/download/${id}/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
}
