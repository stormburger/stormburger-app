import {
  IsUUID,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  menu_item_id: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsArray()
  @IsUUID('4', { each: true })
  modifier_ids: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  special_instructions?: string;
}
