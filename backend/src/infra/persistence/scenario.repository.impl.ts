import { Injectable } from '@nestjs/common';
import {
  ScenarioRepository,
  TurbineQueryOptions,
} from '@/core/ports/scenario.repository';
import { Scenario } from '@/core/entities/scenario.entity';
import { Turbine } from '@/core/entities/turbine.entity';
import { WindRose } from '@/core/entities/wind-rose.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class ScenarioRepositoryImpl implements ScenarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Scenario | null> {
    const data = await this.prisma.scenario.findUnique({
      where: { id },
      include: { turbines: true },
    });

    if (!data) return null;

    const windRose = WindRose.fromJson(data.windRose);
    const turbines = data.turbines.map(
      (t) =>
        new Turbine(
          t.id,
          t.scenarioId,
          t.x,
          t.y,
          t.hubHeight,
          t.rotorD,
          t.powerCurve as any,
        ),
    );

    return new Scenario(data.id, data.name, windRose, turbines);
  }

  async save(scenario: Scenario): Promise<void> {
    await this.prisma.scenario.upsert({
      where: { id: scenario.id },
      create: {
        id: scenario.id,
        name: scenario.name,
        windRose: scenario.windRose.toJson(),
      },
      update: {
        name: scenario.name,
        windRose: scenario.windRose.toJson(),
      },
    });
  }

  async findTurbines(
    scenarioId: string,
    options?: TurbineQueryOptions,
  ): Promise<Turbine[]> {
    const { after, limit = 100, sortBy = 'id', sortOrder = 'asc' } = options || {};

    const where: any = { scenarioId };
    if (after) {
      where.id = { gt: after };
    }

    const turbines = await this.prisma.turbine.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
    });

    return turbines.map(
      (t) =>
        new Turbine(
          t.id,
          t.scenarioId,
          t.x,
          t.y,
          t.hubHeight,
          t.rotorD,
          t.powerCurve as any,
        ),
    );
  }

  async saveTurbine(turbine: Turbine): Promise<void> {
    await this.prisma.turbine.create({
      data: {
        id: turbine.id,
        scenarioId: turbine.scenarioId,
        x: turbine.x,
        y: turbine.y,
        hubHeight: turbine.hubHeight,
        rotorD: turbine.rotorD,
        powerCurve: turbine.powerCurve as any,
      },
    });
  }

  async updateTurbine(turbine: Turbine): Promise<void> {
    await this.prisma.turbine.update({
      where: { id: turbine.id },
      data: {
        x: turbine.x,
        y: turbine.y,
        hubHeight: turbine.hubHeight,
        rotorD: turbine.rotorD,
      },
    });
  }

  async deleteTurbine(id: string): Promise<void> {
    await this.prisma.turbine.delete({ where: { id } });
  }

  async saveSnapshot(
    scenarioId: string,
    version: number,
    snapshot: any,
  ): Promise<void> {
    await this.prisma.scenarioVersion.create({
      data: {
        scenarioId,
        version,
        snapshot,
      },
    });
  }

  async getLatestVersion(scenarioId: string): Promise<number> {
    const latest = await this.prisma.scenarioVersion.findFirst({
      where: { scenarioId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return latest?.version ?? 0;
  }

  async getSnapshot(scenarioId: string, version: number): Promise<any | null> {
    const data = await this.prisma.scenarioVersion.findUnique({
      where: {
        scenarioId_version: {
          scenarioId,
          version,
        },
      },
    });

    return data?.snapshot ?? null;
  }

  async saveSnapshotAtomic(scenarioId: string, snapshot: any): Promise<number> {
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const latest = await this.getLatestVersion(scenarioId);
        const newVersion = latest + 1;
        
        await this.prisma.scenarioVersion.create({
          data: {
            scenarioId,
            version: newVersion,
            snapshot,
          },
        });
        
        return newVersion;
      } catch (error: any) {
        if (error.code === 'P2002' && attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Failed to save snapshot after retries');
  }

  async getVersions(
    scenarioId: string,
  ): Promise<Array<{ version: number; createdAt: Date }>> {
    const versions = await this.prisma.scenarioVersion.findMany({
      where: { scenarioId },
      orderBy: { version: 'desc' },
      select: { version: true, createdAt: true },
    });

    return versions;
  }
}
