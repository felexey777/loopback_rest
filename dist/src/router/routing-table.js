"use strict";
// Copyright IBM Corp. 2017, 2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const context_1 = require("@loopback/context");
const HttpErrors = require("http-errors");
const util_1 = require("util");
const express = require("express");
const assert = require("assert");
const debug = require('debug')('loopback:rest:routing-table');
const core_1 = require("@loopback/core");
const openapi_path_1 = require("./openapi-path");
const trie_router_1 = require("./trie-router");
/**
 * Routing table
 */
class RoutingTable {
    constructor(_router = new trie_router_1.TrieRouter()) {
        this._router = _router;
    }
    registerStaticAssets(path, rootDir, options) {
        if (!this._staticAssetsRoute) {
            this._staticAssetsRoute = new StaticAssetsRoute();
        }
        this._staticAssetsRoute.registerAssets(path, rootDir, options);
    }
    /**
     * Register a controller as the route
     * @param spec
     * @param controllerCtor
     * @param controllerFactory
     */
    registerController(spec, controllerCtor, controllerFactory) {
        assert(typeof spec === 'object' && !!spec, 'API specification must be a non-null object');
        if (!spec.paths || !Object.keys(spec.paths).length) {
            return;
        }
        debug('Registering Controller with API %s', util_1.inspect(spec, { depth: null }));
        const basePath = spec.basePath || '/';
        for (const p in spec.paths) {
            for (const verb in spec.paths[p]) {
                const opSpec = spec.paths[p][verb];
                const fullPath = RoutingTable.joinPath(basePath, p);
                const route = new ControllerRoute(verb, fullPath, opSpec, controllerCtor, controllerFactory);
                this.registerRoute(route);
            }
        }
    }
    static joinPath(basePath, path) {
        const fullPath = [basePath, path]
            .join('/') // Join by /
            .replace(/(\/){2,}/g, '/') // Remove extra /
            .replace(/\/$/, '') // Remove trailing /
            .replace(/^(\/)?/, '/'); // Add leading /
        return fullPath;
    }
    /**
     * Register a route
     * @param route A route entry
     */
    registerRoute(route) {
        // TODO(bajtos) handle the case where opSpec.parameters contains $ref
        // See https://github.com/strongloop/loopback-next/issues/435
        if (debug.enabled) {
            debug('Registering route %s %s -> %s(%s)', route.verb.toUpperCase(), route.path, route.describe(), describeOperationParameters(route.spec));
        }
        openapi_path_1.validateApiPath(route.path);
        this._router.add(route);
    }
    describeApiPaths() {
        const paths = {};
        for (const route of this._router.list()) {
            if (route.spec['x-visibility'] === 'undocumented')
                continue;
            if (!paths[route.path]) {
                paths[route.path] = {};
            }
            paths[route.path][route.verb] = route.spec;
        }
        return paths;
    }
    /**
     * Map a request to a route
     * @param request
     */
    find(request) {
        debug('Finding route %s for %s %s', request.method, request.path);
        const found = this._router.find(request);
        if (found) {
            debug('Route matched: %j', found);
            return found;
        }
        // this._staticAssetsRoute will be set only if app.static() was called
        if (this._staticAssetsRoute) {
            debug('No API route found for %s %s, trying to find a static asset', request.method, request.path);
            return this._staticAssetsRoute;
        }
        debug('No route found for %s %s', request.method, request.path);
        throw new HttpErrors.NotFound(`Endpoint "${request.method} ${request.path}" not found.`);
    }
}
exports.RoutingTable = RoutingTable;
/**
 * Base implementation of RouteEntry
 */
class BaseRoute {
    /**
     * Construct a new route
     * @param verb http verb
     * @param path http request path pattern
     * @param spec OpenAPI operation spec
     */
    constructor(verb, path, spec) {
        this.path = path;
        this.spec = spec;
        this.verb = verb.toLowerCase();
    }
    describe() {
        return `"${this.verb} ${this.path}"`;
    }
}
exports.BaseRoute = BaseRoute;
class StaticAssetsRoute {
    constructor() {
        // ResolvedRoute API
        this.pathParams = [];
        this.schemas = {};
        // RouteEntry implementation
        this.verb = 'get';
        this.path = '/*';
        this.spec = {
            description: 'LoopBack static assets route',
            'x-visibility': 'undocumented',
            responses: {},
        };
        this._expressRouter = express.Router();
    }
    registerAssets(path, rootDir, options) {
        this._expressRouter.use(path, express.static(rootDir, options));
    }
    updateBindings(requestContext) {
        // no-op
    }
    async invokeHandler({ request, response }, args) {
        const handled = await executeRequestHandler(this._expressRouter, request, response);
        if (!handled) {
            // Express router called next, which means no route was matched
            throw new HttpErrors.NotFound(`Endpoint "${request.method} ${request.path}" not found.`);
        }
    }
    describe() {
        return 'final route to handle static assets';
    }
}
exports.StaticAssetsRoute = StaticAssetsRoute;
/**
 * Execute an Express-style callback-based request handler.
 *
 * @param handler
 * @param request
 * @param response
 * @returns A promise resolved to:
 * - `true` when the request was handled
 * - `false` when the handler called `next()` to proceed to the next
 *    handler (middleware) in the chain.
 */
