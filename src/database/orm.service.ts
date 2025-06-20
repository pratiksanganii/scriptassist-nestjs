import { UUID } from 'crypto';
import {
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import dataSource from './data-source';

export const PAGE_SIZE = 10;
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
    this.prepareFindAllOpts(options, page);
    const [list, count] = await repo.findAndCount(options);
    return this.prepareFindAllResponse(list, count, options);
  }

  async findById<T extends ObjectLiteral>(repo: Repository<T>, id: UUID): Promise<T> {
    const opt: unknown = { id };
    const entity = await repo.findOneBy(opt as FindOptionsWhere<T>);
    if (!entity) throw new Error('Entity not found');
    return entity;
  }

  //#region
  prepareFindAllResponse<T extends ObjectLiteral>(
    list: T[],
    count: number,
    options: FindManyOptions<T>,
  ) {
    return {
      total: count,
      list,
      rowsPerPage: options.take ?? PAGE_SIZE,
      page: +(options.skip ?? 0) / (options.take ?? PAGE_SIZE) + 1,
      totalPages: Math.ceil(count / (options.take ?? PAGE_SIZE)),
    };
  }
  //#endregion

  //#region prepare find all options
  prepareFindAllOpts<T extends ObjectLiteral>(options: FindManyOptions<T>, page: IFindAll) {
    // check if not downloading
    if (!page.download || page.download === 'false')
      if (!page?.limit)
        // set default page size if not provided
        options.take = PAGE_SIZE;
      else options.take = +page.limit;
    if (page.page) options.skip = (options.take ?? 0) * (+page.page - 1);
    return options;
  }
  //#endregion

  //#region execute in transaction
  async executeTransaction<T>(handler: (manager: EntityManager) => Promise<T>) {
    // create connection
    const conn = dataSource.createQueryRunner();
    await conn.connect();
    await conn.startTransaction();
    try {
      const result = await handler(conn.manager);
      await conn.commitTransaction();
      return result;
    } catch (error) {
      await conn.rollbackTransaction();
      throw error;
    } finally {
      await conn.release();
    }
  }
  //#endregion
}
