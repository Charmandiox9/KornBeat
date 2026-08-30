export interface Recommendation {
  id: string;
  titulo: string;
  artista: string;
  portada_url: string | null;
  reproducciones: number;
  duracion: number;
  generos_match?: string[];
  generos?: string[];
  score?: number;
  razon?: string;
  artista_nombre?: string;
  oyentes_artista?: number;
  factor_viral?: number | string | null;
  fecha_reproduccion?: string | Date | null;
  duracion_escuchada?: number;
  completada?: boolean;
}

export interface RecommendationListResponse {
  success: true;
  data: Recommendation[];
  total: number;
  usuario_id?: string;
  country?: string;
  warning?: string | null;
  info?: string;
}
