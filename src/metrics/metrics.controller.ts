import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async scrape(@Res() res: Response): Promise<void> {
    const body = await this.metricsService.getPrometheusText();
    res.setHeader('Content-Type', this.metricsService.contentType);
    res.send(body);
  }
}
