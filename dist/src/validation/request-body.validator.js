"use strict";
// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const AJV = require("ajv");
const debugModule = require("debug");
const util = require("util");
const __1 = require("..");
const _ = require("lodash");
const toJsonSchema = require('openapi-schema-to-json-schema');
const debug = debugModule('loopback:rest:validation');
/**
 * Check whether the request body is valid according to the provided OpenAPI schema.
 * The JSON schema is generated from the OpenAPI schema which is typically defined
 * by `@requestBody()`.
 * The validation leverages AJS schema validator.
 * @param body The request body parsed from an HTTP request.
 * @param requestBodySpec The OpenAPI requestBody specification defined in `@requestBody()`.
 * @param globalSchemas The referenced schemas generated from `OpenAPISpec.components.schemas`.
 */
function validateRequestBody(body, requestBodySpec, globalSchemas = {}, options = {}) {
    const required = requestBodySpec && requestBodySpec.required;
    if (required && body.value == undefined) {
        const err = Object.assign(new __1.HttpErrors.BadRequest('Request body is required'), {
            code: 'MISSING_REQUIRED_PARAMETER',
            parameterName: 'request body',
        });
        throw err;
    }
    const schema = body.schema;
    /* istanbul ignore if */
    if (debug.enabled) {
        debug('Request body schema: %j', util.inspect(schema, { depth: null }));
    }
    if (!schema)
        return;
    options = Object.assign({ coerceTypes: body.coercionRequired }, options);
    validateValueAgainstSchema(body.value, schema, globalSchemas, options);
}
exports.validateRequestBody = validateRequestBody;
/**
 * Convert an OpenAPI schema to the corresponding JSON schema.
 * @param openapiSchema The OpenAPI schema to convert.
 */
function convertToJsonSchema(openapiSchema) {
    const jsonSchema = toJsonSchema(openapiSchema);
    delete jsonSchema['$schema'];
    /* istanbul ignore if */
    if (debug.enabled) {
        debug('Converted OpenAPI schema to JSON schema: %s', util.inspect(jsonSchema, { depth: null }));
    }
    return jsonSchema;
}
/**
 * Validate the request body data against JSON schema.
 * @param body The request body data.
 * @param schema The JSON schema used to perform the validation.
 * @param globalSchemas Schema references.
 */
const compiledSchemaCache = new WeakMap();
function validateValueAgainstSchema(
// tslint:disable-next-line:no-any
body, schema, globalSchemas, options) {
    let validate;
    if (compiledSchemaCache.has(schema)) {
        validate = compiledSchemaCache.get(schema);
    }
    else {
        validate = createValidator(schema, globalSchemas, options);
        compiledSchemaCache.set(schema, validate);
    }
    if (validate(body)) {
        debug('Request body passed AJV validation.');
        return;
    }
    const validationErrors = validate.errors;
    /* istanbul ignore if */
    if (debug.enabled) {
        debug('Invalid request body: %s', util.inspect(validationErrors));
    }
    const error = __1.RestHttpErrors.invalidRequestBody();
    error.details = _.map(validationErrors, e => {
        return {
            path: e.dataPath,
            code: e.keyword,
            message: e.message,
            info: e.params,
        };
    });
    throw error;
}
function createValidator(schema, globalSchemas, options) {
    const jsonSchema = convertToJsonSchema(schema);
    const schemaWithRef = Object.assign({ components: {} }, jsonSchema);
    schemaWithRef.components = {
        schemas: globalSchemas,
    };
    const ajv = new AJV(Object.assign({}, {
        allErrors: true,
    }, options));
    return ajv.compile(schemaWithRef);
}
//# sourceMappingURL=request-body.validator.js.map