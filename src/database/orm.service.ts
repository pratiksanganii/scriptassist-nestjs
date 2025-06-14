import { DeepPartial, ObjectLiteral, Repository } from 'typeorm';

export class ORMService {
  constructor() {}
  async update<T extends ObjectLiteral>(
    repo: Repository<T>,
    id: any,
    updateDto: DeepPartial<T>,
  ): Promise<T> {
    const entity = await repo.findOneBy({ id } as any);
    if (!entity) {
      throw new Error('Entity not found');
    }

    repo.merge(entity, updateDto);
    return repo.save(entity);
  }
}
