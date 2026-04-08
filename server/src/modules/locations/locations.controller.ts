import { Controller, Get, Param } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  findAll() {
    return this.locationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Get(':id/hours')
  getHours(@Param('id') id: string) {
    return this.locationsService.getHours(id);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.locationsService.getOpenStatus(id);
  }
}
