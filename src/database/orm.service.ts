import { DeepPartial, FindManyOptions, ObjectLiteral, Repository } from 'typeorm';

const PAGE_SIZE = 10;
interface IFindAll {
  page: number;
  download: boolean;
}
export class ORMService {
  constructor() {}

  async update<T extends ObjectLiteral>(
    repo: Repository<T>,
    id: any,
    updateObj: DeepPartial<T>,
  ): Promise<T> {
    const entity = await repo.findOneBy({ id } as any);
    if (!entity) throw new Error('Entity not found');

    repo.merge(entity, updateObj);
    return await repo.save(entity);
  }

  async findAll<T extends ObjectLiteral>(
    repo: Repository<T>,
    options: FindManyOptions<T>,
    page: IFindAll,
  ) {
    if (!options?.take && !page.download) options.take = PAGE_SIZE;
    if (page.page) options.skip = (options.take ?? 0) * page.page;
    return await repo.findAndCount(options)
  }
}
