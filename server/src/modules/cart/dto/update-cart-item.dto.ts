import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateCartItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  modifier_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  special_instructions?: string;
}
