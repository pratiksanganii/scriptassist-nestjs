import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, FindOptionsSelect, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, FindAllDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@common/decorators/get-role.decorator';
import { IFindAll, ORMService } from '@database/orm.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly ormService: ORMService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return await this.usersRepository.save(user);
  }

  async findAll(query: FindAllDto, user: UserRole): Promise<[User[], number]> {
    const options: FindManyOptions<User> = {};
    const page: IFindAll = { page: +query.page };
    return await this.ormService.findAll(this.usersRepository, options, page);
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password)
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);

    this.usersRepository.merge(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async checkExist(email: string) {
    const count = await this.usersRepository.count({ where: { email } });
    return count;
  }
}
