import { RequestHandler, Request, Response } from 'express';
import TokenHandler from '../authentication/token-handler';
import JsonWebToken from '../authentication/json-web-token';

/**
 * The configuration options for the token middleware.
 */
export interface MiddlewareOptions {
  /**
   * The token handler instance internally used by the middleware.
   */
  tokenHandler: TokenHandler;
  /**
   * The factor of the configured expiry of the token handler at which the token will be refreshed.
   * Set to `0.0` for refreshing on every request. Setting to `1.0` or higher will prevent
   * refeshing, as tokens will expire before a possible refresh.
   */
  refreshFactor: number;
}

/**
 * Extend the Express request interface with a token property, which will be filled by this
 * middleware.
 */
export interface RequestWithToken extends Request {
  /**
   * The parsed JWT in the request header.
   */
  token: JsonWebToken;
}

/**
 * This class is responsible for:
 * - parsing JWT tokens in the request Authorization header.
 * - validating parsed JWT tokens.
 * - refreshing the JWT tokens in the request header allowing sliding expiration.
 */
export default class TokenMiddleware {
  /**
   * A reference to the options to be used by this middleware instance.
   */
  private readonly options: MiddlewareOptions;

  /**
   * Creates a new token middleware instance.
   * @param options - the options to be used by this middleware.
   */
  public constructor(options: MiddlewareOptions) {
    this.options = options;
  }

  /**
   * Middleware handler for parsing and validating JWT tokens.
   * @param req - the express request to handle.
   * @param res - the express response object.
   * @param next - the express next function to continue processing of the request.
   */
  public async handle(req: RequestWithToken, res: Response, next: Function): Promise<void> {
    res.status(500).end('Not implemented.');
  }

  /**
   * @returns a middleware handler to be used by express.
   */
  public getMiddleware(): RequestHandler {
    return this.handle.bind(this);
  }
}
