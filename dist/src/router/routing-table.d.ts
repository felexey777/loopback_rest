/// <reference types="express" />
import { OperationObject, PathObject, SchemasObject } from '@loopback/openapi-v3-types';
import { Context, Constructor, ValueOrPromise } from '@loopback/context';
import { Request, PathParameterValues, OperationArgs, OperationRetval } from '../types';
import { ControllerSpec } from '@loopback/openapi-v3';
import { RequestContext } from '../request-context';
import { ServeStaticOptions } from 'serve-static';
import { PathParams } from 'express-serve-static-core';
/**
 * A controller instance with open properties/methods
 */
export declare type ControllerInstance = {
    [name: string]: any;
} & object;
/**
 * A factory function to create controller instances synchronously or
 * asynchronously
 */
export declare type ControllerFactory<T extends ControllerInstance> = (ctx: Context) => ValueOrPromise<T>;
/**
 * Controller class
 */
export declare type ControllerClass<T extends ControllerInstance> = Constructor<T>;
/**
 * Interface for router implementation
 */
export interface RestRouter {
    /**
     * Add a route to the router
     * @param route A route entry
     */
    add(route: RouteEntry): void;
    /**
     * Find a matching route for the given http request
     * @param request Http request
     * @returns The resolved route, if not found, `undefined` is returned
     */
    find(request: Request): ResolvedRoute | undefined;
    /**
     * List all routes
     */
    list(): RouteEntry[];
}
/**
 * Routing table
 */
export declare class RoutingTable {
    private readonly _router;
    constructor(_router?: RestRouter);
    private _staticAssetsRoute;
    registerStaticAssets(path: PathParams, rootDir: string, options?: ServeStaticOptions): void;
    /**
     * Register a controller as the route
     * @param spec
     * @param controllerCtor
     * @param controllerFactory
     */
    registerController<T>(spec: ControllerSpec, controllerCtor: ControllerClass<T>, controllerFactory?: ControllerFactory<T>): void;
    static joinPath(basePath: string, path: string): string;
    /**
     * Register a route
     * @param route A route entry
     */
    registerRoute(route: RouteEntry): void;
    describeApiPaths(): PathObject;
    /**
     * Map a request to a route
     * @param request
     */
    find(request: Request): ResolvedRoute;
}
/**
 * An entry in the routing table
 */
export interface RouteEntry {
    /**
     * http verb
     */
    readonly verb: string;
    /**
     * http path
     */
    readonly path: string;
    /**
     * OpenAPI operation spec
     */
    readonly spec: OperationObject;
    /**
     * Update bindings for the request context
     * @param requestContext
     */
    updateBindings(requestContext: Context): void;
    /**
     * A handler to invoke the resolved controller method
     * @param requestContext
     * @param args
     */
    invokeHandler(requestContext: Context, args: OperationArgs): Promise<OperationRetval>;
    describe(): string;
}
/**
 * A route with path parameters resolved
 */
export interface ResolvedRoute extends RouteEntry {
    readonly pathParams: PathParameterValues;
    /**
     * Server/application wide schemas shared by multiple routes,
     * e.g. model schemas. This is a temporary workaround for
     * missing support for $ref references, see
     * https://github.com/strongloop/loopback-next/issues/435
     */
    readonly schemas: SchemasObject;
}
/**
 * Base implementation of RouteEntry
 */
export declare abstract class BaseRoute implements RouteEntry {
    readonly path: string;
    readonly spec: OperationObject;
    readonly verb: string;
    /**
     * Construct a new route
     * @param verb http verb
     * @param path http request path pattern
     * @param spec OpenAPI operation spec
     */
    constructor(verb: string, path: string, spec: OperationObject);
    abstract updateBindings(requestContext: Context): void;
    abstract invokeHandler(requestContext: Context, args: OperationArgs): Promise<OperationRetval>;
    describe(): string;
}
export declare class StaticAssetsRoute implements RouteEntry, ResolvedRoute {
    readonly pathParams: PathParameterValues;
    readonly schemas: SchemasObject;
    readonly verb: string;
    readonly path: string;
    readonly spec: OperationObject;
    private readonly _expressRouter;
    registerAssets(path: PathParams, rootDir: string, options?: ServeStaticOptions): void;
    updateBindings(requestContext: Context): void;
    invokeHandler({ request, response }: RequestContext, args: OperationArgs): Promise<OperationRetval>;
    describe(): string;
}
export declare function createResolvedRoute(route: RouteEntry, pathParams: PathParameterValues): ResolvedRoute;
export declare class Route extends BaseRoute {
    readonly spec: OperationObject;
    protected readonly _handler: Function;
    constructor(verb: string, path: string, spec: OperationObject, _handler: Function);
    describe(): string;
    updateBindings(requestContext: Context): void;
    invokeHandler(requestContext: Context, args: OperationArgs): Promise<OperationRetval>;
}
/**
 * A route backed by a controller
 */
export declare class ControllerRoute<T> extends BaseRoute {
    protected readonly _controllerCtor: ControllerClass<T>;
    protected readonly _controllerName: string;
    protected readonly _methodName: string;
    protected readonly _controllerFactory: ControllerFactory<T>;
    /**
     * Construct a controller based route
     * @param verb http verb
     * @param path http request path
     * @param spec OpenAPI operation spec
     * @param controllerCtor Controller class
     * @param controllerFactory A factory function to create a controller instance
     * @param methodName Controller method name, default to `x-operation-name`
     */
    constructor(verb: string, path: string, spec: OperationObject, controllerCtor: ControllerClass<T>, controllerFactory?: ControllerFactory<T>, methodName?: string);
    describe(): string;
    updateBindings(requestContext: Context): void;
    invokeHandler(requestContext: Context, args: OperationArgs): Promise<OperationRetval>;
}
/**
 * Create a controller factory function for a given binding key
 * @param key Binding key
 */
export declare function createControllerFactoryForBinding<T>(key: string): ControllerFactory<T>;
/**
 * Create a controller factory function for a given class
 * @param controllerCtor Controller class
 */
export declare function createControllerFactoryForClass<T>(controllerCtor: ControllerClass<T>): ControllerFactory<T>;
/**
 * Create a controller factory function for a given instance
 * @param controllerCtor Controller instance
 */
export declare function createControllerFactoryForInstance<T>(controllerInst: T): ControllerFactory<T>;
