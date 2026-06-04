import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard_ } from '../auth/guard';
import { CurrentUser } from '../auth/decorator';

@ApiTags('Users')
@UseGuards(AuthGuard_)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the authenticated user's profile" })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully.',
  })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(userId, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete the authenticated user's profile" })
  @ApiResponse({
    status: 200,
    description: 'User profile deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  deleteMe(@CurrentUser('id') id: string) {
    return this.usersService.deleteMe(id);
  }
}
