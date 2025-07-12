import { PrismaService } from '@/common/prisma/prisma.service';
import { User } from '@prisma/client';

export class CrudService<T> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly modelName: string, // 比如 'user'
  ) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, user?: User) {
    if(user){
      return this.prisma[this.modelName].create({ data: { ...data, createdBy: user.id, userId: user.id } });
    } else {
      return this.prisma[this.modelName].create({ data });
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
  
  async paginate(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma[this.modelName].findMany({ skip, take: limit }),
      this.prisma[this.modelName].count(),
    ]);
    return { data, total };
  }
}