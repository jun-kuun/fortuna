import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(assetId?: string, page = 1, limit = 20) {
    const where = assetId ? { assetId } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { asset: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!tx) throw new NotFoundException(`Transaction #${id} not found`);
    return tx;
  }

  async create(dto: CreateTransactionDto) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
      include: { holding: true },
    });
    if (!asset) throw new NotFoundException(`Asset #${dto.assetId} not found`);

    // 매도 시 보유량 초과 검증
    if (dto.type === 'SELL' && asset.holding) {
      const isAmountBased = asset.type === 'DEPOSIT' || asset.type === 'REAL_ESTATE';
      if (isAmountBased && asset.type !== 'DEPOSIT') {
        // 부동산: 금액 초과 검증
        const currentAmount = asset.holding.avgCostPrice;
        if (dto.price > currentAmount) {
          throw new BadRequestException('보유 금액을 초과하여 처리할 수 없습니다');
        }
      } else if (!isAmountBased) {
        // 주식/금: 수량 초과 검증
        if (dto.quantity > asset.holding.quantity) {
          throw new BadRequestException('보유 수량을 초과하여 매도할 수 없습니다');
        }
      }
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        assetId: dto.assetId,
        type: dto.type,
        quantity: dto.quantity,
        price: dto.price,
        fee: dto.fee ?? 0,
        date: new Date(dto.date),
        memo: dto.memo,
      },
      include: { asset: true },
    });

    const isAmountBased = asset.type === 'DEPOSIT' || asset.type === 'REAL_ESTATE';
    if (isAmountBased) {
      if (asset.type === 'DEPOSIT' && dto.type === 'SELL') {
        // 예적금 해지 = 전액 출금, 원금 리셋
        await this.resetHolding(dto.assetId);
      } else {
        await this.applyAmountTransaction(dto.assetId, dto.type, dto.price);
      }
    } else {
      await this.recalculateHolding(dto.assetId);
    }

    return transaction;
  }

  async remove(id: string) {
    const tx = await this.findOne(id);
    const asset = await this.prisma.asset.findUnique({ where: { id: tx.assetId } });
    await this.prisma.transaction.delete({ where: { id } });

    const isAmountBased = asset?.type === 'DEPOSIT' || asset?.type === 'REAL_ESTATE';
    if (isAmountBased) {
      if (asset?.type === 'DEPOSIT' && tx.type === 'SELL') {
        // 해지 거래 삭제 → 남은 납입 거래로 원금 복원
        await this.recalculateDepositHolding(tx.assetId);
      } else {
        const reverseType = tx.type === 'BUY' ? 'SELL' : 'BUY';
        await this.applyAmountTransaction(tx.assetId, reverseType, tx.price);
      }
    } else {
      await this.recalculateHolding(tx.assetId);
    }
    return tx;
  }

  /** 예적금 해지: 원금 전액 리셋 */
  private async resetHolding(assetId: string) {
    await this.prisma.holding.upsert({
      where: { assetId },
      create: { assetId, quantity: 1, avgCostPrice: 0, currentPrice: 0 },
      update: { avgCostPrice: 0, currentPrice: 0 },
    });
  }

  /** 예적금 해지 취소: 남은 납입 거래 합산으로 원금 복원 */
  private async recalculateDepositHolding(assetId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { assetId },
      orderBy: { date: 'asc' },
    });

    let total = 0;
    for (const tx of transactions) {
      if (tx.type === 'BUY') total += tx.price;
      // 다른 SELL(해지)이 남아있으면 리셋
      if (tx.type === 'SELL') { total = 0; }
    }

    await this.prisma.holding.upsert({
      where: { assetId },
      create: { assetId, quantity: 1, avgCostPrice: total, currentPrice: total },
      update: { avgCostPrice: total, currentPrice: total },
    });
  }

  /** 예적금/부동산: 기존 금액에 직접 증감 */
  private async applyAmountTransaction(assetId: string, type: string, amount: number) {
    const holding = await this.prisma.holding.findUnique({ where: { assetId } });
    const currentAmount = holding?.avgCostPrice ?? 0;
    const newAmount = Math.max(0, type === 'BUY' ? currentAmount + amount : currentAmount - amount);

    await this.prisma.holding.upsert({
      where: { assetId },
      create: { assetId, quantity: 1, avgCostPrice: newAmount, currentPrice: newAmount },
      update: { avgCostPrice: newAmount, currentPrice: newAmount },
    });
  }

  /** 주식/금: 거래 전체 재계산으로 수량 + 평균 단가 산출 */
  private async recalculateHolding(assetId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { assetId },
      orderBy: { date: 'asc' },
    });

    let quantity = 0;
    let totalCost = 0;

    for (const tx of transactions) {
      if (tx.type === 'BUY') {
        totalCost += tx.quantity * tx.price + tx.fee;
        quantity += tx.quantity;
      } else {
        const sellRatio = tx.quantity / (quantity || 1);
        totalCost -= totalCost * sellRatio;
        quantity -= tx.quantity;
      }
    }

    const avgCostPrice = quantity > 0 ? totalCost / quantity : 0;

    await this.prisma.holding.upsert({
      where: { assetId },
      create: {
        assetId,
        quantity: Math.max(0, quantity),
        avgCostPrice: Math.max(0, avgCostPrice),
        currentPrice: 0,
      },
      update: {
        quantity: Math.max(0, quantity),
        avgCostPrice: Math.max(0, avgCostPrice),
      },
    });
  }
}
