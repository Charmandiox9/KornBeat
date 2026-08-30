import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { Recommendation } from '@kornbeat/shared';

@ObjectType()
export class RecommendationGql {
  @Field(() => ID) id: string;
  @Field() titulo: string;
  @Field() artista: string;
  @Field(() => String, { nullable: true }) portadaUrl: string | null;
  @Field(() => Int) reproducciones: number;
  @Field(() => Int) duracion: number;
  @Field(() => String, { nullable: true }) artistaNombre?: string | null;
  @Field(() => [String], { nullable: true }) generos?: string[] | null;
  @Field(() => [String], { nullable: true }) generosMatch?: string[] | null;
  @Field(() => Float, { nullable: true }) score?: number | null;
  @Field(() => Float, { nullable: true }) oyentesArtista?: number | null;
  @Field(() => String, { nullable: true }) factorViral?: string | null;
  @Field(() => String, { nullable: true }) fechaReproduccion?: string | null;
  @Field(() => Int, { nullable: true }) duracionEscuchada?: number | null;
  @Field(() => Boolean, { nullable: true }) completada?: boolean | null;
  @Field(() => String, { nullable: true }) razon?: string | null;
}

export function toRecommendationGql(r: Recommendation): RecommendationGql {
  const out: Record<string, unknown> = {
    id: r.id,
    titulo: r.titulo,
    artista: r.artista,
    portadaUrl: r.portada_url ?? null,
    reproducciones: Number(r.reproducciones ?? 0),
    duracion: Number(r.duracion ?? 0),
  };
  const optional: Array<[string, unknown]> = [
    ['artistaNombre', r.artista_nombre],
    ['generos', r.generos],
    ['generosMatch', r.generos_match],
    ['score', r.score],
    ['oyentesArtista', r.oyentes_artista],
    ['factorViral', r.factor_viral],
    ['fechaReproduccion', r.fecha_reproduccion],
    ['duracionEscuchada', r.duracion_escuchada],
    ['completada', r.completada],
    ['razon', r.razon],
  ];
  for (const [key, value] of optional) {
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out as unknown as RecommendationGql;
}
