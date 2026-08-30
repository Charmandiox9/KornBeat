import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateArtistRequestDto {
  @ApiProperty({ description: 'Nombre artístico', example: 'Los Korn' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre artístico es obligatorio' })
  @MaxLength(100)
  artistName: string;

  @ApiPropertyOptional({ description: 'Género principal', example: 'Rock' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  genre?: string;

  @ApiPropertyOptional({
    description: 'Breve descripción o biografía',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Enlaces (Spotify, Instagram, web...)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  links?: string;
}
