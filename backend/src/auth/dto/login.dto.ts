import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'name must not be empty' })
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
