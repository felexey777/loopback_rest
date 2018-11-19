/// <reference types="express" />
import { Provider } from '@loopback/context';
import { ResolvedRoute } from '../router';
import { Request, ParseParams, RequestBodyParserOptions } from '../types';
/**
 * Provides the function for parsing args in requests at runtime.
 *
 * @export
 * @class ParseParamsProvider
 * @implements {Provider<ParseParams>}
 * @returns {ParseParams} The handler function that will parse request args.
 */
export declare class ParseParamsProvider implements Provider<ParseParams> {
    private options?;
    constructor(options?: RequestBodyParserOptions | undefined);
    value(): (request: Request, route: ResolvedRoute) => Promise<any[]>;
}
