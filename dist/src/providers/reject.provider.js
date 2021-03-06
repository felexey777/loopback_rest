"use strict";
// Copyright IBM Corp. 2017. All Rights Reserved.
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
const keys_1 = require("../keys");
const strong_error_handler_1 = require("strong-error-handler");
// TODO(bajtos) Make this mapping configurable at RestServer level,
// allow apps and extensions to contribute additional mappings.
const codeToStatusCodeMap = {
    ENTITY_NOT_FOUND: 404,
};
let RejectProvider = class RejectProvider {
    constructor(logError, errorWriterOptions) {
        this.logError = logError;
        this.errorWriterOptions = errorWriterOptions;
    }
    value() {
        return (context, error) => this.action(context, error);
    }
    action({ request, response }, error) {
        const err = error;
        if (!err.status && !err.statusCode && err.code) {
            const customStatus = codeToStatusCodeMap[err.code];
            if (customStatus) {
                err.statusCode = customStatus;
            }
        }
        const statusCode = err.statusCode || err.status || 500;
        strong_error_handler_1.writeErrorToResponse(err, request, response, this.errorWriterOptions);
        this.logError(error, statusCode, request);
    }
};
RejectProvider = __decorate([
    __param(0, context_1.inject(keys_1.RestBindings.SequenceActions.LOG_ERROR)),
    __param(1, context_1.inject(keys_1.RestBindings.ERROR_WRITER_OPTIONS, { optional: true })),
    __metadata("design:paramtypes", [Function, Object])
], RejectProvider);
exports.RejectProvider = RejectProvider;
//# sourceMappingURL=reject.provider.js.map