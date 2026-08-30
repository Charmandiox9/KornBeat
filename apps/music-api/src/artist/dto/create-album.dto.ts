import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAlbumDto {
  @ApiProperty({ example: 'Primer Álbum' })
  @IsString()
  @IsNotEmpty({ message: 'El título del álbum es obligatorio' })
  @MaxLength(100)
  titulo: string;

  @ApiPropertyOptional({ description: 'Año de lanzamiento', example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;
}
