import { All, Controller, Req, Res } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('/api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
