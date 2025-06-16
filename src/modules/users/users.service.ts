import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, FindOptionsSelect, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, FindAllDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { GetUserRole } from '@common/decorators/get-role.decorator';
import { FindAllResponse, IFindAll, ORMService } from '@database/orm.service';
import { UserRole, UserStatus } from 'src/shared/user_role.enum';
import { UUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly ormService: ORMService,
  ) {}

  async createUser(createUserDto: CreateUserDto, role: UserRole): Promise<User> {
    // if creating direct new user then role must be admin
    if (role != UserRole.ADMIN) throw new Error('Only admin can create user');
    return await this.storeNewUser(createUserDto);
  }

  async storeNewUser(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return await this.usersRepository.save(user);
  }

  async findAll(query: FindAllDto, user: GetUserRole): Promise<FindAllResponse<User>> {
    const options: FindManyOptions<User> = this.roleWiseOption(user);
    return await this.ormService.findAll(this.usersRepository, options, query);
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

  private roleWiseOption(user: GetUserRole): FindManyOptions<User> {
    // admin can access all users
    if (user.role == UserRole.ADMIN) return {};
    return {};
  }
}