function executeRequestHandler(handler, request, response) {
    return new Promise((resolve, reject) => {
        const onceFinished = () => resolve(true);
        response.once('finish', onceFinished);
        handler(request, response, (err) => {
            response.removeListener('finish', onceFinished);
            if (err) {
                reject(err);
            }
            else {
                // Express router called next, which means no route was matched
                resolve(false);
            }
        });
    });
}
function createResolvedRoute(route, pathParams) {
    return Object.create(route, {
        pathParams: {
            writable: false,
            value: pathParams,
        },
        schemas: {
            value: {},
        },
    });
}
exports.createResolvedRoute = createResolvedRoute;
class Route extends BaseRoute {
    constructor(verb, path, spec, _handler) {
        super(verb, path, spec);
        this.spec = spec;
        this._handler = _handler;
    }
    describe() {
        return this._handler.name || super.describe();
    }
    updateBindings(requestContext) {
        // no-op
    }
    async invokeHandler(requestContext, args) {
        return await this._handler(...args);
    }
}
exports.Route = Route;
/**
 * A route backed by a controller
 */
class ControllerRoute extends BaseRoute {
    /**
     * Construct a controller based route
     * @param verb http verb
     * @param path http request path
     * @param spec OpenAPI operation spec
     * @param controllerCtor Controller class
     * @param controllerFactory A factory function to create a controller instance
     * @param methodName Controller method name, default to `x-operation-name`
     */
    constructor(verb, path, spec, controllerCtor, controllerFactory, methodName) {
        const controllerName = spec['x-controller-name'] || controllerCtor.name;
        methodName = methodName || spec['x-operation-name'];
        if (!methodName) {
            throw new Error('methodName must be provided either via the ControllerRoute argument ' +
                'or via "x-operation-name" extension field in OpenAPI spec. ' +
                `Operation: "${verb} ${path}" ` +
                `Controller: ${controllerName}.`);
        }
        super(verb, path, 
        // Add x-controller-name and x-operation-name if not present
        Object.assign({
            'x-controller-name': controllerName,
            'x-operation-name': methodName,
            tags: [controllerName],
        }, spec));
        this._controllerFactory =
            controllerFactory || createControllerFactoryForClass(controllerCtor);
        this._controllerCtor = controllerCtor;
        this._controllerName = controllerName || controllerCtor.name;
        this._methodName = methodName;
    }
    describe() {
        return `${this._controllerName}.${this._methodName}`;
    }
    updateBindings(requestContext) {
        requestContext
            .bind(core_1.CoreBindings.CONTROLLER_CURRENT)
            .toDynamicValue(() => this._controllerFactory(requestContext))
            .inScope(context_1.BindingScope.SINGLETON);
        requestContext.bind(core_1.CoreBindings.CONTROLLER_CLASS).to(this._controllerCtor);
        requestContext
            .bind(core_1.CoreBindings.CONTROLLER_METHOD_NAME)
            .to(this._methodName);
    }
    async invokeHandler(requestContext, args) {
        const controller = await requestContext.get('controller.current');
        if (typeof controller[this._methodName] !== 'function') {
            throw new HttpErrors.NotFound(`Controller method not found: ${this.describe()}`);
        }
        // Invoke the method with dependency injection
        return await context_1.invokeMethod(controller, this._methodName, requestContext, args);
    }
}
exports.ControllerRoute = ControllerRoute;
function describeOperationParameters(opSpec) {
    return (opSpec.parameters || [])
        .map(p => (p && p.name) || '')
        .join(', ');
}
/**
 * Create a controller factory function for a given binding key
 * @param key Binding key
 */
function createControllerFactoryForBinding(key) {
    return ctx => ctx.get(key);
}
exports.createControllerFactoryForBinding = createControllerFactoryForBinding;
/**
 * Create a controller factory function for a given class
 * @param controllerCtor Controller class
 */
function createControllerFactoryForClass(controllerCtor) {
    return async (ctx) => {
        // By default, we get an instance of the controller from the context
        // using `controllers.<controllerName>` as the key
        let inst = await ctx.get(`controllers.${controllerCtor.name}`, {
            optional: true,
        });
        if (inst === undefined) {
            inst = await context_1.instantiateClass(controllerCtor, ctx);
        }
        return inst;
    };
}
exports.createControllerFactoryForClass = createControllerFactoryForClass;
/**
 * Create a controller factory function for a given instance
 * @param controllerCtor Controller instance
 */
function createControllerFactoryForInstance(controllerInst) {
    return ctx => controllerInst;
}
exports.createControllerFactoryForInstance = createControllerFactoryForInstance;
//# sourceMappingURL=routing-table.js.map