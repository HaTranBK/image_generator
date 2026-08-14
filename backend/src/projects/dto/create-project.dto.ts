import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Title of the book project', example: 'My Book' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Illustration style preference',
    example: 'Watercolor',
  })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({
    description: 'Book text content (use when not uploading a file)',
    example: 'Once upon a time...',
  })
  @IsOptional()
  @IsString()
  bookText?: string;
}
