import { Controller, Get, Delete, Patch, Param, Body, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { ApiSpecEntity } from '../../entities/api-spec.entity';
import { ExecutionLogEntity } from '../../entities/execution-log.entity';
import { SavedTestCaseEntity } from '../../entities/saved-test-case.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('super-admin')
@UseGuards(JwtAuthGuard)
export class SuperAdminController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ApiSpecEntity)
    private readonly specRepository: Repository<ApiSpecEntity>,
    @InjectRepository(ExecutionLogEntity)
    private readonly logRepository: Repository<ExecutionLogEntity>,
    @InjectRepository(SavedTestCaseEntity)
    private readonly scenarioRepository: Repository<SavedTestCaseEntity>,
  ) {}

  private checkSuperAdmin(req: any) {
    if (req.user?.role !== 'superadmin') {
      throw new ForbiddenException('Super Admin access required');
    }
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    this.checkSuperAdmin(req);
    const totalUsers = await this.userRepository.count();
    const totalWorkspaces = await this.specRepository.count();
    const totalLogs = await this.logRepository.count();
    const totalScenarios = await this.scenarioRepository.count();

    return {
      totalUsers,
      totalWorkspaces,
      totalLogs,
      totalScenarios,
    };
  }

  @Get('users')
  async getUsers(@Req() req: any) {
    this.checkSuperAdmin(req);
    const users = await this.userRepository.find({
      relations: ['workspaces', 'datasets', 'mappings'],
      order: { createdAt: 'DESC' },
    });

    const logCounts = await this.logRepository
      .createQueryBuilder('log')
      .select('log.workspaceId', 'workspaceId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.workspaceId')
      .getRawMany();

    const logCountMap = new Map<string, number>();
    logCounts.forEach((lc) => {
      if (lc.workspaceId) {
        logCountMap.set(lc.workspaceId, parseInt(lc.count, 10));
      }
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      geminiApiKey: u.geminiApiKey ? '********' : null,
      createdAt: u.createdAt,
      workspacesCount: u.workspaces?.length || 0,
      datasetsCount: u.datasets?.length || 0,
      mappingsCount: u.mappings?.length || 0,
      workspaces: u.workspaces?.map((w) => ({
        id: w.id,
        title: w.title,
        version: w.version,
        sourceType: w.sourceType,
        baseUrl: w.baseUrl,
        endpointsCount: w.endpoints?.length || 0,
        logsCount: logCountMap.get(w.id) || 0,
      })) || [],
    }));
  }

  @Patch('users/:id/role')
  async changeRole(
    @Req() req: any,
    @Param('id') userId: string,
    @Body('role') role: string
  ) {
    this.checkSuperAdmin(req);
    if (!role || !['user', 'superadmin'].includes(role)) {
      throw new BadRequestException('Invalid role specified');
    }
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.role = role;
    await this.userRepository.save(user);
    return { success: true, role: user.role };
  }

  @Delete('users/:id')
  async deleteUser(@Req() req: any, @Param('id') userId: string) {
    this.checkSuperAdmin(req);
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.id === req.user.userId) {
      throw new BadRequestException('Cannot delete your own super admin account');
    }
    await this.userRepository.remove(user);
    return { success: true };
  }

  @Get('workspaces')
  async getWorkspaces(@Req() req: any) {
    this.checkSuperAdmin(req);
    const workspaces = await this.specRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return workspaces.map((w) => ({
      id: w.id,
      title: w.title,
      version: w.version,
      sourceType: w.sourceType,
      baseUrl: w.baseUrl,
      createdAt: w.createdAt,
      endpointsCount: w.endpoints?.length || 0,
      creator: w.user ? { id: w.user.id, email: w.user.email, name: w.user.name } : null,
    }));
  }

  @Delete('workspaces/:id')
  async deleteWorkspace(@Req() req: any, @Param('id') specId: string) {
    this.checkSuperAdmin(req);
    const workspace = await this.specRepository.findOneBy({ id: specId });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    await this.specRepository.remove(workspace);
    return { success: true };
  }
}
