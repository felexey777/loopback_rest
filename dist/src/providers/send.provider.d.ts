import { Provider, BoundValue } from '@loopback/context';
import { writeResultToResponse } from '../writer';
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
export declare class SendProvider implements Provider<BoundValue> {
    value(): typeof writeResultToResponse;
}
