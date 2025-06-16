import { UUID } from 'crypto';
import { DeepPartial, FindManyOptions, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

const PAGE_SIZE = 10;
export interface IFindAll {
  page: string | number;
  limit?: string | number;
  download?: 'false' | 'true' | boolean;
}

export interface FindAllResponse<T> {
  list: T[];
  total: number;
  page: number;
  totalPages: number;
  rowsPerPage: number;
}

export class ORMService {
  constructor() {}

  async update<T extends ObjectLiteral>(
    repo: Repository<T>,
    id: UUID,
    updateObj: DeepPartial<T>,
  ): Promise<T> {
    // check exist and get old object
    const entity = await this.findById(repo, id);
    repo.merge(entity, updateObj);
    return await repo.save(entity);
  }

  async findAll<T extends ObjectLiteral>(
    repo: Repository<T>,
    options: FindManyOptions<T>,
    page: IFindAll,
  ): Promise<FindAllResponse<T>> {
    // check if not downloading
    if (!page.download || page.download === 'false')
      if (!page?.limit)
        // set default page size if not provided
        options.take = PAGE_SIZE;
      else options.take = +page.limit;
    if (page.page) options.skip = (options.take ?? 0) * +page.page;
    const [list, count] = await repo.findAndCount(options);
    return {
      total: count,
      list,
      rowsPerPage: options.take ?? 0,
      page: +(page.page ?? 1),
      totalPages: Math.ceil(count / (options.take ?? 0)),
    };
  }

  async findById<T extends ObjectLiteral>(repo: Repository<T>, id: UUID): Promise<T> {
    const opt: unknown = { id };
    const entity = await repo.findOneBy(opt as FindOptionsWhere<T>);
    if (!entity) throw new Error('Entity not found');
    return entity;
  }
}
