"use strict";
// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../");
/**
 * Validator class provides a bunch of functions that perform
 * validations on the request parameters and request body.
 */
class Validator {
    constructor(ctx) {
        this.ctx = ctx;
    }
    /**
     * The validation executed before type coercion. Like
     * checking absence.
     *
     * @param type A parameter's type.
     * @param value A parameter's raw value from http request.
     * @param opts options
     */
    validateParamBeforeCoercion(value, opts) {
        if (this.isAbsent(value) && this.isRequired(opts)) {
            const name = this.ctx.parameterSpec.name;
            throw __1.RestHttpErrors.missingRequired(name);
        }
    }
    /**
     * Check is a parameter required or not.
     *
     * @param opts
     */
    isRequired(opts) {
        if (this.ctx.parameterSpec.required)
            return true;
        if (opts && opts.required)
            return true;
        return false;
    }
    /**
     * Return `true` if the value is empty, return `false` otherwise.
     *
     * @param value
     */
    // tslint:disable-next-line:no-any
    isAbsent(value) {
        if (value === '' || value === undefined)
            return true;
        const schema = this.ctx.parameterSpec.schema || {};
        if (schema.type === 'object' && value === 'null')
            return true;
        return false;
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map