import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { ORMService } from '../../database/orm.service';
import { CommonService } from 'src/common/services/common.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, ORMService, CommonService],
  exports: [UsersService],
})
export class UsersModule {}
