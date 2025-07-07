import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JWT_CONSTANTS } from '../constants/jwt.constants';

interface JwtPayload {
  id: string;
  sub: string;
  phone: string;
  roles: string[];
}

interface UserWithRoles {
  id: string;
  phone: string;
  roles: Array<{ name: string }>;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: JWT_CONSTANTS.IGNORE_EXPIRATION,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = (await this.prisma.user.findUnique({
      where: { id: payload.id || payload.sub },
      include: { roles: { select: { name: true } } },
    })) as unknown as UserWithRoles | null;

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      phone: user.phone,
      roles: user.roles.map((role) => role.name),
    };
  }
}
