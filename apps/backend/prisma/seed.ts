import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // 清空相关表
  await prisma.roleAssignment.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. 创建顶级权限
  await prisma.permission.createMany({
    data: [
      { label: '用户模块', value: 'USER', description: '用户相关权限', createdBy: 'seed' },
      { label: '角色模块', value: 'ROLE', description: '角色相关权限', createdBy: 'seed' },
      { label: '权限模块', value: 'PERMISSION', description: '权限相关权限', createdBy: 'seed' },
      { label: '会话模块', value: 'CONVERSATION', description: '会话相关权限', createdBy: 'seed' },
      { label: '文件模块', value: 'FILE', description: '文件相关权限', createdBy: 'seed' },
      { label: '管理员', value: 'ADMIN', description: '管理员全部权限', createdBy: 'seed' },
    ],
  });

  // 查询顶级权限id
  const userTop = await prisma.permission.findUnique({ where: { value: 'USER' } });
  const roleTop = await prisma.permission.findUnique({ where: { value: 'ROLE' } });
  const permTop = await prisma.permission.findUnique({ where: { value: 'PERMISSION' } });
  const convTop = await prisma.permission.findUnique({ where: { value: 'CONVERSATION' } });
  const fileTop = await prisma.permission.findUnique({ where: { value: 'FILE' } });
  const adminTop = await prisma.permission.findUnique({ where: { value: 'ADMIN' } });

  // 2. 创建子权限
  await prisma.permission.createMany({
    data: [
      // USER
      { label: '用户查看', value: 'USER:READ', description: '查看用户信息', parentId: userTop?.id, createdBy: 'seed' },
      { label: '用户编辑', value: 'USER:WRITE', description: '编辑用户信息', parentId: userTop?.id, createdBy: 'seed' },
      { label: '用户删除', value: 'USER:DELETE', description: '删除用户', parentId: userTop?.id, createdBy: 'seed' },
      // ROLE
      { label: '角色查看', value: 'ROLE:READ', description: '查看角色', parentId: roleTop?.id, createdBy: 'seed' },
      { label: '角色编辑', value: 'ROLE:WRITE', description: '编辑角色', parentId: roleTop?.id, createdBy: 'seed' },
      { label: '角色删除', value: 'ROLE:DELETE', description: '删除角色', parentId: roleTop?.id, createdBy: 'seed' },
      // PERMISSION
      { label: '权限查看', value: 'PERMISSION:READ', description: '查看权限', parentId: permTop?.id, createdBy: 'seed' },
      { label: '权限编辑', value: 'PERMISSION:WRITE', description: '编辑权限', parentId: permTop?.id, createdBy: 'seed' },
      { label: '权限删除', value: 'PERMISSION:DELETE', description: '删除权限', parentId: permTop?.id, createdBy: 'seed' },
      // CONVERSATION
      { label: '会话查看', value: 'CONVERSATION:READ', description: '查看会话', parentId: convTop?.id, createdBy: 'seed' },
      { label: '会话编辑', value: 'CONVERSATION:WRITE', description: '编辑会话', parentId: convTop?.id, createdBy: 'seed' },
      // FILE
      { label: '文件上传', value: 'FILE:UPLOAD', description: '上传文件', parentId: fileTop?.id, createdBy: 'seed' },
      { label: '文件删除', value: 'FILE:DELETE', description: '删除文件', parentId: fileTop?.id, createdBy: 'seed' },
      // ADMIN
      { label: '管理员全部权限', value: 'ADMIN:FULL', description: 'Full admin access', parentId: adminTop?.id, createdBy: 'seed' },
    ],
  });

  // 3. 查询所有权限id
  const allPermissions = await prisma.permission.findMany();

  // 4. 创建管理员角色，并分配所有权限
  const adminRole = await prisma.role.create({
    data: {
      label: '管理员',
      value: 'ADMIN',
      description: '拥有全部系统权限',
      createdBy: 'seed',
      permissions: {
        connect: allPermissions.map((p) => ({ id: p.id })),
      },
    },
  });

  // 5. 创建管理员用户
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedPassword = crypto
    .pbkdf2Sync('123456', salt, 1000, 64, 'sha512')
    .toString('hex');

  const adminUser = await prisma.user.create({
    data: {
      phone: '13052202624',
      password: `${salt}:${hashedPassword}`,
      username: 'admin',
      status: 1,
      emails: [],
    },
  });
  await prisma.profile.create({
    data: {
      id: adminUser.id,
      name: 'admin',
    },
  });

  // 6. 创建角色分配（RoleAssignment）
  await prisma.roleAssignment.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      createdBy: 'seed',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
