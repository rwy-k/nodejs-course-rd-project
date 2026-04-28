import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IncomingMessage, ServerResponse } from 'http';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.getOrThrow<string>('nodeEnv');
        const isProd = nodeEnv === 'production';
        const isTest = nodeEnv === 'test';
        return {
          pinoHttp: {
            level: isTest ? 'silent' : isProd ? 'info' : 'debug',
            autoLogging: !isTest,
            ...(!isTest && !isProd
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: { colorize: true, singleLine: true },
                  },
                }
              : {}),
            serializers: {
              req(req: IncomingMessage) {
                return {
                  method: req.method,
                  url: req.url,
                };
              },
              res(res: ServerResponse) {
                return {
                  statusCode: res.statusCode,
                };
              },
            },
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
