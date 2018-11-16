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
let InvokeMethodProvider = class InvokeMethodProvider {
    constructor(context) {
        this.context = context;
    }
    value() {
        return (route, args) => this.action(route, args);
    }
    action(route, args) {
        return route.invokeHandler(this.context, args);
    }
};
InvokeMethodProvider = __decorate([
    __param(0, context_1.inject(keys_1.RestBindings.Http.CONTEXT)),
    __metadata("design:paramtypes", [context_1.Context])
], InvokeMethodProvider);
exports.InvokeMethodProvider = InvokeMethodProvider;
//# sourceMappingURL=invoke-method.provider.js.map