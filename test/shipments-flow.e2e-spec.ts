import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ShipmentStatus } from '../src/shipments/entities/shipment.entity';

function httpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

function decodeJwtSub(accessToken: string): string {
  const decoded = jwt.decode(accessToken);
  if (
    decoded === null ||
    typeof decoded !== 'object' ||
    typeof (decoded as { sub?: unknown }).sub !== 'string'
  ) {
    throw new Error('Invalid access token payload');
  }
  return (decoded as { sub: string }).sub;
}

async function waitForShipmentStatusViaApi(
  server: Server,
  accessToken: string,
  shipmentId: string,
  expected: ShipmentStatus,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request(server)
      .get(`/shipments/${shipmentId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    if (res.status === 200) {
      const status = (res.body as { status?: ShipmentStatus }).status;
      if (status === expected) {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  const last = await request(server)
    .get(`/shipments/${shipmentId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  const lastStatus = (last.body as { status?: ShipmentStatus }).status;
  throw new Error(
    `Timeout: shipment ${shipmentId} API status is ${lastStatus ?? 'missing'} (http ${last.status}), expected ${expected}`,
  );
}

describe('Shipments flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register → create shipment → GET /shipments/:id returns READY_FOR_PICKUP', async () => {
    const email = `e2e-${Date.now()}@integration.test`;
    const password = 'password12345';

    const registerRes = await request(httpServer(app))
      .post('/auth/register')
      .send({ email, password })
      .expect((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Register: expected 200/201, got ${res.status}`);
        }
      });

    const registerBody = registerRes.body as { access_token: string };
    const accessToken = registerBody.access_token;
    expect(accessToken).toBeDefined();
    const clientId = decodeJwtSub(accessToken);

    const trackingNumber = `E2E-TRK-${Date.now()}`;
    const createRes = await request(httpServer(app))
      .post('/shipments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        trackingNumber,
        clientId,
        payload: {
          weightKg: 12,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
        },
        pickupAddress: {
          streetLine: '1 Test St',
          city: 'Kyiv',
          postalCode: '01001',
          country: 'UA',
        },
        deliveryAddress: {
          streetLine: '2 Other Ave',
          city: 'Lviv',
          postalCode: '79000',
          country: 'UA',
        },
      })
      .expect(201);

    const created = createRes.body as { id: string; status: ShipmentStatus };
    const shipmentId = created.id;
    expect(created.status).toBe(ShipmentStatus.CREATED);

    await waitForShipmentStatusViaApi(
      httpServer(app),
      accessToken,
      shipmentId,
      ShipmentStatus.READY_FOR_PICKUP,
      15_000,
    );
    const finalRes = await request(httpServer(app))
      .get(`/shipments/${shipmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((finalRes.body as { status: ShipmentStatus }).status).toBe(
      ShipmentStatus.READY_FOR_PICKUP,
    );
  });
});
