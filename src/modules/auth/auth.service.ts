import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { GenerateTokenPayload, LoginDto, RegisterDto } from './dto/auth.dto';

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
    return { access_token: this.generateToken(user), user };
  }

  async register(registerDto: RegisterDto) {
    // check if email already registered.
    await this.checkExist(registerDto.email, 'register');
    // create new user
    const created = await this.usersService.storeNewUser(registerDto);
    // only return required details
    const user = { id: created.id, email: created.email, name: created.name, role: created.role };
    // generate token
    const token = this.generateToken(user);
    return { user, token };
  }

  private generateToken(user: GenerateTokenPayload) {
    return this.jwtService.sign(user);
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
}
