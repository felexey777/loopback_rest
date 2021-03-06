"use strict";
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@loopback/core");
const util_1 = require("util");
const keys_1 = require("./keys");
const rest_component_1 = require("./rest.component");
exports.ERR_NO_MULTI_SERVER = util_1.format('RestApplication does not support multiple servers!', 'To create your own server bindings, please extend the Application class.');
// To help cut down on verbosity!
exports.SequenceActions = keys_1.RestBindings.SequenceActions;
/**
 * An implementation of the Application class that automatically provides
 * an instance of a REST server. This application class is intended to be
 * a single-server implementation. Any attempt to bind additional servers
 * will throw an error.
 *
 */
class RestApplication extends core_1.Application {
    /**
     * The main REST server instance providing REST API for this application.
     */
    get restServer() {
        // FIXME(kjdelisle): I attempted to mimic the pattern found in RestServer
        // with no success, so until I've got a better way, this is functional.
        return this.getSync('servers.RestServer');
    }
    /**
     * Handle incoming HTTP(S) request by invoking the corresponding
     * Controller method via the configured Sequence.
     *
     * @example
     *
     * ```ts
     * const app = new RestApplication();
     * // setup controllers, etc.
     *
     * const server = http.createServer(app.requestHandler);
     * server.listen(3000);
     * ```
     *
     * @param req The request.
     * @param res The response.
     */
    get requestHandler() {
        return this.restServer.requestHandler;
    }
    constructor(config = {}) {
        super(config);
        this.component(rest_component_1.RestComponent);
    }
    server(server, name) {
        if (this.findByTag('server').length > 0) {
            throw new Error(exports.ERR_NO_MULTI_SERVER);
        }
        return super.server(server, name);
    }
    sequence(sequence) {
        return this.bind(keys_1.RestBindings.SEQUENCE).toClass(sequence);
    }
    handler(handlerFn) {
        this.restServer.handler(handlerFn);
    }
    /**
     * Mount static assets to the REST server.
     * See https://expressjs.com/en/4x/api.html#express.static
     * @param path The path(s) to serve the asset.
     * See examples at https://expressjs.com/en/4x/api.html#path-examples
     * To avoid performance penalty, `/` is not allowed for now.
     * @param rootDir The root directory from which to serve static assets
     * @param options Options for serve-static
     */
    static(path, rootDir, options) {
        this.restServer.static(path, rootDir, options);
    }
    route(routeOrVerb, path, spec, controllerCtorOrHandler, controllerFactory, methodName) {
        const server = this.restServer;
        if (typeof routeOrVerb === 'object') {
            return server.route(routeOrVerb);
        }
        else if (arguments.length === 4) {
            return server.route(routeOrVerb, path, spec, controllerCtorOrHandler);
        }
        else {
            return server.route(routeOrVerb, path, spec, controllerCtorOrHandler, controllerFactory, methodName);
        }
    }
    /**
     * Set the OpenAPI specification that defines the REST API schema for this
     * application. All routes, parameter definitions and return types will be
     * defined in this way.
     *
     * Note that this will override any routes defined via decorators at the
     * controller level (this function takes precedent).
     *
     * @param {OpenApiSpec} spec The OpenAPI specification, as an object.
     * @returns {Binding}
     */
    api(spec) {
        return this.bind(keys_1.RestBindings.API_SPEC).to(spec);
    }
}
exports.RestApplication = RestApplication;
//# sourceMappingURL=rest.application.js.map