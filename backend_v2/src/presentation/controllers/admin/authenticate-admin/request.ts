import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AuthenticateAdminRequest {
  @ApiProperty({ example: 'admin@pulse.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'your-password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
