import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { GetRole, GetUserRole } from 'src/common/decorators/get-role.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refreshToken')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @GetRole() user: GetUserRole) {
    return await this.authService.refreshToken(refreshTokenDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@GetRole() user: GetUserRole) {
    return await this.authService.logout(user);
  }
}
