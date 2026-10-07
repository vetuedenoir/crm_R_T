import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '../http/index.js';

import { HealthReport } from './health.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: "État de l'API et de sa connexion à la base" })
  @ApiOkResponse({ type: HealthReport })
  @ApiServiceUnavailableResponse({
    type: ErrorResponseDto,
    description: 'Base injoignable (UNAVAILABLE)',
  })
  check(): Promise<HealthReport> {
    return this.health.check();
  }
}
