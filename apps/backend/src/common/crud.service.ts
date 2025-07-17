import { PrismaService } from '@/common/prisma/prisma.service';
import { User } from '@prisma/client';

export class CrudService<T> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly modelName: string, // 比如 'user'
  ) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, user?: User) {
    if(user){
      return this.prisma[this.modelName].create({ data: { ...data, createdBy: user.id, userId: user.id, updatedBy: user.id, createdAt: new Date(), updatedAt: new Date() } });
    } else {
      return this.prisma[this.modelName].create({ data: { ...data, createdAt: new Date(), updatedAt: new Date(), createdBy: 'system', updatedBy: 'system' } });
    }
  }

  async findAll() {
    return this.prisma[this.modelName].findMany();
  }

  async findOne(id: number) {
    return this.prisma[this.modelName].findUnique({ where: { id } });
  }

  async update(id: number, data: Partial<T>) {
    return this.prisma[this.modelName].update({ where: { id }, data });
  }

  async remove(id: number) {
    return this.prisma[this.modelName].delete({ where: { id } });
  }
  
  async paginate(page: number, limit: number, mine: boolean, user: User) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma[this.modelName].findMany({ skip, take: limit, where: { ...(mine ? { userId: user.id } : {}) } }),
      this.prisma[this.modelName].count({ where: { ...(mine ? { userId: user.id } : {}) } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}