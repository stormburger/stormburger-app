import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  display_name?: string;

  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean;

  @IsOptional()
  @IsString()
  push_token?: string;

  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  push_platform?: 'ios' | 'android' | 'web';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  push_device_id?: string;

  @IsOptional()
  @IsString()
  preferred_store_id?: string;
}
