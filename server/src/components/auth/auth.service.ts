import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { CreateUserDto } from '../users/dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/signin.dto';

import { User } from 'src/types/service';
import { AppResponse } from 'src/types/app';
import { AppUtils } from 'src/common/utils/Utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private async generateToken(user: User) {
    return this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN'),
      },
    );
  }

  private async authenticateUser(
    user: User,
    statusCode: HttpStatus,
  ): Promise<AppResponse<any>> {
    const accessToken = await this.generateToken(user);

    return AppUtils.successResponse(
      'Authentication successful',
      {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      statusCode,
    );
  }

  async signUp(dto: CreateUserDto) {
    const { name, email, password } = dto;

    const existingUser = await this.prisma.users.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return this.authenticateUser(user, HttpStatus.CREATED);
  }

  async signIn(dto: SignInDto) {
    const { email, password } = dto;

    const user = await this.prisma.users.findFirst({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return this.authenticateUser(user, HttpStatus.OK);
  }
}
