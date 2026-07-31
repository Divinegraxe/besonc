import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsOptional, IsString, Length } from 'class-validator';
import { UserService } from './user.service';

class CreateUserDto {
  @IsString() @Length(10, 15) phone!: string;
  @IsString() @Length(2, 50) name!: string;
  @IsOptional() @IsString() email?: string;
}

class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
}

@Controller()
export class UserController {
  constructor(private readonly users: UserService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.users.create({ phone: dto.phone, userType: 'customer', name: dto.name });
    return { success: true, data: user };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const user = await this.users.getById(id);
    if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    return { success: true, data: user };
  }

  @Get('phone/:phone')
  async getByPhone(@Param('phone') phone: string) {
    const user = await this.users.getByPhone(phone);
    if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    return { success: true, data: user };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.users.update(id, dto);
    if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    return { success: true, data: user };
  }
}
