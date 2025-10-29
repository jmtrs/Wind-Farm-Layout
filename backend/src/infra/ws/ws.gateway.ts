import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

type ClientMeta = { scenarioId?: string };
const clients = new WeakMap<WebSocket, ClientMeta>();

@WebSocketGateway({ path: '/ws' })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: WebSocket) {
    clients.set(client, {});
  }

  handleDisconnect(client: WebSocket) {
    clients.delete(client);
  }

  @SubscribeMessage('join')
  join(
    @MessageBody() data: { scenarioId: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    clients.set(client, { scenarioId: data.scenarioId });
    client.send(
      JSON.stringify({ event: 'joined', data: { scenarioId: data.scenarioId } }),
    );
  }

  broadcastToScenario(scenarioId: string, event: string, data: any) {
    this.server.clients.forEach((c: WebSocket) => {
      const meta = clients.get(c);
      if (meta?.scenarioId === scenarioId && c.readyState === c.OPEN) {
        c.send(JSON.stringify({ event, data }));
      }
    });
  }
}
