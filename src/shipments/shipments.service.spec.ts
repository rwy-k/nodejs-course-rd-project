import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../metrics/metrics.service';
import { UserRole } from '../users/user-role.enum';
import { SHIPMENT_QUEUE_CLIENT } from './constants/shipment-queue-client.token';
import { SHIPMENT_TAG_HEAVY_CARGO } from './constants/shipment-tags.constants';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import { ShipmentsRepository } from './shipments.repository';
import { ShipmentsService } from './shipments.service';

function shipmentFixture(overrides?: Partial<Shipment>): Shipment {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    trackingNumber: 'T-1',
    payload: {
      weightKg: 55,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
    },
    pickupAddress: {
      streetLine: '1 A',
      city: 'Kyiv',
      postalCode: '01001',
      country: 'UA',
    },
    deliveryAddress: {
      streetLine: '2 B',
      city: 'Lviv',
      postalCode: '79000',
      country: 'UA',
    },
    status: ShipmentStatus.CREATED,
    clientId: '22222222-2222-2222-2222-222222222222',
    tags: [SHIPMENT_TAG_HEAVY_CARGO],
    ...overrides,
  };
}

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let repository: jest.Mocked<
    Pick<
      ShipmentsRepository,
      | 'findById'
      | 'save'
      | 'createEntity'
      | 'findAll'
      | 'findAllByClientId'
      | 'remove'
      | 'findByTrackingNumber'
    >
  >;

  beforeEach(async () => {
    const mockRepository: jest.Mocked<
      Pick<
        ShipmentsRepository,
        | 'findById'
        | 'save'
        | 'createEntity'
        | 'findAll'
        | 'findAllByClientId'
        | 'remove'
        | 'findByTrackingNumber'
      >
    > = {
      findById: jest.fn(),
      save: jest.fn(),
      createEntity: jest.fn((partial) => ({ ...partial }) as Shipment),
      findAll: jest.fn(),
      findAllByClientId: jest.fn(),
      remove: jest.fn(),
      findByTrackingNumber: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: ShipmentsRepository, useValue: mockRepository },
        {
          provide: MetricsService,
          useValue: { recordShipmentCreated: jest.fn() },
        },
        { provide: SHIPMENT_QUEUE_CLIENT, useValue: null },
      ],
    }).compile();

    service = moduleRef.get(ShipmentsService);
    repository = moduleRef.get(ShipmentsRepository);
  });

  describe('update (business logic without real database)', () => {
    it('applies status from DTO and removes HEAVY_CARGO when weight ≤ 50', async () => {
      const existing = shipmentFixture({
        status: ShipmentStatus.CREATED,
        payload: {
          weightKg: 40,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
        },
        tags: [SHIPMENT_TAG_HEAVY_CARGO, 'CUSTOM'],
      });
      repository.findById.mockResolvedValue({ ...existing });
      repository.save.mockImplementation((s: Shipment) =>
        Promise.resolve({ ...s }),
      );

      const dto: UpdateShipmentDto = { status: ShipmentStatus.PROCESSING };
      const result = await service.update(existing.id, dto, {
        userId: existing.clientId,
        role: UserRole.CLIENT,
      });

      expect(result.status).toBe(ShipmentStatus.PROCESSING);
      expect(result.tags).toEqual(expect.arrayContaining(['CUSTOM']));
      expect(result.tags).not.toContain(SHIPMENT_TAG_HEAVY_CARGO);
      expect(repository.findById).toHaveBeenCalledWith(existing.id);
      expect(repository.save).toHaveBeenCalled();
    });

    it('applies status from DTO and keeps HEAVY_CARGO when weight > 50', async () => {
      const existing = shipmentFixture({
        status: ShipmentStatus.CREATED,
        payload: {
          weightKg: 60,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
        },
        tags: [],
      });
      repository.findById.mockResolvedValue({ ...existing });
      repository.save.mockImplementation((s: Shipment) =>
        Promise.resolve({ ...s }),
      );

      const dto: UpdateShipmentDto = {
        status: ShipmentStatus.READY_FOR_PICKUP,
      };
      const result = await service.update(existing.id, dto, {
        userId: existing.clientId,
        role: UserRole.CLIENT,
      });

      expect(result.status).toBe(ShipmentStatus.READY_FOR_PICKUP);
      expect(result.tags).toContain(SHIPMENT_TAG_HEAVY_CARGO);
    });
  });
});
