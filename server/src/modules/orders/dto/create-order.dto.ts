import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsUUID()
  menu_item_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsArray()
  @IsUUID('4', { each: true })
  modifier_ids: string[];

  @IsOptional()
  @IsString()
  special_instructions?: string;
}

export class CreateOrderDto {
  @IsUUID()
  location_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsString()
  @IsNotEmpty()
  idempotency_key: string;
}
