import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
        subType: dto.subType || null,
        currency: dto.currency,
        ticker: dto.ticker || null,
        interestRate: dto.interestRate ?? null,
        maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : null,
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
    const existing = await this.findOne(id);
    if (dto.type && dto.type !== existing.type) {
      // 같은 카테고리 내 변경만 허용 (국내주식 ↔ 해외주식)
      const stockTypes = ['KOREAN_STOCK', 'OVERSEAS_STOCK'];
      if (!(stockTypes.includes(existing.type) && stockTypes.includes(dto.type))) {
        throw new BadRequestException('자산 유형을 변경할 수 없습니다');
      }
    }
    const data: any = { ...dto };
    if (dto.maturityDate) data.maturityDate = new Date(dto.maturityDate);
    return this.prisma.asset.update({
      where: { id },
      data,
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
