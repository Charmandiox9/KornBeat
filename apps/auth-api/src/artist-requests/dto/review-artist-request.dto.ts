import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class ReviewArtistRequestDto {
  @ApiProperty({ enum: ['approve', 'reject'], example: 'approve' })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ description: 'Motivo del rechazo (obligatorio si action=reject)' })
  @ValidateIf((o) => o.action === 'reject')
  @IsString()
  @MaxLength(500)
  reason?: string;
}
