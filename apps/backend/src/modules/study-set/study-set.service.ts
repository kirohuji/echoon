import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StudyCardType, User } from '@prisma/client';
import { AddStudyCardsDto } from './dto/add-study-cards.dto';
import { CreateStudySetDto } from './dto/create-study-set.dto';
import { LearnFeedbackDto } from './dto/learn-feedback.dto';
import { ReviewStudyCardDto } from './dto/review-study-card.dto';
import { UpdateStudyCardDto } from './dto/update-study-card.dto';
import { UpdateStudySetDto } from './dto/update-study-set.dto';

@Injectable()
export class StudySetService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.studySet.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { cards: true } },
      },
    });
  }

  async create(dto: CreateStudySetDto, user: User) {
    return this.prisma.studySet.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        userId: user.id,
      },
    });
  }

  async getByIdForUser(id: string, userId: string) {
    const set = await this.prisma.studySet.findFirst({
      where: { id, userId },
      include: {
        cards: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!set) {
      throw new NotFoundException('学习集不存在');
    }

    const cardIds = set.cards.map((c) => c.id);
    const myProgresses =
      cardIds.length === 0
        ? []
        : await this.prisma.studyCardProgress.findMany({
            where: { userId, cardId: { in: cardIds } },
          });
    const allProgresses =
      cardIds.length === 0
        ? []
        : await this.prisma.studyCardProgress.findMany({
            where: { cardId: { in: cardIds } },
          });
    const progressByCard = new Map(myProgresses.map((p) => [p.cardId, p]));

    const cardStats = {
      total: set.cards.length,
      translation: set.cards.filter((c) => c.cardType === StudyCardType.translation).length,
      qa: set.cards.filter((c) => c.cardType === StudyCardType.qa).length,
    };

    const progressSummary = allProgresses.reduce(
      (acc, item) => {
        acc.correctCount += item.correctCount;
        acc.wrongCount += item.wrongCount;
        acc.knownCount += item.knownCount;
        acc.vagueCount += item.vagueCount;
        acc.unknownCount += item.unknownCount;
        return acc;
      },
      { correctCount: 0, wrongCount: 0, knownCount: 0, vagueCount: 0, unknownCount: 0 },
    );

    const uniqueLearners = new Set(allProgresses.map((p) => p.userId)).size;
    const byCard = set.cards.map((card) => {
      const rows = allProgresses.filter((p) => p.cardId === card.id);
      const learners = new Set(rows.map((r) => r.userId)).size;
      const attempts = rows.reduce((acc, r) => acc + r.correctCount + r.wrongCount, 0);
      const correct = rows.reduce((acc, r) => acc + r.correctCount, 0);
      return {
        cardId: card.id,
        label: card.term.slice(0, 20),
        learners,
        attempts,
        accuracy: attempts > 0 ? Number(((correct / attempts) * 100).toFixed(2)) : 0,
      };
    });

    return {
      ...set,
      stats: {
        cards: cardStats,
        progress: progressSummary,
        audience: {
          uniqueLearners,
          totalAttempts: progressSummary.correctCount + progressSummary.wrongCount,
        },
        charts: {
          byCard,
          levelDistribution: {
            known: progressSummary.knownCount,
            vague: progressSummary.vagueCount,
            unknown: progressSummary.unknownCount,
          },
          answerDistribution: {
            correct: progressSummary.correctCount,
            wrong: progressSummary.wrongCount,
          },
        },
      },
      cards: set.cards.map((c) => {
        const progress = progressByCard.get(c.id);
        return {
          ...c,
          progress: progress
            ? {
                correctCount: progress.correctCount,
                wrongCount: progress.wrongCount,
                knownCount: progress.knownCount,
                vagueCount: progress.vagueCount,
                unknownCount: progress.unknownCount,
                lastReviewedAt: progress.lastReviewedAt,
              }
            : null,
        };
      }),
    };
  }

  async updateSet(id: string, userId: string, dto: UpdateStudySetDto) {
    await this.ensureSetOwned(id, userId);
    const data: { title?: string; description?: string | null } = {};
    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }
    if (Object.keys(data).length === 0) {
      return this.prisma.studySet.findFirstOrThrow({ where: { id, userId } });
    }
    return this.prisma.studySet.update({
      where: { id },
      data,
    });
  }

  async deleteSet(id: string, userId: string) {
    await this.ensureSetOwned(id, userId);
    await this.prisma.studySet.delete({ where: { id } });
    return { id };
  }

  async addCards(setId: string, userId: string, dto: AddStudyCardsDto) {
    await this.ensureSetOwned(setId, userId);
    const agg = await this.prisma.studyCard.aggregate({
      where: { studySetId: setId },
      _max: { sortOrder: true },
    });
    let nextOrder = (agg._max.sortOrder ?? -1) + 1;

    const rows = dto.items.map((item) => {
      const sortOrder = item.sortOrder ?? nextOrder++;
      return {
        studySetId: setId,
        term: item.term.trim(),
        definition: item.definition.trim(),
        cardType: item.cardType ?? StudyCardType.translation,
        sortOrder,
      };
    });

    await this.prisma.studyCard.createMany({ data: rows });

    return this.prisma.studyCard.findMany({
      where: { studySetId: setId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateCard(cardId: string, userId: string, dto: UpdateStudyCardDto) {
    const card = await this.prisma.studyCard.findFirst({
      where: { id: cardId },
      include: { studySet: { select: { userId: true } } },
    });
    if (!card || card.studySet.userId !== userId) {
      throw new NotFoundException('卡片不存在');
    }
    const data: { term?: string; definition?: string; cardType?: StudyCardType; sortOrder?: number } = {};
    if (dto.term !== undefined) {
      data.term = dto.term.trim();
    }
    if (dto.definition !== undefined) {
      data.definition = dto.definition.trim();
    }
    if (dto.cardType !== undefined) {
      data.cardType = dto.cardType;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (Object.keys(data).length === 0) {
      return this.prisma.studyCard.findFirstOrThrow({ where: { id: cardId } });
    }
    return this.prisma.studyCard.update({
      where: { id: cardId },
      data,
    });
  }

  async deleteCard(cardId: string, userId: string) {
    const card = await this.prisma.studyCard.findFirst({
      where: { id: cardId },
      include: { studySet: { select: { userId: true } } },
    });
    if (!card || card.studySet.userId !== userId) {
      throw new NotFoundException('卡片不存在');
    }
    await this.prisma.studyCard.delete({ where: { id: cardId } });
    return { id: cardId };
  }

  async learnFeedback(setId: string, userId: string, dto: LearnFeedbackDto) {
    await this.ensureSetOwned(setId, userId);
    const card = await this.prisma.studyCard.findFirst({
      where: { id: dto.cardId, studySetId: setId },
      select: { id: true },
    });
    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    const now = new Date();
    const levelFieldMap = {
      known: 'knownCount',
      vague: 'vagueCount',
      unknown: 'unknownCount',
    } as const;
    const field = levelFieldMap[dto.level];

    return this.prisma.studyCardProgress.upsert({
      where: {
        userId_cardId: { userId, cardId: dto.cardId },
      },
      create: {
        userId,
        cardId: dto.cardId,
        knownCount: dto.level === 'known' ? 1 : 0,
        vagueCount: dto.level === 'vague' ? 1 : 0,
        unknownCount: dto.level === 'unknown' ? 1 : 0,
        lastReviewedAt: now,
      },
      update: {
        [field]: { increment: 1 },
        lastReviewedAt: now,
      },
    });
  }

  async review(setId: string, userId: string, dto: ReviewStudyCardDto) {
    await this.ensureSetOwned(setId, userId);
    const card = await this.prisma.studyCard.findFirst({
      where: { id: dto.cardId, studySetId: setId },
    });
    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    const now = new Date();
    return this.prisma.studyCardProgress.upsert({
      where: {
        userId_cardId: { userId, cardId: dto.cardId },
      },
      create: {
        userId,
        cardId: dto.cardId,
        correctCount: dto.correct ? 1 : 0,
        wrongCount: dto.correct ? 0 : 1,
        lastReviewedAt: now,
      },
      update: {
        ...(dto.correct
          ? { correctCount: { increment: 1 } }
          : { wrongCount: { increment: 1 } }),
        lastReviewedAt: now,
      },
    });
  }

  private async ensureSetOwned(id: string, userId: string) {
    const set = await this.prisma.studySet.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!set) {
      throw new NotFoundException('学习集不存在');
    }
  }
}
