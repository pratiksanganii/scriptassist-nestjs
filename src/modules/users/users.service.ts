import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, FindOptionsSelect, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, FindAllDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { GetUserRole } from '../../common/decorators/get-role.decorator';
import { FindAllResponse, ORMService } from '../../database/orm.service';
import { UUID } from 'crypto';
import { UserRole, UserStatus } from '../../modules/users/user_role.enum';
import { CommonService } from '../../common/services/common.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly ormService: ORMService,
    private readonly commonService: CommonService,
  ) {}

  async createUser(createUserDto: CreateUserDto, user: GetUserRole): Promise<User> {
    this.commonService.checkAdmin(user);
    // when admin creates new user tokens won't be generated.
    return await this.ormService.executeTransaction(
      async manager => await this.storeNewUser(createUserDto, manager),
    );
  }

  async storeNewUser(createUserDto: CreateUserDto, manager: EntityManager): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = manager.create(User, { ...createUserDto, password: hashedPassword });
    return await manager.save(user);
  }

  async findAll(query: FindAllDto, user: GetUserRole): Promise<FindAllResponse<User>> {
    this.commonService.checkAdmin(user);
    // #pending pagination and search
    return await this.ormService.findAll(this.usersRepository, {}, query);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByEmail(email: string, attributes?: FindOptionsSelect<User>): Promise<User | null> {
    const opt: FindOneOptions<User> = { where: { email } };
    // if attributes is provided get only selected attributes
    if (attributes) opt.select = attributes;
    return await this.usersRepository.findOne(opt);
  }

  async updateUser(id: UUID, updateUserDto: UpdateUserDto, role: UserRole): Promise<User> {
    if (role != UserRole.ADMIN) throw new Error('Only admin can update user');
    return await this.update(id, updateUserDto);
  }

  async update(id: UUID, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password)
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    return await this.ormService.update(this.usersRepository, id, updateUserDto as User);
  }

  async remove(id: UUID, role: UserRole): Promise<void> {
    if (role != UserRole.ADMIN)
      throw new HttpException('Only admin can remove user', HttpStatus.UNAUTHORIZED);
    await this.ormService.update(this.usersRepository, id, { status: UserStatus.DELETED });
  }

  async checkExist(email: string) {
    const count = await this.usersRepository.count({ where: { email } });
    return count;
  }

  async logout(userId: string) {
    await this.usersRepository.update(userId, { hashedRefreshToken: null });
  }
}
