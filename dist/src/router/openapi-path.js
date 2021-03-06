"use strict";
// Copyright IBM Corp. 2017, 2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const pathToRegExp = require("path-to-regexp");
/**
 * OpenAPI spec 3.x does not specify the valid forms of path templates.
 *
 * Other ones such as [URI Template](https://tools.ietf.org/html/rfc6570#section-2.3)
 * or [path-to-regexp](https://github.com/pillarjs/path-to-regexp#named-parameters)
 * allows `[A-Za-z0-9_]`
 */
const POSSIBLE_VARNAME_PATTERN = /\{([^\}]+)\}/g;
const INVALID_VARNAME_PATTERN = /\{([^\}]*[^\w\}][^\}]*)\}/;
/**
 * Validate the path to be compatible with OpenAPI path template. No parameter
 * modifier, custom pattern, or unnamed parameter is allowed.
 */
function validateApiPath(path = '/') {
    let tokens = pathToRegExp.parse(path);
    if (tokens.some(t => typeof t === 'object')) {
        throw new Error(`Invalid path template: '${path}'. Please use {param} instead of ':param'`);
    }
    const invalid = path.match(INVALID_VARNAME_PATTERN);
    if (invalid) {
        throw new Error(`Invalid parameter name '${invalid[1]}' found in path '${path}'`);
    }
    const regexpPath = path.replace(POSSIBLE_VARNAME_PATTERN, ':$1');
    tokens = pathToRegExp.parse(regexpPath);
    for (const token of tokens) {
        if (typeof token === 'string')
            continue;
        if (typeof token.name === 'number') {
            // Such as /(.*)
            throw new Error(`Unnamed parameter is not allowed in path '${path}'`);
        }
        if (token.optional || token.repeat || token.pattern !== '[^\\/]+?') {
            // Such as /:foo*, /:foo+, /:foo?, or /:foo(\\d+)
            throw new Error(`Parameter modifier is not allowed in path '${path}'`);
        }
    }
    return path;
}
exports.validateApiPath = validateApiPath;
/**
 * Get all path variables. For example, `/root/{foo}/bar` => `['foo']`
 */
function getPathVariables(path) {
    return path.match(POSSIBLE_VARNAME_PATTERN);
}
exports.getPathVariables = getPathVariables;
/**
 * Convert an OpenAPI path to Express (path-to-regexp) style
 * @param path OpenAPI path with optional variables as `{var}`
 */
function toExpressPath(path) {
    return path.replace(POSSIBLE_VARNAME_PATTERN, ':$1');
}
exports.toExpressPath = toExpressPath;
//# sourceMappingURL=openapi-path.js.map