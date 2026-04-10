import {
  IsUUID,
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateFavoriteDto {
  @IsUUID()
  menu_item_id: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  modifier_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  custom_name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}
