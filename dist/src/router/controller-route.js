"use strict";
// Copyright IBM Corp. 2017, 2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const context_1 = require("@loopback/context");
const core_1 = require("@loopback/core");
const HttpErrors = require("http-errors");
const base_route_1 = require("./base-route");
/**
 * A route backed by a controller
 */
class ControllerRoute extends base_route_1.BaseRoute {
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
//# sourceMappingURL=controller-route.js.map