import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserInputDTO, UpdateUserInputDTO } from './dto/user.dto';
import { RolesGuard, UseRole } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseRole('admin')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/')
  async getUser(@Query('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Post('/create')
  async createUser(@Body() input: CreateUserInputDTO) {
    return this.userService.create(input);
  }

  @Post('/update')
  async updateUser(@Body() input: UpdateUserInputDTO) {
    return this.userService.update(input);
  }

  @Get('/list')
  async getUsers(
    @Query('id') ids: string[],
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.userService.getUsers({
      page,
      limit,
      ids,
    });
  }
}
