import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(assetId?: string) {
    return this.prisma.transaction.findMany({
      where: assetId ? { assetId } : undefined,
      include: { asset: true },
      orderBy: { date: 'desc' },
    });
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
    });
    if (!asset) throw new NotFoundException(`Asset #${dto.assetId} not found`);

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
      await this.applyAmountTransaction(dto.assetId, dto.type, dto.price);
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
      // 삭제 시 반대로 적용
      const reverseType = tx.type === 'BUY' ? 'SELL' : 'BUY';
      await this.applyAmountTransaction(tx.assetId, reverseType, tx.price);
    } else {
      await this.recalculateHolding(tx.assetId);
    }
    return tx;
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
