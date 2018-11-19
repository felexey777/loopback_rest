"use strict";
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const openapi_v3_1 = require("@loopback/openapi-v3");
const openapi_v3_types_1 = require("@loopback/openapi-v3-types");
const debugModule = require("debug");
const parseUrl = require("parseurl");
const qs_1 = require("qs");
const util_1 = require("util");
const coerce_parameter_1 = require("./coercion/coerce-parameter");
const rest_http_error_1 = require("./rest-http-error");
const request_body_validator_1 = require("./validation/request-body.validator");
const type_is_1 = require("type-is");
const qs = require("qs");
const debug = debugModule('loopback:rest:parser');
exports.QUERY_NOT_PARSED = {};
Object.freeze(exports.QUERY_NOT_PARSED);
const parseJsonBody = util_1.promisify(require('body/json'));
const parseFormBody = util_1.promisify(require('body/form'));
/**
 * Get the content-type header value from the request
 * @param req Http request
 */
function getContentType(req) {
    return req.get('content-type');
}
/**
 * Parses the request to derive arguments to be passed in for the Application
 * controller method
 *
 * @param request Incoming HTTP request
 * @param route Resolved Route
 */
async function parseOperationArgs(request, route, options = {}) {
    debug('Parsing operation arguments for route %s', route.describe());
    const operationSpec = route.spec;
    const pathParams = route.pathParams;
    const body = await loadRequestBodyIfNeeded(operationSpec, request, options);
    return buildOperationArguments(operationSpec, request, pathParams, body, route.schemas);
}
exports.parseOperationArgs = parseOperationArgs;
function normalizeParsingError(err) {
    debug('Cannot parse request body %j', err);
    if (!err.statusCode || err.statusCode >= 500) {
        err.statusCode = 400;
    }
    return err;
}
async function loadRequestBodyIfNeeded(operationSpec, request, options = {}) {
    const requestBody = {
        value: undefined,
    };
    if (!operationSpec.requestBody)
        return Promise.resolve(requestBody);
    debug('Request body parser options: %j', options);
    const contentType = getContentType(request) || 'application/json';
    debug('Loading request body with content type %j', contentType);
    // the type of `operationSpec.requestBody` could be `RequestBodyObject`
    // or `ReferenceObject`, resolving a `$ref` value is not supported yet.
    if (openapi_v3_types_1.isReferenceObject(operationSpec.requestBody)) {
        throw new Error('$ref requestBody is not supported yet.');
    }
    let content = operationSpec.requestBody.content || {};
    if (!Object.keys(content).length) {
        content = {
            // default to allow json and urlencoded
            'application/json': { schema: { type: 'object' } },
            'application/x-www-form-urlencoded': { schema: { type: 'object' } },
        };
    }
    // Check of the request content type matches one of the expected media
    // types in the request body spec
    let matchedMediaType = false;
    for (const type in content) {
        matchedMediaType = type_is_1.is(contentType, type);
        if (matchedMediaType) {
            requestBody.mediaType = type;
            requestBody.schema = content[type].schema;
            break;
        }
    }
    if (!matchedMediaType) {
        // No matching media type found, fail fast
        throw rest_http_error_1.RestHttpErrors.unsupportedMediaType(contentType, Object.keys(content));
    }
    if (type_is_1.is(matchedMediaType, 'urlencoded')) {
        try {
            const body = await parseFormBody(request,
            // use `qs` modules to handle complex objects
            Object.assign({
                querystring: {
                    parse: (str, cb) => {
                        cb(null, qs.parse(str));
                    },
                },
            }, options));
            return Object.assign(requestBody, {
                // form parser returns an object without prototype
                // create a new copy to simplify shouldjs assertions
                value: Object.assign({}, body),
                // urlencoded body only provide string values
                // set the flag so that AJV can coerce them based on the schema
                coercionRequired: true,
            });
        }
        catch (err) {
            throw normalizeParsingError(err);
        }
    }
    if (type_is_1.is(matchedMediaType, 'json')) {
        try {
            const { body } = request;
            //const jsonBody =  await parseJsonBody(request, options);
            requestBody.value = body;
            return requestBody;
        }
        catch (err) {
            throw normalizeParsingError(err);
        }
    }
    throw rest_http_error_1.RestHttpErrors.unsupportedMediaType(matchedMediaType);
}
exports.loadRequestBodyIfNeeded = loadRequestBodyIfNeeded;
function buildOperationArguments(operationSpec, request, pathParams, body, globalSchemas) {
    let requestBodyIndex = -1;
    if (operationSpec.requestBody) {
        // the type of `operationSpec.requestBody` could be `RequestBodyObject`
        // or `ReferenceObject`, resolving a `$ref` value is not supported yet.
        if (openapi_v3_types_1.isReferenceObject(operationSpec.requestBody)) {
            throw new Error('$ref requestBody is not supported yet.');
        }
        const i = operationSpec.requestBody[openapi_v3_1.REQUEST_BODY_INDEX];
        requestBodyIndex = i ? i : 0;
    }
    const paramArgs = [];
    for (const paramSpec of operationSpec.parameters || []) {
        if (openapi_v3_types_1.isReferenceObject(paramSpec)) {
            // TODO(bajtos) implement $ref parameters
            // See https://github.com/strongloop/loopback-next/issues/435
            throw new Error('$ref parameters are not supported yet.');
        }
        const spec = paramSpec;
        const rawValue = getParamFromRequest(spec, request, pathParams);
        const coercedValue = coerce_parameter_1.coerceParameter(rawValue, spec);
        paramArgs.push(coercedValue);
    }
    debug('Validating request body - value %j', body);
    request_body_validator_1.validateRequestBody(body, operationSpec.requestBody, globalSchemas);
    if (requestBodyIndex > -1)
        paramArgs.splice(requestBodyIndex, 0, body.value);
    return paramArgs;
}
function getParamFromRequest(spec, request, pathParams) {
    switch (spec.in) {
        case 'query':
            ensureRequestQueryWasParsed(request);
            return request.query[spec.name];
        case 'path':
            return pathParams[spec.name];
        case 'header':
            // @jannyhou TBD: check edge cases
            return request.headers[spec.name.toLowerCase()];
            break;
        // TODO(jannyhou) to support `cookie`,
        // see issue https://github.com/strongloop/loopback-next/issues/997
        default:
            throw rest_http_error_1.RestHttpErrors.invalidParamLocation(spec.in);
    }
}
function ensureRequestQueryWasParsed(request) {
    if (request.query && request.query !== exports.QUERY_NOT_PARSED)
        return;
    const input = parseUrl(request).query;
    if (input && typeof input === 'string') {
        request.query = qs_1.parse(input);
    }
    else {
        request.query = {};
    }
    debug('Parsed request query: ', request.query);
}
//# sourceMappingURL=parser.js.map
