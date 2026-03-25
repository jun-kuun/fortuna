import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto, UpdateHoldingDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.asset.findMany({
      include: { holding: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { holding: true, transactions: { orderBy: { date: 'desc' } } },
    });
    if (!asset) throw new NotFoundException(`Asset #${id} not found`);
    return asset;
  }

  async create(dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: {
        name: dto.name,
        type: dto.type,
        currency: dto.currency,
        ticker: dto.ticker || null,
        holding: {
          create: {
            quantity: 0,
            avgCostPrice: 0,
            currentPrice: 0,
          },
        },
      },
      include: { holding: true },
    });
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: dto,
      include: { holding: true },
    });
  }

  async updateHolding(assetId: string, dto: UpdateHoldingDto) {
    await this.findOne(assetId);
    return this.prisma.holding.upsert({
      where: { assetId },
      create: {
        assetId,
        quantity: dto.quantity ?? 0,
        avgCostPrice: dto.avgCostPrice ?? 0,
        currentPrice: dto.currentPrice ?? 0,
      },
      update: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asset.delete({ where: { id } });
  }
}
