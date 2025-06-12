import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { User } from '@modules/users/entities/user.entity';
import { FindOneOptions, FindOptionsSelect } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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

    return { access_token: this.generateToken(user.id), user };
  }

  async register(registerDto: RegisterDto) {
    // check if email already registered.
    await this.checkExist(registerDto.email, 'register');
    // create new user
    const user = await this.usersService.create(registerDto);
    // generate token
    const token = this.generateToken(user.id);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
  }

  private generateToken(userId: string) {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.usersService.findOne(userId);
    if (!user) return null;
    return user;
  }

  async validateUserRoles(userId: string, requiredRoles: string[]): Promise<boolean> {
    return true;
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
    else return findUser;
  }
  //#endregion
}
