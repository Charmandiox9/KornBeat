import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadSongDto {
  @ApiPropertyOptional({
    description:
      'Título de la canción (si se omite, se usa el metadato del MP3)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titulo?: string;

  @ApiPropertyOptional({ example: 'Rock' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  genero?: string;
}
