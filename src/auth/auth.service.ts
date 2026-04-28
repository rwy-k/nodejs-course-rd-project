import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../users/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string; role: UserRole } | null> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user?.passwordHash) {
      return null;
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return null;
    }
    return { id: user.id, email: user.email, role: user.role };
  }

  async register(dto: AuthCredentialsDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.usersService.create(dto.email, passwordHash);
      return this.issueTokens(user.id, user.email, user.role);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('User with this email already exists');
      }
      throw err;
    }
  }

  login(user: { id: string; email: string; role: UserRole }) {
    return this.issueTokens(user.id, user.email, user.role);
  }

  private issueTokens(userId: string, email: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, email, role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    if (err instanceof QueryFailedError) {
      const driver = err.driverError as { code?: string } | undefined;
      if (driver?.code === '23505') {
        return true;
      }
      if (
        typeof err.message === 'string' &&
        err.message.includes('SQLITE_CONSTRAINT')
      ) {
        return true;
      }
    }
    return false;
  }
}
