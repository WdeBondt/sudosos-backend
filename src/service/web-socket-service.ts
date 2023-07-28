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

export default class WebSocketService {

  connections: Map<WebSocket, boolean>;


  constructor(server: Application) {
    this.setup(server);
  }

  public setup(server: Application) {
    this.createWebSocket(server);
    this.connections = new Map();
    // this.createUnauthenticatedWebSocket(server);
  }

  public static isClientAuthenticated(req) {
    return false;
  }

  public createWebSocket(server: Application) {
    server.wss = new WebSocket.Server({ server: server.server });

    // WebSocket server connection event
    server.wss.on('connection', (ws, req) => {
      console.log('WebSocket client connected');

      // Perform authentication check
      const isAuth = WebSocketService.isClientAuthenticated(req);

      // Store the authentication status with the WebSocket connection in the Map
      this.connections.set(ws, isAuth);

      ws.on('message', (message) => {
        console.log('Received message from client:', message);
        // Access ws.isAuth to determine the authentication status
        if (this.connections.get(ws)) {
          console.error('authenticated message');
          // Perform authenticated actions
        } else {
          console.error('unauthenticated message');
          // Perform unauthenticated actions
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

}
