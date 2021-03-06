/// <reference types="node" />
import { Binding, Constructor, Context } from '@loopback/context';
import { Application, Server } from '@loopback/core';
import { HttpServer, HttpServerOptions } from '@loopback/http-server';
import { OpenApiSpec, OperationObject, ServerObject } from '@loopback/openapi-v3-types';
import * as cors from 'cors';
import * as express from 'express';
import { PathParams } from 'express-serve-static-core';
import { IncomingMessage, ServerResponse } from 'http';
import { ServeStaticOptions } from 'serve-static';
import { HttpHandler } from './http-handler';
import { ControllerClass, ControllerFactory, ControllerInstance, RouteEntry } from './router';
import { SequenceFunction, SequenceHandler } from './sequence';
import { Request, Response } from './types';
export declare type HttpRequestListener = (req: IncomingMessage, res: ServerResponse) => void;
export interface HttpServerLike {
    requestHandler: HttpRequestListener;
}
/**
 * A REST API server for use with Loopback.
 * Add this server to your application by importing the RestComponent.
 * ```ts
 * const app = new MyApplication();
 * app.component(RestComponent);
 * ```
 *
 * To add additional instances of RestServer to your application, use the
 * `.server` function:
 * ```ts
 * app.server(RestServer, 'nameOfYourServer');
 * ```
 *
 * By default, one instance of RestServer will be created when the RestComponent
 * is bootstrapped. This instance can be retrieved with
 * `app.getServer(RestServer)`, or by calling `app.get('servers.RestServer')`
 * Note that retrieving other instances of RestServer must be done using the
 * server's name:
 * ```ts
 * const server = await app.getServer('foo')
 * // OR
 * const server = await app.get('servers.foo');
 * ```
 *
 * @export
 * @class RestServer
 * @extends {Context}
 * @implements {Server}
 */
