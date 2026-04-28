# Опис проєкту та технологій

## Призначення

Сервіс керування логістичними відправленнями (shipments).
API реалізує:

- реєстрацію та логін користувачів;
- рольову модель доступу (`CLIENT`, `ADMIN`, `DRIVER`);
- CRUD для відправлень;
- фонову обробку статусів через чергу;
- технічні ендпойнти health/metrics.

Бекенд побудований на NestJS (TypeScript), основна БД - PostgreSQL, черги - Redis + BullMQ.

---

## Архітектура (модулі)

| Модуль | Відповідальність |
|---|---|
| `auth` | `POST /auth/register`, `POST /auth/login`, JWT, local/JWT стратегії Passport. |
| `users` | Сутність користувача, ролі, доступ до користувачів для auth. |
| `shipments` | CRUD відправлень, бізнес-правила тегів, постановка джоб у чергу `shipment-processing`. |
| `common` | RBAC: `@Roles()`, `RolesGuard`. |
| `config` | Завантаження `.env(.local)` і валідація env через Joi. |
| `health` | `GET /health` через Terminus: перевірка БД та Redis. |
| `metrics` | `GET /metrics` у форматі Prometheus (`prom-client`). |
| `logging` | Структуроване логування через `nestjs-pino` / `pino-http`. |

Ключові глобальні налаштування:

- `ValidationPipe` (`transform`, `whitelist`);
- `TypeOrmModule.forRootAsync` (PostgreSQL у звичайному режимі, in-memory SQLite у `NODE_ENV=test`);
- `BullModule.forRootAsync` (у тестах за замовчуванням вимкнено, вмикається через `E2E_ENABLE_BULL=true`).

---

## Технологічний стек

### Платформа

- Node.js (у Docker-образі - Node 22 Alpine);
- TypeScript;
- NestJS 11 + Express adapter.

### Дані та інфраструктура

- TypeORM 0.3;
- PostgreSQL (`pg`);
- Redis (`ioredis`) для BullMQ та health-перевірок;
- BullMQ + `@nestjs/bullmq` для фонових задач.

### Безпека та валідація

- `@nestjs/jwt`, `@nestjs/passport`, `passport-local`, `passport-jwt`;
- `bcrypt` для хешування паролів;
- `class-validator` + `class-transformer` для DTO;
- `Joi` для валідації змінних оточення.

### Спостережуваність

- `@nestjs/terminus` (`/health`);
- `prom-client` (`/metrics`);
- `nestjs-pino`, `pino`, `pino-http`, `pino-pretty`.

### Якість і тести

- ESLint 9 + TypeScript ESLint;
- Prettier;
- Jest + Supertest;
- test suites: unit, e2e, e2e integration.

### Контейнеризація та CI/CD

- Docker + Docker Compose (`api`, `postgres`, `redis`);
- GitHub Actions workflows:
  - `main.yml` - lint, тести, збірка Docker image (блокуючий CI для `main`);
  - `deploy.yml` - ручний деплой-хук (Render);
  - `deploy-aws-ecr.yml` - автоматичний продакшен-ланцюжок після **успішного `Main` workflow** на `main`:
    1) build/push образу в Amazon ECR (`latest` + commit SHA);
    2) SSH-деплой на EC2: login у ECR, `docker compose pull api`, `docker compose up -d --no-build`;
    3) smoke-check `GET /health` через `SMOKE_EC2_BASE_URL`;
    4) fail-fast: workflow завершується з помилкою, якщо не налаштовані секрети, SSH-деплой неуспішний або smoke-check повертає помилку.
  - `smoke-ec2.yml` - окрема smoke-перевірка доступності EC2 HTTP.

---

## Доменна модель

### User

- `id` (UUID);
- `email` (унікальний);
- `passwordHash`;
- `role`: `CLIENT` | `ADMIN` | `DRIVER`.

### Shipment

- `id` (UUID), `trackingNumber` (унікальний), `clientId` (UUID);
- `payload`: `weightKg`, `lengthCm`, `widthCm`, `heightCm`;
- `pickupAddress` / `deliveryAddress` (JSON-об'єкти адреси);
- `status`: `CREATED`, `PROCESSING`, `READY_FOR_PICKUP`, `DELIVERED`;
- `tags`: масив рядків (`HEAVY_CARGO` автоматично додається, якщо вага > 50 кг).

---

## Основні HTTP-ендпойнти

| Метод | Шлях | Призначення |
|---|---|---|
| `POST` | `/auth/register` | Реєстрація користувача, повернення JWT. |
| `POST` | `/auth/login` | Логін, повернення JWT. |
| `POST` | `/shipments` | Створення відправлення (JWT + роль `CLIENT`). |
| `GET` | `/shipments` | Отримання списку відправлень. |
| `GET` | `/shipments/:id` | Отримання одного відправлення. |
| `PATCH` | `/shipments/:id` | Оновлення відправлення. |
| `DELETE` | `/shipments/:id` | Видалення відправлення. |
| `GET` | `/health` | Перевірка готовності сервісу. |
| `GET` | `/metrics` | Метрики у форматі Prometheus. |

Доступ контролюється `JwtAuthGuard` + `RolesGuard`; для `POST /shipments` є додаткове правило: `clientId` у body має збігатися з `sub` з JWT.

---

## Змінні оточення

Приклад - у `.env.example`.

Основні групи:

- `NODE_ENV`, `PORT`;
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`;
- `REDIS_HOST`, `REDIS_PORT`;
- `JWT_SECRET`, `JWT_EXPIRES_IN`.

Для інтеграційних e2e із чергою:

- `E2E_ENABLE_BULL`;
- `E2E_SHIPMENT_PROCESSING_DELAY_MS`.

---

## Базові команди

```bash
npm install
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm run test
npm run test:e2e
npm run test:e2e:integration
docker compose up --build
```

---

## Структура `src` (скорочено)

```text
src/
  auth/
  users/
  shipments/
  common/
  config/
  health/
  metrics/
  logging/
  main.ts
  app.module.ts
```
