import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { configuration, validationSchema } from './config';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { UsersModule } from './users/users.module';

const bullEnabled =
  process.env.NODE_ENV !== 'test' || process.env.E2E_ENABLE_BULL === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggingModule,
    ...(bullEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              connection: {
                host: configService.getOrThrow<string>('redis.host'),
                port: configService.getOrThrow<number>('redis.port'),
              },
            }),
            inject: [ConfigService],
          }),
        ]
      : []),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.getOrThrow<string>('nodeEnv');
        if (nodeEnv === 'test') {
          return {
            type: 'better-sqlite3' as const,
            database: ':memory:',
            autoLoadEntities: true,
            synchronize: true,
          };
        }
        const db = configService.getOrThrow<{
          host: string;
          port: number;
          username: string;
          password: string;
          name: string;
          synchronize: boolean;
        }>('database');
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.name,
          autoLoadEntities: true,
          synchronize: nodeEnv === 'development' || db.synchronize === true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    CommonModule,
    HealthModule,
    MetricsModule,
    ShipmentsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
