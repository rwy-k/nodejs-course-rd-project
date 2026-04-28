import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Shipment } from './entities/shipment.entity';
import { ShipmentsService } from './shipments.service';

type AuthedRequest = Request & {
  user: { userId: string; email: string; role: UserRole };
};

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  create(
    @Req() req: AuthedRequest,
    @Body() dto: CreateShipmentDto,
  ): Promise<Shipment> {
    if (dto.clientId !== req.user.userId) {
      throw new ForbiddenException(
        'clientId must match the authenticated user',
      );
    }
    return this.shipmentsService.create(dto);
  }

  @Get()
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.DRIVER)
  findAll(@Req() req: AuthedRequest): Promise<Shipment[]> {
    return this.shipmentsService.findAll({
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Get(':id')
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.DRIVER)
  findOne(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Shipment> {
    return this.shipmentsService.findOne(id, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Patch(':id')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.update(id, dto, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Delete(':id')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.shipmentsService.remove(id, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }
}
