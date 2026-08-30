import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { Db } from 'mongodb';
import { MONGO_DB } from './sync.constants';
import { NEO4J_DRIVER } from '../neo4j/neo4j.constants';
import type { SyncStats } from './sync.gateway';

/**
 * Nombres de colecciones (paridad con config.js legacy).
 */
const COLLECTIONS = {
  canciones: 'songs',
  usuarios: 'usuarios',
  artistas: 'artistas',
  albumes: 'albumes',
  categorias: 'categorias',
  playlists: 'playlists',
  historial: 'historial_reproducciones',
  likes_canciones: 'likes_canciones',
  seguimiento_artistas: 'seguimiento_artistas',
} as const;

const SYNC_BATCH_SIZE = 100;
const SYNC_DELAY_BETWEEN_BATCHES = 100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly configService: ConfigService,
  ) {}

  private getCollection(name: keyof typeof COLLECTIONS) {
    return this.db.collection(COLLECTIONS[name]);
  }

  private session(): Session {
    return this.driver.session();
  }

  // 1. Usuarios
  async syncUsuarios(): Promise<number> {
    this.logger.log('Sincronizando usuarios...');
    const session = this.session();
    try {
      const usuarios = await this.getCollection('usuarios')
        .find({ active: true })
        .toArray();

      for (const usuario of usuarios) {
        await session.run(
          `
          MERGE (u:Usuario {id: $id})
          SET u.username = $username,
              u.name = $name,
              u.country = $country,
              u.is_premium = $is_premium,
              u.es_artist = $es_artist,
              u.date_of_register = datetime($date_of_register),
              u.last_update = datetime()
        `,
          {
            id: usuario._id.toString(),
            username: usuario.username,
            name: usuario.name,
            country: usuario.country,
            is_premium: usuario.is_premium || false,
            es_artist: usuario.es_artist || false,
            date_of_register:
              usuario.date_of_register?.toISOString?.() ??
              new Date().toISOString(),
          },
        );
      }
      this.logger.log(`${usuarios.length} usuarios sincronizados`);
      return usuarios.length;
    } catch (error) {
      this.logger.error('Error sincronizando usuarios:', error as Error);
      return 0;
    } finally {
      await session.close();
    }
  }

  // 2. Artistas
  async syncArtistas(): Promise<number> {
    this.logger.log('Sincronizando artistas...');
    const session = this.session();
    try {
      const artistas = await this.getCollection('artistas')
        .find({ activo: true })
        .toArray();

      for (const artista of artistas) {
        await session.run(
          `
          MERGE (a:Artista {id: $id})
          SET a.nombre_artistico = $nombre_artistico,
              a.country = $country,
              a.biografia = $biografia,
              a.imagen_url = $imagen_url,
              a.verificado = $verificado,
              a.oyentes_mensuales = $oyentes_mensuales,
              a.reproducciones_totales = $reproducciones_totales,
              a.last_update = datetime()
        `,
          {
            id: artista._id.toString(),
            nombre_artistico: artista.nombre_artistico,
            country: artista.country,
            biografia: artista.biografia || '',
            imagen_url: artista.imagen_url || '',
            verificado: artista.verificado || false,
            oyentes_mensuales: neo4j.int(artista.oyentes_mensuales || 0),
            reproducciones_totales: neo4j.int(
              artista.reproducciones_totales?.toString() || '0',
            ),
          },
        );
      }
      this.logger.log(`${artistas.length} artistas sincronizados`);
      return artistas.length;
    } catch (error) {
      this.logger.error('Error sincronizando artistas:', error as Error);
      return 0;
    } finally {
      await session.close();
    }
  }

  // 3. Géneros
  async syncGeneros(): Promise<number> {
    this.logger.log('Sincronizando géneros...');
    const session = this.session();
    try {
      const categorias = await this.getCollection('categorias')
        .find({ activa: true })
        .toArray();

      for (const cat of categorias) {
        await session.run(
          `
          MERGE (g:Genero {nombre: $nombre})
          SET g.descripcion = $descripcion,
              g.color_hex = $color_hex,
              g.last_update = datetime()
        `,
          {
            nombre: cat.nombre,
            descripcion: cat.descripcion || '',
            color_hex: cat.color_hex || '#000000',
          },
        );
      }
      this.logger.log(`${categorias.length} géneros sincronizados`);
      return categorias.length;
    } catch (error) {
      this.logger.error('Error sincronizando géneros:', error as Error);
      return 0;
    } finally {
      await session.close();
    }
  }

  // 4. Álbumes
  async syncAlbumes(): Promise<number> {
    this.logger.log('Sincronizando álbumes...');
    const session = this.session();
    try {
      const albumes = await this.getCollection('albumes')
        .find({ disponible: true })
        .toArray();

      for (const album of albumes) {
        await session.run(
          `
          MERGE (a:Album {id: $id})
          SET a.titulo = $titulo,
              a.tipo_album = $tipo_album,
              a.fecha_lanzamiento = datetime($fecha_lanzamiento),
              a.portada_url = $portada_url,
              a.total_canciones = $total_canciones,
              a.reproducciones_totales = $reproducciones_totales,
              a.last_update = datetime()
        `,
          {
            id: album._id.toString(),
            titulo: album.titulo,
            tipo_album: album.tipo_album,
            fecha_lanzamiento:
              album.fecha_lanzamiento?.toISOString?.() ?? new Date().toISOString(),
            portada_url: album.portada_url || '',
            total_canciones: neo4j.int(album.total_canciones || 0),
            reproducciones_totales: neo4j.int(
              album.reproducciones_totales?.toString() || '0',
            ),
          },
        );

        if (album.artista_principal_id) {
          await session.run(
            `
            MATCH (a:Album {id: $album_id})
            MATCH (ar:Artista {id: $artista_id})
            MERGE (a)-[:BY_ARTIST]->(ar)
          `,
            {
              album_id: album._id.toString(),
              artista_id: album.artista_principal_id.toString(),
            },
          );
        }

        if (album.categorias && album.categorias.length > 0) {
          for (const genero of album.categorias) {
            await session.run(
              `
              MATCH (a:Album {id: $album_id})
              MERGE (g:Genero {nombre: $genero})
              MERGE (a)-[:HAS_GENRE]->(g)
            `,
              { album_id: album._id.toString(), genero },
            );
          }
        }
      }
      this.logger.log(`${albumes.length} álbumes sincronizados`);
      return albumes.length;
    } catch (error) {
      this.logger.error('Error sincronizando álbumes:', error as Error);
      return 0;
    } finally {
      await session.close();
    }
  }

  // 5. Canciones
  async syncCanciones(): Promise<number> {
    this.logger.log('Sincronizando canciones...');
    const session = this.session();
    try {
      const collectionName = COLLECTIONS.canciones;
      this.logger.log(`  Usando colección: ${collectionName}`);

      const canciones = await this.db.collection(collectionName).find({}).toArray();

      if (canciones.length === 0) {
        this.logger.log('  No se encontraron canciones.');
        return 0;
      }

      this.logger.log(`  Encontradas ${canciones.length} canciones`);

      for (let i = 0; i < canciones.length; i += SYNC_BATCH_SIZE) {
        const batch = canciones.slice(i, i + SYNC_BATCH_SIZE);

        for (const cancion of batch) {
          try {
            if (!cancion.title) {
              this.logger.log(`  Canción sin título, saltando: ${cancion._id}`);
              continue;
            }

            let generos: string[] = [];
            if (cancion.genre) generos.push(cancion.genre);
            if (cancion.categorias && cancion.categorias.length > 0) {
              generos = [...generos, ...cancion.categorias];
            }
            if (cancion.tags && cancion.tags.length > 0) {
              generos = [...generos, ...cancion.tags];
            }
            generos = [
              ...new Set(generos.filter((g) => g && typeof g === 'string')),
            ];

            await session.run(
              `
              MERGE (c:Cancion {id: $id})
              SET c.titulo = $titulo,
                  c.artista = $artista,
                  c.duracion_segundos = $duracion,
                  c.genero = $genero,
                  c.album = $album,
                  c.archivo_url = $archivo_url,
                  c.portada_url = $portada_url,
                  c.reproducciones = $reproducciones,
                  c.disponible = true,
                  c.fecha_lanzamiento = datetime($fecha_lanzamiento),
                  c.fecha_subida = datetime($fecha_subida),
                  c.compositores = $compositores,
                  c.generos_array = $generos_array,
                  c.last_update = datetime()
            `,
              {
                id: cancion._id.toString(),
                titulo: cancion.title,
                artista: cancion.artist || 'Desconocido',
                duracion: neo4j.int(cancion.duration || 0),
                genero: cancion.genre || 'Sin género',
                album: cancion.album || '',
                archivo_url: cancion.fileName || '',
                portada_url: cancion.coverUrl || '',
                reproducciones: neo4j.int(cancion.playCount || 0),
                fecha_lanzamiento:
                  cancion.createdAt?.toISOString?.() ?? new Date().toISOString(),
                fecha_subida:
                  cancion.uploadDate?.toISOString?.() ?? new Date().toISOString(),
                compositores: JSON.stringify(cancion.composers || []),
                generos_array: JSON.stringify(generos),
              },
            );

            if (cancion.artist && cancion.artist.trim()) {
              await session.run(
                `
                MERGE (a:Artista {nombre_artistico: $nombre})
                ON CREATE SET a.id = randomUUID(),
                             a.created_from = 'song_sync',
                             a.created_at = datetime()

                WITH a
                MATCH (c:Cancion {id: $cancion_id})
                MERGE (c)-[r:PERFORMED_BY]->(a)
                SET r.tipo = 'principal'
              `,
                {
                  nombre: cancion.artist.trim(),
                  cancion_id: cancion._id.toString(),
                },
              );
            }

            for (const genero of generos) {
              if (genero && genero.trim()) {
                await session.run(
                  `
                  MATCH (c:Cancion {id: $cancion_id})
                  MERGE (g:Genero {nombre: $genero})
                  ON CREATE SET g.created_at = datetime()
                  MERGE (c)-[:HAS_GENRE]->(g)
                `,
                  { cancion_id: cancion._id.toString(), genero: genero.trim() },
                );
              }
            }

            if (cancion.album && cancion.album.trim()) {
              await session.run(
                `
                MERGE (al:Album {titulo: $titulo})
                ON CREATE SET al.id = randomUUID(),
                             al.created_from = 'song_sync',
                             al.created_at = datetime()

                WITH al
                MATCH (c:Cancion {id: $cancion_id})
                MERGE (c)-[:BELONGS_TO]->(al)
              `,
                { titulo: cancion.album.trim(), cancion_id: cancion._id.toString() },
              );
            }
          } catch (cancionError) {
            this.logger.error(
              `  Error procesando canción ${cancion.title || cancion._id}:`,
              (cancionError as Error).message,
            );
          }
        }

        if (i + SYNC_BATCH_SIZE < canciones.length) {
          await sleep(SYNC_DELAY_BETWEEN_BATCHES);
          this.logger.log(
            `  Procesadas ${Math.min(i + SYNC_BATCH_SIZE, canciones.length)} de ${canciones.length} canciones...`,
          );
        }
      }

      this.logger.log(`${canciones.length} canciones sincronizadas`);
      return canciones.length;
    } catch (error) {
      this.logger.error('Error sincronizando canciones:', error as Error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // 6. Historial reciente
  async syncHistorialReciente(): Promise<number> {
    this.logger.log('Sincronizando historial reciente...');
    const session = this.session();
    try {
      const days =
        this.configService.get<number>('reco.syncHistoryDays') ?? 30;
      const haceNDias = new Date();
      haceNDias.setDate(haceNDias.getDate() - days);

      const collectionName = COLLECTIONS.historial;

      const historial = await this.db
        .collection(collectionName)
        .find({ fecha_reproduccion: { $gte: haceNDias } })
        .limit(50000)
        .toArray();

      this.logger.log(`  Encontrados ${historial.length} registros de historial`);

      if (historial.length === 0) {
        this.logger.log('  No se encontraron registros de historial');
        return 0;
      }

      let sincronizados = 0;
      let errores = 0;

      for (const registro of historial) {
        try {
          if (!registro.metadata?.usuario_id || !registro.metadata?.cancion_id) {
            this.logger.log('Registro sin usuario_id o cancion_id, saltando');
            continue;
          }

          await session.run(
            `
            MATCH (u:Usuario {id: $usuario_id})
            MATCH (c:Cancion {id: $cancion_id})
            MERGE (u)-[r:REPRODUJO {fecha: datetime($fecha)}]->(c)
            SET r.duracion_escuchada = $duracion,
                r.completada = $completada,
                r.last_update = datetime()
          `,
            {
              usuario_id: registro.metadata.usuario_id.toString(),
              cancion_id: registro.metadata.cancion_id.toString(),
              fecha:
                registro.fecha_reproduccion?.toISOString?.() ??
                new Date().toISOString(),
              duracion: neo4j.int(registro.metadata.duracion_escuchada || 0),
              completada: registro.metadata.completada || false,
            },
          );

          sincronizados++;
        } catch (regError) {
          errores++;
          if (errores <= 3) {
            this.logger.error('Error en registro:', (regError as Error).message);
          }
        }
      }

      this.logger.log(
        `${sincronizados} registros de historial sincronizados (${errores} errores)`,
      );
      return sincronizados;
    } catch (error) {
      this.logger.error('Error sincronizando historial:', error as Error);
      return 0;
    } finally {
      await session.close();
    }
  }

  // 7. Likes
  async syncLikes(): Promise<number> {
    this.logger.log('Sincronizando likes...');
    const session = this.session();
    try {
      const likes = await this.getCollection('likes_canciones').find({}).toArray();

      for (const like of likes) {
        await session.run(
          `
          MATCH (u:Usuario {id: $usuario_id})
          MATCH (c:Cancion {id: $cancion_id})
          MERGE (u)-[r:LE_GUSTA]->(c)
          SET r.fecha = datetime($fecha)
        `,
          {
            usuario_id: like.usuario_id?.toString(),
            cancion_id: like.cancion_id?.toString(),
            fecha:
              like.fecha_like?.toISOString?.() ?? new Date().toISOString(),
          },
        );
      }
      this.logger.log(`${likes.length} likes sincronizados`);
      return likes.length;
    } catch (error) {
      this.logger.error('Error sincronizando likes:', error as Error);
      return 0;
    } finally {
      await session.close();
    }
  }

  // 8. Seguimientos
  async syncSeguimientos(): Promise<number> {
    this.logger.log('Sincronizando seguimientos...');
    const session = this.session();
    try {
      const seguimientos = await this.getCollection('seguimiento_artistas')
        .find({})
        .toArray();

      for (const seg of seguimientos) {
        await session.run(
          `
          MATCH (u:Usuario {id: $usuario_id})
          MATCH (a:Artista {id: $artista_id})
          MERGE (u)-[r:SIGUE]->(a)
          SET r.fecha = datetime($fecha),
              r.notificaciones = $notificaciones
        `,
          {
            usuario_id: seg.usuario_id?.toString(),
            artista_id: seg.artista_id?.toString(),
            fecha:
              seg.fecha_seguimiento?.toISOString?.() ?? new Date().toISOString(),
            notificaciones: seg.notificaciones_activas || true,
          },
        );
      }
      this.logger.log(`${seguimientos.length} seguimientos sincronizados`);
      return seguimientos.length;
    } catch (error) {
      this.logger.error('Error sincronizando seguimientos:', error as Error);
      return 0;
    } finally {
      await session.close();
    }
  }

  // 9. Preferencias
  async calcularPreferencias(): Promise<void> {
    this.logger.log('Calculando preferencias de usuarios...');
    const session = this.session();
    try {
      await session.run(`
        MATCH (u:Usuario)-[r:REPRODUJO]->(c:Cancion)-[:HAS_GENRE]->(g:Genero)
        WITH u, g, COUNT(r) as reproducciones
        WITH u, g, reproducciones,
             toFloat(reproducciones) /
             toFloat(COUNT {(u)-[:REPRODUJO]->(:Cancion)}) as score
        MERGE (u)-[pref:TIENE_PREFERENCIA]->(g)
        SET pref.score = score,
            pref.reproducciones = reproducciones,
            pref.last_update = datetime()
      `);
      this.logger.log('Preferencias calculadas');
    } catch (error) {
      this.logger.error(
        'Error calculando preferencias:',
        (error as Error).message,
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Sincronización completa en orden (paridad con sincronizacionCompleta).
   * Devuelve las estadísticas de la corrida (para el gateway WS).
   */
  async fullSync(): Promise<SyncStats> {
    this.logger.log('Iniciando sincronización completa MongoDB -> Neo4j');
    const stats: SyncStats = {};
    try {
      stats.generos = await this.syncGeneros();
      stats.usuarios = await this.syncUsuarios();
      stats.artistas = await this.syncArtistas();
      stats.albumes = await this.syncAlbumes();
      stats.canciones = await this.syncCanciones();
      stats.historial = await this.syncHistorialReciente();
      stats.likes = await this.syncLikes();
      stats.seguimientos = await this.syncSeguimientos();
      await this.calcularPreferencias();
      this.logger.log('Sincronización completa finalizada con éxito');
    } catch (error) {
      this.logger.error('Error en sincronización:', error as Error);
    }
    return stats;
  }
}