export declare class RestServer extends Context implements Server, HttpServerLike {
    /**
     * Handle incoming HTTP(S) request by invoking the corresponding
     * Controller method via the configured Sequence.
     *
     * @example
     *
     * ```ts
     * const app = new Application();
     * app.component(RestComponent);
     * // setup controllers, etc.
     *
     * const restServer = await app.getServer(RestServer);
     * const httpServer = http.createServer(restServer.requestHandler);
     * httpServer.listen(3000);
     * ```
     *
     * @param req The request.
     * @param res The response.
     */
    requestHandler: HttpRequestListener;
    readonly config: RestServerConfig;
    protected _httpHandler: HttpHandler;
    protected readonly httpHandler: HttpHandler;
    protected _httpServer: HttpServer | undefined;
    protected _expressApp: express.Application;
    readonly listening: boolean;
    readonly url: string | undefined;
    /**
     * @memberof RestServer
     * Creates an instance of RestServer.
     *
     * @param {Application} app The application instance (injected via
     * CoreBindings.APPLICATION_INSTANCE).
     * @param {RestServerConfig=} config The configuration options (injected via
     * RestBindings.CONFIG).
     *
     */
    constructor(app: Application, config?: RestServerConfig);
    protected _setupRequestHandler(): void;
    /**
     * Mount /openapi.json, /openapi.yaml for specs and /swagger-ui, /explorer
     * to redirect to externally hosted API explorer
     */
    protected _setupOpenApiSpecEndpoints(): void;
    protected _handleHttpRequest(request: Request, response: Response): Promise<void>;
    protected _setupHandlerIfNeeded(): void;
    private _setupOperation;
    private _serveOpenApiSpec;
    /**
     * Get the protocol for a request
     * @param request Http request
     */
    private _getProtocolForRequest;
    /**
     * Parse the host:port string into an object for host and port
     * @param host The host string
     */
    private _parseHostAndPort;
    /**
     * Get the URL of the request sent by the client
     * @param request Http request
     */
    private _getUrlForClient;
    private _redirectToSwaggerUI;
    /**
     * Register a controller class with this server.
     *
     * @param {Constructor} controllerCtor The controller class
     * (constructor function).
     * @returns {Binding} The newly created binding, you can use the reference to
     * further modify the binding, e.g. lock the value to prevent further
     * modifications.
     *
     * ```ts
     * class MyController {
     * }
     * app.controller(MyController).lock();
     * ```
     *
     */
    controller(controllerCtor: ControllerClass<ControllerInstance>): Binding;
    /**
     * Register a new Controller-based route.
     *
     * ```ts
     * class MyController {
     *   greet(name: string) {
     *     return `hello ${name}`;
     *   }
     * }
     * app.route('get', '/greet', operationSpec, MyController, 'greet');
     * ```
     *
     * @param verb HTTP verb of the endpoint
     * @param path URL path of the endpoint
     * @param spec The OpenAPI spec describing the endpoint (operation)
     * @param controllerCtor Controller constructor
     * @param controllerFactory A factory function to create controller instance
     * @param methodName The name of the controller method
     */
    route<I>(verb: string, path: string, spec: OperationObject, controllerCtor: ControllerClass<I>, controllerFactory: ControllerFactory<I>, methodName: string): Binding;
    /**
     * Register a new route invoking a handler function.
     *
     * ```ts
     * function greet(name: string) {
     *  return `hello ${name}`;
     * }
     * app.route('get', '/', operationSpec, greet);
     * ```
     *
     * @param verb HTTP verb of the endpoint
     * @param path URL path of the endpoint
     * @param spec The OpenAPI spec describing the endpoint (operation)
     * @param handler The function to invoke with the request parameters
     * described in the spec.
     */
    route(verb: string, path: string, spec: OperationObject, handler: Function): Binding;
    /**
     * Register a new generic route.
     *
     * ```ts
     * function greet(name: string) {
     *  return `hello ${name}`;
     * }
     * const route = new Route('get', '/', operationSpec, greet);
     * app.route(route);
     * ```
     *
     * @param route The route to add.
     */
    route(route: RouteEntry): Binding;
    private _staticAssetRoute;
    /**
     * Mount static assets to the REST server.
     * See https://expressjs.com/en/4x/api.html#express.static
     * @param path The path(s) to serve the asset.
     * See examples at https://expressjs.com/en/4x/api.html#path-examples
     * @param rootDir The root directory from which to serve static assets
     * @param options Options for serve-static
     */
    static(path: PathParams, rootDir: string, options?: ServeStaticOptions): void;
    /**
     * Set the OpenAPI specification that defines the REST API schema for this
     * server. All routes, parameter definitions and return types will be defined
     * in this way.
     *
     * Note that this will override any routes defined via decorators at the
     * controller level (this function takes precedent).
     *
     * @param {OpenApiSpec} spec The OpenAPI specification, as an object.
     * @returns {Binding}
     * @memberof RestServer
     */
    api(spec: OpenApiSpec): Binding;
    /**
     * Get the OpenAPI specification describing the REST API provided by
     * this application.
     *
     * This method merges operations (HTTP endpoints) from the following sources:
     *  - `app.api(spec)`
     *  - `app.controller(MyController)`
     *  - `app.route(route)`
     *  - `app.route('get', '/greet', operationSpec, MyController, 'greet')`
     */
    getApiSpec(): OpenApiSpec;
    /**
     * Configure a custom sequence class for handling incoming requests.
     *
     * ```ts
     * class MySequence implements SequenceHandler {
     *   constructor(
     *     @inject('send) public send: Send)) {
     *   }
     *
     *   public async handle({response}: RequestContext) {
     *     send(response, 'hello world');
     *   }
     * }
     * ```
     *
     * @param value The sequence to invoke for each incoming request.
     */
    sequence(value: Constructor<SequenceHandler>): void;
    /**
     * Configure a custom sequence function for handling incoming requests.
     *
     * ```ts
     * app.handler(({request, response}, sequence) => {
     *   sequence.send(response, 'hello world');
     * });
     * ```
     *
     * @param handlerFn The handler to invoke for each incoming request.
     */
    handler(handlerFn: SequenceFunction): void;
    /**
     * Start this REST API's HTTP/HTTPS server.
     *
     * @returns {Promise<void>}
     * @memberof RestServer
     */
    start(): Promise<void>;
    /**
     * Stop this REST API's HTTP/HTTPS server.
     *
     * @returns {Promise<void>}
     * @memberof RestServer
     */
    stop(): Promise<void>;
    protected _onUnhandledError(req: Request, res: Response, err: Error): void;
}
/**
 * The form of OpenAPI specs to be served
 *
 * @interface OpenApiSpecForm
 */
export interface OpenApiSpecForm {
    version?: string;
    format?: string;
}
/**
 * Options to customize how OpenAPI specs are served
 */
export interface OpenApiSpecOptions {
    /**
     * Mapping of urls to spec forms, by default:
     * ```
     * {
     *   '/openapi.json': {version: '3.0.0', format: 'json'},
     *   '/openapi.yaml': {version: '3.0.0', format: 'yaml'},
     * }
     * ```
     */
    endpointMapping?: {
        [key: string]: OpenApiSpecForm;
    };
    /**
     * A flag to force `servers` to be set from the http request for the OpenAPI
     * spec
     */
    setServersFromRequest?: boolean;
    /**
     * Configure servers for OpenAPI spec
     */
    servers?: ServerObject[];
}
export interface ApiExplorerOptions {
    /**
     * URL for the hosted API explorer UI
     * default to https://loopback.io/api-explorer
     */
    url?: string;
    /**
     * URL for the API explorer served over `http` protocol to deal with mixed
     * content security imposed by browsers as the spec is exposed over `http` by
     * default.
     * See https://github.com/strongloop/loopback-next/issues/1603
     */
    httpUrl?: string;
    /**
     * Set this flag to disable the built-in redirect to externally
     * hosted API Explorer UI.
     */
    disabled?: true;
}
/**
 * Options for RestServer configuration
 */
export interface RestServerOptions {
    cors?: cors.CorsOptions;
    openApiSpec?: OpenApiSpecOptions;
    apiExplorer?: ApiExplorerOptions;
    sequence?: Constructor<SequenceHandler>;
}
/**
 * Valid configuration for the RestServer constructor.
 *
 * @export
 * @interface RestServerConfig
 */
export declare type RestServerConfig = RestServerOptions & HttpServerOptions;
