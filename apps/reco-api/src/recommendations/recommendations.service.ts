import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Recommendation,
  RecommendationListResponse,
  REDIS_KEYS,
} from '@kornbeat/shared';
import { Neo4jService } from '../neo4j/neo4j.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  private get cacheTtl(): number {
    return this.configService.get<number>('reco.redisCacheTtl') ?? 300;
  }

  private async getCache<T>(key: string): Promise<T | null> {
    if (!this.redis.isAvailable) return null;
    const data = await this.redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  private async setCache(key: string, data: unknown): Promise<void> {
    if (!this.redis.isAvailable) return;
    await this.redis.setEx(key, this.cacheTtl, JSON.stringify(data));
  }

  // 1. Top 100 Global
  async topGlobal(limit = 100, offset = 0): Promise<RecommendationListResponse> {
    const cacheKey = REDIS_KEYS.topGlobalCache(limit, offset);
    const cached = await this.getCache<RecommendationListResponse>(cacheKey);
    if (cached) return cached;

    const { records } = await this.neo4j.run(
      `
      MATCH (c:Cancion)
      RETURN c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion
      ORDER BY c.reproducciones DESC
      SKIP $offset
      LIMIT $limit
    `,
      { limit: this.neo4j.int(limit), offset: this.neo4j.int(offset) },
    );

    const canciones: Recommendation[] = records.map((record) => ({
      id: String(record.get('id')),
      titulo: String(record.get('titulo')),
      artista: String(record.get('artista')),
      portada_url: record.get('portada_url') ?? null,
      reproducciones: this.neo4j.toNumber(record.get('reproducciones')),
      duracion: this.neo4j.toNumber(record.get('duracion')),
    }));

    const response: RecommendationListResponse = {
      success: true,
      data: canciones,
      total: canciones.length,
    };

    await this.setCache(cacheKey, response);
    return response;
  }

  // 2. Top 100 por País
  async topCountry(
    country: string,
    limit = 100,
    offset = 0,
  ): Promise<RecommendationListResponse> {
    const cacheKey = REDIS_KEYS.topCountryCache(country, limit, offset);
    const cached = await this.getCache<RecommendationListResponse>(cacheKey);
    if (cached) return cached;

    const { records } = await this.neo4j.run(
      `
      MATCH (a:Artista)<-[:PERFORMED_BY]-(c:Cancion)
      WHERE a.country = $country
      RETURN c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion,
             a.nombre_artistico as artista_nombre
      ORDER BY c.reproducciones DESC
      SKIP $offset
      LIMIT $limit
    `,
      {
        country: country.toUpperCase(),
        limit: this.neo4j.int(limit),
        offset: this.neo4j.int(offset),
      },
    );

    const canciones: Recommendation[] = records.map((record) => ({
      id: String(record.get('id')),
      titulo: String(record.get('titulo')),
      artista: String(record.get('artista')),
      portada_url: record.get('portada_url') ?? null,
      reproducciones: this.neo4j.toNumber(record.get('reproducciones')),
      duracion: this.neo4j.toNumber(record.get('duracion')),
      artista_nombre: record.get('artista_nombre')
        ? String(record.get('artista_nombre'))
        : undefined,
    }));

    const response: RecommendationListResponse = {
      success: true,
      data: canciones,
      country: country.toUpperCase(),
      total: canciones.length,
      warning:
        canciones.length === 0
          ? 'No se encontraron artistas con información de país'
          : null,
    };

    await this.setCache(cacheKey, response);
    return response;
  }

  // 3. Recomendaciones basadas en historial del usuario
  async forUser(userId: string, limit = 50): Promise<RecommendationListResponse> {
    const cacheKey = REDIS_KEYS.recoUserCache(userId, 'for', limit);
    const cached = await this.getCache<RecommendationListResponse>(cacheKey);
    if (cached) return cached;

    const { records } = await this.neo4j.run(
      `
      MATCH (u:Usuario {id: $userId})-[r:REPRODUJO]->(c:Cancion)-[:HAS_GENRE]->(g:Genero)
      WITH u, g, COUNT(r) as escuchas
      ORDER BY escuchas DESC
      LIMIT 5

      MATCH (g)<-[:HAS_GENRE]-(cancion_recomendada:Cancion)
      WHERE NOT EXISTS((u)-[:REPRODUJO]->(cancion_recomendada))
        AND cancion_recomendada.disponible = true

      WITH cancion_recomendada, g, escuchas
      MATCH (cancion_recomendada)-[:PERFORMED_BY]->(a:Artista)

      RETURN DISTINCT cancion_recomendada.id as id,
             cancion_recomendada.titulo as titulo,
             cancion_recomendada.artista as artista,
             cancion_recomendada.portada_url as portada_url,
             cancion_recomendada.reproducciones as reproducciones,
             cancion_recomendada.duracion_segundos as duracion,
             COLLECT(DISTINCT g.nombre) as generos_match,
             SUM(escuchas) as score
      ORDER BY score DESC, cancion_recomendada.reproducciones DESC
      LIMIT $limit
    `,
      { userId, limit: this.neo4j.int(limit) },
    );

    const recomendaciones: Recommendation[] = records.map((record) => ({
      id: String(record.get('id')),
      titulo: String(record.get('titulo')),
      artista: String(record.get('artista')),
      portada_url: record.get('portada_url') ?? null,
      reproducciones: this.neo4j.toNumber(record.get('reproducciones')),
      duracion: this.neo4j.toNumber(record.get('duracion')),
      generos_match: record.get('generos_match') as string[],
      score: this.neo4j.toNumber(record.get('score')),
      razon: 'Basado en tus géneros favoritos',
    }));

    const response: RecommendationListResponse = {
      success: true,
      data: recomendaciones,
      usuario_id: userId,
      total: recomendaciones.length,
    };
    await this.setCache(cacheKey, response);
    return response;
  }

  // 4. Descubrir artistas emergentes con canciones virales
  async discoverEmerging(
    userId: string,
    limit = 25,
  ): Promise<RecommendationListResponse> {
    const cacheKey = REDIS_KEYS.recoUserCache(userId, 'discover', limit);
    const cached = await this.getCache<RecommendationListResponse>(cacheKey);
    if (cached) return cached;

    const { records } = await this.neo4j.run(
      `
      MATCH (u:Usuario {id: $userId})
      MATCH (a:Artista)<-[:PERFORMED_BY]-(c:Cancion)
      WHERE NOT EXISTS((u)-[:REPRODUJO]->(c))
        AND NOT EXISTS((u)-[:SIGUE]->(a))
        AND c.disponible = true
        AND a.oyentes_mensuales < 2000000
        AND c.reproducciones > 50000

      WITH c, a,
           CASE
             WHEN a.oyentes_mensuales > 0
             THEN toFloat(c.reproducciones) / toFloat(a.oyentes_mensuales)
             ELSE toFloat(c.reproducciones)
           END as factor_viral

      OPTIONAL MATCH (c)-[:HAS_GENRE]->(g:Genero)

      WITH c, a, factor_viral, COLLECT(DISTINCT g.nombre) as generos

      RETURN DISTINCT c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion,
             a.nombre_artistico as artista_nombre,
             a.oyentes_mensuales as oyentes_artista,
             factor_viral,
             generos
      ORDER BY factor_viral DESC, c.reproducciones DESC
      LIMIT $limit
    `,
      { userId, limit: this.neo4j.int(limit) },
    );

    const descubrimientos: Recommendation[] = records.map((record) => {
      const factorViral = record.get('factor_viral');
      const reproducciones = this.neo4j.toNumber(record.get('reproducciones'));
      const oyentesArtista = this.neo4j.toNumber(record.get('oyentes_artista'));

      return {
        id: String(record.get('id')),
        titulo: String(record.get('titulo')),
        artista: String(record.get('artista')),
        portada_url: record.get('portada_url') ?? null,
        reproducciones,
        duracion: this.neo4j.toNumber(record.get('duracion')),
        artista_nombre: record.get('artista_nombre')
          ? String(record.get('artista_nombre'))
          : undefined,
        oyentes_artista: oyentesArtista,
        generos: record.get('generos') as string[],
        factor_viral:
          factorViral !== null && factorViral !== undefined
            ? String(factorViral)
            : null,
        razon:
          oyentesArtista < 10000
            ? 'Hit viral de artista emergente'
            : 'Joya escondida de artista indie',
      };
    });

    const response: RecommendationListResponse = {
      success: true,
      data: descubrimientos,
      usuario_id: userId,
      total: descubrimientos.length,
      info: 'Artistas con menos de 2M oyentes pero con canciones exitosas (+50k reproducciones)',
    };
    await this.setCache(cacheKey, response);
    return response;
  }

  // 5. Últimas canciones escuchadas por el usuario
  async recentHistory(
    userId: string,
    limit = 20,
  ): Promise<RecommendationListResponse> {
    const cacheKey = REDIS_KEYS.recoUserCache(userId, 'recent', limit);
    const cached = await this.getCache<RecommendationListResponse>(cacheKey);
    if (cached) return cached;

    const { records } = await this.neo4j.run(
      `
      MATCH (u:Usuario {id: $userId})-[r:REPRODUJO]->(c:Cancion)
      WHERE c.disponible = true

      WITH c, r
      ORDER BY r.fecha DESC
      WITH c, COLLECT(r)[0] as ultima_reproduccion

      MATCH (c)-[:PERFORMED_BY]->(a:Artista)
      OPTIONAL MATCH (c)-[:HAS_GENRE]->(g:Genero)

      RETURN DISTINCT c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion,
             ultima_reproduccion.fecha as fecha_reproduccion,
             ultima_reproduccion.duracion_escuchada as duracion_escuchada,
             ultima_reproduccion.completada as completada,
             COLLECT(DISTINCT g.nombre) as generos
      ORDER BY ultima_reproduccion.fecha DESC
      LIMIT $limit
    `,
      { userId, limit: this.neo4j.int(limit) },
    );

    const historial: Recommendation[] = records.map((record) => {
      const fecha = record.get('fecha_reproduccion');
      return {
        id: String(record.get('id')),
        titulo: String(record.get('titulo')),
        artista: String(record.get('artista')),
        portada_url: record.get('portada_url') ?? null,
        reproducciones: this.neo4j.toNumber(record.get('reproducciones')),
        duracion: this.neo4j.toNumber(record.get('duracion')),
        fecha_reproduccion: fecha ? fecha.toISO() : null,
        duracion_escuchada: this.neo4j.toNumber(
          record.get('duracion_escuchada'),
        ),
        completada: record.get('completada') || false,
        generos: record.get('generos') as string[],
        razon: 'Escuchado recientemente',
      };
    });

    const response: RecommendationListResponse = {
      success: true,
      data: historial,
      usuario_id: userId,
      total: historial.length,
    };
    await this.setCache(cacheKey, response);
    return response;
  }

  /**
   * Invalida todas las cachés de recomendaciones (se llama tras cada sync).
   */
  async invalidateCache(): Promise<number> {
    if (!this.redis.isAvailable) return 0;
    let deleted = 0;
    deleted += await this.redis.delPattern('top-global:*');
    deleted += await this.redis.delPattern('top-country:*');
    deleted += await this.redis.delPattern('reco:user:*');
    return deleted;
  }
}
