"use strict";
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const context_1 = require("@loopback/context");
const core_1 = require("@loopback/core");
const http_server_1 = require("@loopback/http-server");
const openapi_v3_1 = require("@loopback/openapi-v3");
const assert_1 = require("assert");
const cors = require("cors");
const debugFactory = require("debug");
const express = require("express");
const js_yaml_1 = require("js-yaml");
const http_handler_1 = require("./http-handler");
const keys_1 = require("./keys");
const parser_1 = require("./parser");
const router_1 = require("./router");
const sequence_1 = require("./sequence");
const debug = debugFactory('loopback:rest:server');
const SequenceActions = keys_1.RestBindings.SequenceActions;
// NOTE(bajtos) we cannot use `import * as cloneDeep from 'lodash/cloneDeep'
// because it produces the following TypeScript error:
//  Module '"(...)/node_modules/@types/lodash/cloneDeep/index"' resolves to
//  a non-module entity and cannot be imported using this construct.
const cloneDeep = require('lodash/cloneDeep');
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
let RestServer = class RestServer extends context_1.Context {
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
    constructor(app, config = {}) {
        super(app);
        // The route for static assets
        this._staticAssetRoute = new router_1.StaticAssetsRoute();
        // Can't check falsiness, 0 is a valid port.
        if (config.port == null) {
            config.port = 3000;
        }
        if (config.host == null) {
            // Set it to '' so that the http server will listen on all interfaces
            config.host = undefined;
        }
        config.openApiSpec = config.openApiSpec || {};
        config.openApiSpec.endpointMapping =
            config.openApiSpec.endpointMapping || OPENAPI_SPEC_MAPPING;
        config.apiExplorer = normalizeApiExplorerConfig(config.apiExplorer);
        this.config = config;
        this.bind(keys_1.RestBindings.PORT).to(config.port);
        this.bind(keys_1.RestBindings.HOST).to(config.host);
        this.bind(keys_1.RestBindings.PROTOCOL).to(config.protocol || 'http');
        this.bind(keys_1.RestBindings.HTTPS_OPTIONS).to(config);
        if (config.sequence) {
            this.sequence(config.sequence);
        }
        this._setupRequestHandler();
        this.bind(keys_1.RestBindings.HANDLER).toDynamicValue(() => this.httpHandler);
    }
    get httpHandler() {
        this._setupHandlerIfNeeded();
        return this._httpHandler;
    }
    get listening() {
        return this._httpServer ? this._httpServer.listening : false;
    }
    get url() {
        return this._httpServer && this._httpServer.url;
    }
    _setupRequestHandler() {
        this._expressApp = express();
        // Disable express' built-in query parser, we parse queries ourselves
        // Note that when disabled, express sets query to an empty object,
        // which makes it difficult for us to detect whether the query
        // has been parsed or not. At the same time, we want `request.query`
        // to remain as an object, because everybody in express ecosystem expects
        // that property to be defined. A static singleton object to the rescue!
        this._expressApp.set('query parser fn', (str) => parser_1.QUERY_NOT_PARSED);
        this.requestHandler = this._expressApp;
        // Allow CORS support for all endpoints so that users
        // can test with online SwaggerUI instance
        const corsOptions = this.config.cors || {
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            preflightContinue: false,
            optionsSuccessStatus: 204,
            maxAge: 86400,
            credentials: true,
        };
        this._expressApp.use(cors(corsOptions));
        // Set up endpoints for OpenAPI spec/ui
        this._setupOpenApiSpecEndpoints();
        // Mount our router & request handler
        this._expressApp.use((req, res, next) => {
            this._handleHttpRequest(req, res).catch(next);
        });
        // Mount our error handler
        this._expressApp.use((err, req, res, next) => {
            this._onUnhandledError(req, res, err);
        });
    }
    /**
     * Mount /openapi.json, /openapi.yaml for specs and /swagger-ui, /explorer
     * to redirect to externally hosted API explorer
     */
    _setupOpenApiSpecEndpoints() {
        // NOTE(bajtos) Regular routes are handled through Sequence.
        // IMO, this built-in endpoint should not run through a Sequence,
        // because it's not part of the application API itself.
        // E.g. if the app implements access/audit logs, I don't want
        // this endpoint to trigger a log entry. If the server implements
        // content-negotiation to support XML clients, I don't want the OpenAPI
        // spec to be converted into an XML response.
        const mapping = this.config.openApiSpec.endpointMapping;
        // Serving OpenAPI spec
        for (const p in mapping) {
            this._expressApp.use(p, (req, res) => this._serveOpenApiSpec(req, res, mapping[p]));
        }
        const explorerConfig = this.config.apiExplorer || {};
        if (explorerConfig.disabled) {
            debug('Redirect to swagger-ui was disabled by configuration.');
            return;
        }
        const explorerPaths = ['/swagger-ui', '/explorer'];
        debug('Setting up redirect to swagger-ui. URL paths: %j', explorerPaths);
        this._expressApp.get(explorerPaths, (req, res) => this._redirectToSwaggerUI(req, res));
    }
    _handleHttpRequest(request, response) {
        return this.httpHandler.handleRequest(request, response);
    }
    _setupHandlerIfNeeded() {
        // TODO(bajtos) support hot-reloading of controllers
        // after the app started. The idea is to rebuild the HttpHandler
        // instance whenever a controller was added/deleted.
        // See https://github.com/strongloop/loopback-next/issues/433
        if (this._httpHandler)
            return;
        /**
         * Check if there is custom router in the context
         */
        const router = this.getSync(keys_1.RestBindings.ROUTER, { optional: true });
        const routingTable = new router_1.RoutingTable(router, this._staticAssetRoute);
        this._httpHandler = new http_handler_1.HttpHandler(this, routingTable);
        for (const b of this.find('controllers.*')) {
            const controllerName = b.key.replace(/^controllers\./, '');
            const ctor = b.valueConstructor;
            if (!ctor) {
                throw new Error(`The controller ${controllerName} was not bound via .toClass()`);
            }
            const apiSpec = openapi_v3_1.getControllerSpec(ctor);
            if (!apiSpec) {
                // controller methods are specified through app.api() spec
                debug('Skipping controller %s - no API spec provided', controllerName);
                continue;
            }
            debug('Registering controller %s', controllerName);
            if (apiSpec.components && apiSpec.components.schemas) {
                this._httpHandler.registerApiDefinitions(apiSpec.components.schemas);
            }
            const controllerFactory = router_1.createControllerFactoryForBinding(b.key);
            this._httpHandler.registerController(apiSpec, ctor, controllerFactory);
        }
        for (const b of this.find('routes.*')) {
            // TODO(bajtos) should we support routes defined asynchronously?
            const route = this.getSync(b.key);
            this._httpHandler.registerRoute(route);
        }
        // TODO(bajtos) should we support API spec defined asynchronously?
        const spec = this.getSync(keys_1.RestBindings.API_SPEC);
        for (const path in spec.paths) {
            for (const verb in spec.paths[path]) {
                const routeSpec = spec.paths[path][verb];
                this._setupOperation(verb, path, routeSpec);
            }
        }
    }
    _setupOperation(verb, path, spec) {
        const handler = spec['x-operation'];
        if (typeof handler === 'function') {
            // Remove a field value that cannot be represented in JSON.
            // Start by creating a shallow-copy of the spec, so that we don't
            // modify the original spec object provided by user.
            spec = Object.assign({}, spec);
            delete spec['x-operation'];
            const route = new router_1.Route(verb, path, spec, handler);
            this._httpHandler.registerRoute(route);
            return;
        }
        const controllerName = spec['x-controller-name'];
        if (typeof controllerName === 'string') {
            const b = this.find(`controllers.${controllerName}`)[0];
            if (!b) {
                throw new Error(`Unknown controller ${controllerName} used by "${verb} ${path}"`);
            }
            const ctor = b.valueConstructor;
            if (!ctor) {
                throw new Error(`The controller ${controllerName} was not bound via .toClass()`);
            }
            const controllerFactory = router_1.createControllerFactoryForBinding(b.key);
            const route = new router_1.ControllerRoute(verb, path, spec, ctor, controllerFactory);
            this._httpHandler.registerRoute(route);
            return;
        }
        throw new Error(`There is no handler configured for operation "${verb} ${path}`);
    }
    async _serveOpenApiSpec(request, response, specForm) {
        specForm = specForm || { version: '3.0.0', format: 'json' };
        let specObj = this.getApiSpec();
        if (this.config.openApiSpec.setServersFromRequest) {
            specObj = Object.assign({}, specObj);
            specObj.servers = [{ url: this._getUrlForClient(request) }];
        }
        if (specForm.format === 'json') {
            const spec = JSON.stringify(specObj, null, 2);
            response.setHeader('content-type', 'application/json; charset=utf-8');
            response.end(spec, 'utf-8');
        }
        else {
            const yaml = js_yaml_1.safeDump(specObj, {});
            response.setHeader('content-type', 'text/yaml; charset=utf-8');
            response.end(yaml, 'utf-8');
        }
    }
    /**
     * Get the protocol for a request
     * @param request Http request
     */
    _getProtocolForRequest(request) {
        return ((request.get('x-forwarded-proto') || '').split(',')[0] ||
            request.protocol ||
            this.config.protocol ||
            'http');
    }
    /**
     * Parse the host:port string into an object for host and port
     * @param host The host string
     */
    _parseHostAndPort(host) {
        host = host || '';
        host = host.split(',')[0];
        const portPattern = /:([0-9]+)$/;
        const port = (host.match(portPattern) || [])[1] || '';
        host = host.replace(portPattern, '');
        return { host, port };
    }
    /**
     * Get the URL of the request sent by the client
     * @param request Http request
     */
    _getUrlForClient(request) {
        const protocol = this._getProtocolForRequest(request);
        // The host can be in one of the forms
        // [::1]:3000
        // [::1]
        // 127.0.0.1:3000
        // 127.0.0.1
        let { host, port } = this._parseHostAndPort(request.get('x-forwarded-host') || request.headers.host);
        const forwardedPort = (request.get('x-forwarded-port') || '').split(',')[0];
        port = forwardedPort || port;
        if (!host) {
            // No host detected from http headers. Use the configured values
            host = this.config.host;
            port = this.config.port == null ? '' : this.config.port.toString();
        }
        // clear default ports
        port = protocol === 'https' && port === '443' ? '' : port;
        port = protocol === 'http' && port === '80' ? '' : port;
        // add port number of present
        host += port !== '' ? ':' + port : '';
        return protocol + '://' + host;
    }
    async _redirectToSwaggerUI(request, response) {
        const config = this.config.apiExplorer;
        const protocol = this._getProtocolForRequest(request);
        const baseUrl = protocol === 'http' ? config.httpUrl : config.url;
        const openApiUrl = `${this._getUrlForClient(request)}/openapi.json`;
        const fullUrl = `${baseUrl}?url=${openApiUrl}`;
        response.redirect(308, fullUrl);
    }
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
    controller(controllerCtor) {
        return this.bind('controllers.' + controllerCtor.name).toClass(controllerCtor);
    }
    route(routeOrVerb, path, spec, controllerCtorOrHandler, controllerFactory, methodName) {
        if (typeof routeOrVerb === 'object') {
            const r = routeOrVerb;
            // Encode the path to escape special chars
            const encodedPath = encodeURIComponent(r.path).replace(/\./g, '%2E');
            return this.bind(`routes.${r.verb} ${encodedPath}`)
                .to(r)
                .tag('route');
        }
        if (!path) {
            throw new assert_1.AssertionError({
                message: 'path is required for a controller-based route',
            });
        }
        if (!spec) {
            throw new assert_1.AssertionError({
                message: 'spec is required for a controller-based route',
            });
        }
        if (arguments.length === 4) {
            if (!controllerCtorOrHandler) {
                throw new assert_1.AssertionError({
                    message: 'handler function is required for a handler-based route',
                });
            }
            return this.route(new router_1.Route(routeOrVerb, path, spec, controllerCtorOrHandler));
        }
        if (!controllerCtorOrHandler) {
            throw new assert_1.AssertionError({
                message: 'controller is required for a controller-based route',
            });
        }
        if (!methodName) {
            throw new assert_1.AssertionError({
                message: 'methodName is required for a controller-based route',
            });
        }
        return this.route(new router_1.ControllerRoute(routeOrVerb, path, spec, controllerCtorOrHandler, controllerFactory, methodName));
    }
    /**
     * Mount static assets to the REST server.
     * See https://expressjs.com/en/4x/api.html#express.static
     * @param path The path(s) to serve the asset.
     * See examples at https://expressjs.com/en/4x/api.html#path-examples
     * @param rootDir The root directory from which to serve static assets
     * @param options Options for serve-static
     */
    static(path, rootDir, options) {
        this._staticAssetRoute.registerAssets(path, rootDir, options);
    }
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
    api(spec) {
        return this.bind(keys_1.RestBindings.API_SPEC).to(spec);
    }
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
    getApiSpec() {
        const spec = this.getSync(keys_1.RestBindings.API_SPEC);
        const defs = this.httpHandler.getApiDefinitions();
        // Apply deep clone to prevent getApiSpec() callers from
        // accidentally modifying our internal routing data
        spec.paths = cloneDeep(this.httpHandler.describeApiPaths());
        if (defs) {
            spec.components = spec.components || {};
            spec.components.schemas = cloneDeep(defs);
        }
        return spec;
    }
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
    sequence(value) {
        this.bind(keys_1.RestBindings.SEQUENCE).toClass(value);
    }
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
    handler(handlerFn) {
        let SequenceFromFunction = class SequenceFromFunction extends sequence_1.DefaultSequence {
            // NOTE(bajtos) Unfortunately, we have to duplicate the constructor
            // in order for our DI/IoC framework to inject constructor arguments
            constructor(findRoute, parseParams, invoke, send, reject) {
                super(findRoute, parseParams, invoke, send, reject);
                this.findRoute = findRoute;
                this.parseParams = parseParams;
                this.invoke = invoke;
                this.send = send;
                this.reject = reject;
            }
            async handle(context) {
                await Promise.resolve(handlerFn(context, this));
            }
        };
        SequenceFromFunction = __decorate([
            __param(0, context_1.inject(SequenceActions.FIND_ROUTE)),
            __param(1, context_1.inject(SequenceActions.PARSE_PARAMS)),
            __param(2, context_1.inject(SequenceActions.INVOKE_METHOD)),
            __param(3, context_1.inject(SequenceActions.SEND)),
            __param(4, context_1.inject(SequenceActions.REJECT)),
            __metadata("design:paramtypes", [Function, Function, Function, Function, Function])
        ], SequenceFromFunction);
        this.sequence(SequenceFromFunction);
    }
    /**
     * Start this REST API's HTTP/HTTPS server.
     *
     * @returns {Promise<void>}
     * @memberof RestServer
     */
    async start() {
        // Setup the HTTP handler so that we can verify the configuration
        // of API spec, controllers and routes at startup time.
        this._setupHandlerIfNeeded();
        const port = await this.get(keys_1.RestBindings.PORT);
        const host = await this.get(keys_1.RestBindings.HOST);
        const protocol = await this.get(keys_1.RestBindings.PROTOCOL);
        const httpsOptions = await this.get(keys_1.RestBindings.HTTPS_OPTIONS);
        const serverOptions = {};
        if (protocol === 'https')
            Object.assign(serverOptions, httpsOptions);
        Object.assign(serverOptions, { port, host, protocol });
        this._httpServer = new http_server_1.HttpServer(this.requestHandler, serverOptions);
        await this._httpServer.start();
        this.bind(keys_1.RestBindings.PORT).to(this._httpServer.port);
        this.bind(keys_1.RestBindings.HOST).to(this._httpServer.host);
        this.bind(keys_1.RestBindings.URL).to(this._httpServer.url);
        debug('RestServer listening at %s', this._httpServer.url);
    }
    /**
     * Stop this REST API's HTTP/HTTPS server.
     *
     * @returns {Promise<void>}
     * @memberof RestServer
     */
    async stop() {
        // Kill the server instance.
        if (!this._httpServer)
            return;
        await this._httpServer.stop();
        this._httpServer = undefined;
    }
    _onUnhandledError(req, res, err) {
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end();
        }
        // It's the responsibility of the Sequence to handle any errors.
        // If an unhandled error escaped, then something very wrong happened
        // and it's best to crash the process immediately.
        process.nextTick(() => {
            throw err;
        });
    }
};
RestServer = __decorate([
    __param(0, context_1.inject(core_1.CoreBindings.APPLICATION_INSTANCE)),
    __param(1, context_1.inject(keys_1.RestBindings.CONFIG, { optional: true })),
    __metadata("design:paramtypes", [core_1.Application, Object])
], RestServer);
exports.RestServer = RestServer;
const OPENAPI_SPEC_MAPPING = {
    '/openapi.json': { version: '3.0.0', format: 'json' },
    '/openapi.yaml': { version: '3.0.0', format: 'yaml' },
};
function normalizeApiExplorerConfig(input) {
    const config = input || {};
    const url = config.url || 'https://explorer.loopback.io';
    config.httpUrl =
        config.httpUrl || config.url || 'http://explorer.loopback.io';
    config.url = url;
    return config;
}
//# sourceMappingURL=rest.server.js.map