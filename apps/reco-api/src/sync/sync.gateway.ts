import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * Gateway WS (namespace 'sync', path /socket.io/reco).
 *
 * Emite 'sync:completed' cuando termina una sincronización MongoDB -> Neo4j,
 * con las estadísticas de la corrida.
 */
@WebSocketGateway({
  namespace: 'sync',
  path: '/socket.io/reco',
  cors: { origin: true, credentials: true },
})
export class SyncGateway {
  @WebSocketServer() server: Server;

  emitSyncCompleted(stats: SyncStats): void {
    this.server.emit('sync:completed', { timestamp: Date.now(), ...stats });
  }
}

export interface SyncStats {
  generos?: number;
  usuarios?: number;
  artistas?: number;
  albumes?: number;
  canciones?: number;
  historial?: number;
  likes?: number;
  seguimientos?: number;
}
