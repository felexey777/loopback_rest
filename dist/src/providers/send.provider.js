"use strict";
// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
const writer_1 = require("../writer");
/**
 * Provides the function that populates the response object with
 * the results of the operation.
 *
 * @export
 * @class SendProvider
 * @implements {Provider<BoundValue>}
 * @returns {BoundValue} The handler function that will populate the
 * response with operation results.
 */
class SendProvider {
    value() {
        return writer_1.writeResultToResponse;
    }
}
exports.SendProvider = SendProvider;
//# sourceMappingURL=send.provider.js.map