/**
 *  SudoSOS back-end API service.
 *  Copyright (C) 2020  Study association GEWIS
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published
 *  by the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import WebSocket from 'ws';
import { Application } from '../index';
import log4js, { Logger } from 'log4js';
import TokenHandler from '../authentication/token-handler';
import JsonWebToken from '../authentication/json-web-token';

/**
 * @typedef WebSocketAuthenticationRequest
 * @property {string} type.required - Type of WebSocket Message, should be 'authentication'
 * @property {string} token.required - The JWT token used to verify.
 */
interface WebSocketAuthenticationRequest {
  type: 'authentication',
  token: string
}

export default class WebSocketService {

  private static instance: WebSocketService;

  connections: Map<WebSocket, JsonWebToken>;

  private logger: Logger = log4js.getLogger('WebSocket');

  private tokenHandler: TokenHandler;

  private application: Application;

  private subscriptions: Map<string, WebSocket[]>;

  constructor(server: Application, tokenHandler: TokenHandler) {
    this.setup(server);
    this.logger.level = process.env.LOG_LEVEL;
    this.tokenHandler = tokenHandler;
    this.application = server;
    WebSocketService.instance = this;
  }

  public setup(server: Application) {
    this.createWebSocket(server);
    this.connections = new Map();
  }

  public static getInstance(): WebSocketService {
    return WebSocketService.instance;
  }

  public async isClientAuthenticated(token: string) {
    // Validate the request token.
    try {
      return await this.tokenHandler.verifyToken(token);
    } catch {
      return false;
    }
  }

  public async handleTokenMessage(ws: WebSocket, message: WebSocketAuthenticationRequest) {

    // Perform authentication check
    const res = await this.isClientAuthenticated(message.token);

    // Store the authentication status with the WebSocket connection in the Map
    if (res) this.connections.set(ws, res);

    const data = {
      data: `Connection security is ${JSON.stringify(res)}`,
    };

    ws.send(JSON.stringify(data));
  }

  public createWebSocket(server: Application) {
    server.wss = new WebSocket.Server({ server: server.server });

    // WebSocket server connection event
    server.wss.on('connection', (ws, req: any) => {
      this.logger.trace('WebSocket client connected');

      ws.on('message', async (message) => {
        this.logger.trace('Received message from client:', message);
        const data = JSON.parse(message.toString());

        if (data.type === 'authentication') await this.handleTokenMessage(ws, data as WebSocketAuthenticationRequest);

        // Access ws.isAuth to determine the authentication status
        if (this.connections.get(ws)) {
          this.logger.trace('authenticated message');
          if (data.type === 'subscribe') this.subscriptions.set(data.target, [ws]);
          // Perform authenticated actions
        } else {
          this.logger.trace('unauthenticated message');
          // Perform unauthenticated actions
        }
      });

      ws.on('close', () => {
        this.logger.trace('WebSocket client disconnected');
      });
    });
  }

  public sendDataToAuthenticatedSockets(data: any) {
    this.application.wss.clients.forEach((client: WebSocket) => {
      // Check if the client is authenticated
      if (this.connections.get(client) && client.readyState === WebSocket.OPEN) {
        console.error('SENDING');
        // Send data only to authenticated clients
        client.send(JSON.stringify(data));
      }
    });
  }


}
