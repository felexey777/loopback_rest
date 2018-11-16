/// <reference types="express" />
import { Context } from '@loopback/context';
import { PathObject, SchemasObject } from '@loopback/openapi-v3-types';
import { ControllerSpec } from '@loopback/openapi-v3';
import { RoutingTable, ResolvedRoute, RouteEntry, ControllerClass, ControllerFactory } from './router/routing-table';
import { Request, Response } from './types';
import { PathParams } from 'express-serve-static-core';
import { ServeStaticOptions } from 'serve-static';
export declare class HttpHandler {
    protected _rootContext: Context;
    protected _routes: RoutingTable;
    protected _apiDefinitions: SchemasObject;
    handleRequest: (request: Request, response: Response) => Promise<void>;
    constructor(_rootContext: Context, _routes?: RoutingTable);
    registerController<T>(spec: ControllerSpec, controllerCtor: ControllerClass<T>, controllerFactory?: ControllerFactory<T>): void;
    registerRoute(route: RouteEntry): void;
    registerApiDefinitions(defs: SchemasObject): void;
    registerStaticAssets(path: PathParams, rootDir: string, options?: ServeStaticOptions): void;
    getApiDefinitions(): SchemasObject;
    describeApiPaths(): PathObject;
    findRoute(request: Request): ResolvedRoute;
    protected _handleRequest(request: Request, response: Response): Promise<void>;
}