import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty({ message: 'Idempotency key is required' })
  idempotency_key: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  special_instructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tip_amount?: number; // cents
}
