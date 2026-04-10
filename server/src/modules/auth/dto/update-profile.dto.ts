import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  display_name?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format. Use YYYY-MM-DD.' })
  date_of_birth?: string;

  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean;

  @IsOptional()
  @IsString()
  push_token?: string;

  @IsOptional()
  @IsUUID()
  preferred_store_id?: string;
}
