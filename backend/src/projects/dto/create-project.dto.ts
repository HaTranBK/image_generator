import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  style?: string;
}
