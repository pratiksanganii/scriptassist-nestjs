import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { GenerateTokenPayload, LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { ORMService } from 'src/database/orm.service';
import { EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { GetUserRole } from 'src/common/decorators/get-role.decorator';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly ormService: ORMService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    // check and get user
    const user = await this.checkExist(email, 'login');
    // check password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid password');
    // delete password after validating
    delete user.password;
    // generate and store access and refresh token
    const { accessToken, refreshToken } = await this.ormService.executeTransaction(
      async manager => await this.generateTokens(user, manager),
    );
    return { accessToken, refreshToken, user };
  }

  async register(registerDto: RegisterDto) {
    // check if email already registered.
    await this.checkExist(registerDto.email, 'register');
    const response = await this.ormService.executeTransaction(async manager => {
      // create new user
      const created = await this.usersService.storeNewUser(registerDto, manager);
      // only return required details
      const user = { id: created.id, email: created.email, name: created.name, role: created.role };
      // generate token
      const { accessToken, refreshToken } = await this.generateTokens(user, manager);
      return { user, accessToken, refreshToken };
    });
    return response;
  }

  private async generateTokens(user: GenerateTokenPayload, manager: EntityManager) {
    const accessToken = this.jwtService.sign(user);
    const payload = {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn'),
    };
    const refreshToken = this.jwtService.sign(user, payload);
    // store hashed refresh token and access token for single session per user
    const hashedRefreshToken = await bcrypt.hash(this.sha256(refreshToken), 10);
    await manager.update(User, { id: user.id }, { hashedRefreshToken });
    return { accessToken, refreshToken };
  }

  //#region check user exist for login, signup
  private async checkExist(email: string, type: 'register' | 'login'): Promise<any> {
    // check register
    if (type == 'register') {
      // check if user already exists
      const exist = await this.usersService.checkExist(email);
      if (exist) throw new ConflictException('Email already exists');
      else return;
    }
    // check login
    const select = { id: true, email: true, name: true, role: true, password: true };
    const findUser = await this.usersService.findByEmail(email, select);
    // if user does not exist
    if (!findUser) throw new UnauthorizedException('Invalid email');
    // return plain object
    else return { ...findUser };
  }
  //#endregion

  async refreshToken(refreshTokenDto: RefreshTokenDto, user: GetUserRole) {
    const find = await this.usersService.findOne(user.id);
    if (!find || !find.hashedRefreshToken)
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    const refreshTokenValid = await bcrypt.compare(
      this.sha256(refreshTokenDto.refreshToken),
      find.hashedRefreshToken,
    );
    if (!refreshTokenValid)
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    const { accessToken, refreshToken } = await this.ormService.executeTransaction(
      async manager => await this.generateTokens(user, manager),
    );
    return { accessToken, refreshToken };
  }

  async logout(user: GetUserRole) {
    await this.usersService.logout(user.id);
    return { message: 'Logout successful' };
  }

  sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
