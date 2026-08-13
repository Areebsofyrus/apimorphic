import { Controller, Post, Get, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email?: string; password?: string; name?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }
    const user = await this.authService.register(body.email, body.password, body.name);
    return { id: user.id, email: user.email, name: user.name };
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const user = await this.authService.getMe(req.user.userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      geminiApiKey: user.geminiApiKey,
    };
  }

  @Post('save-keys')
  @UseGuards(JwtAuthGuard)
  async saveKeys(@Req() req: any, @Body() body: { geminiApiKey: string }) {
    await this.authService.saveKeys(req.user.userId, body.geminiApiKey);
    return { success: true };
  }
}
