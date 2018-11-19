/// <reference types="express" />
import { OperationObject, ReferenceObject, SchemaObject } from '@loopback/openapi-v3-types';
import { ResolvedRoute } from './router';
import { OperationArgs, Request, RequestBodyParserOptions } from './types';
export declare const QUERY_NOT_PARSED: {};
export declare type RequestBody = {
    value: any | undefined;
    coercionRequired?: boolean;
    mediaType?: string;
    schema?: SchemaObject | ReferenceObject;
};
/**
 * Parses the request to derive arguments to be passed in for the Application
 * controller method
 *
 * @param request Incoming HTTP request
 * @param route Resolved Route
 */
export declare function parseOperationArgs(request: Request, route: ResolvedRoute, options?: RequestBodyParserOptions): Promise<OperationArgs>;
export declare function loadRequestBodyIfNeeded(operationSpec: OperationObject, request: Request, options?: RequestBodyParserOptions): Promise<RequestBody>;
