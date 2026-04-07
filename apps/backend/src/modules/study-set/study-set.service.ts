import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StudyCardType, User } from '@prisma/client';
import axios from 'axios';
import { AddStudyCardsDto } from './dto/add-study-cards.dto';
import { CreateStudySetDto } from './dto/create-study-set.dto';
import { LearnFeedbackDto } from './dto/learn-feedback.dto';
import { PracticeEvaluateDto } from './dto/practice-evaluate.dto';
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

  async practiceEvaluate(setId: string, userId: string, dto: PracticeEvaluateDto) {
    await this.ensureSetOwned(setId, userId);
    const card = await this.prisma.studyCard.findFirst({
      where: { id: dto.cardId, studySetId: setId },
    });
    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return this.fallbackLocalPracticeEvaluate(dto.userAnswer, card.definition);
    }

    const cardTypeLabel = card.cardType === StudyCardType.qa ? '问答题' : '翻译题';
    const promptStem =
      card.cardType === StudyCardType.qa
        ? `题目：${card.term}`
        : `请翻译的原文：${card.term}`;

    try {
      const rawContent = await this.callDeepSeekPracticeEvaluate({
        cardTypeLabel,
        promptStem,
        referenceAnswer: card.definition,
        userAnswer: dto.userAnswer.trim(),
      });
      const parsed = this.parsePracticeEvaluateContent(rawContent);
      if (parsed) {
        return {
          verdict: parsed.verdict,
          countsAsCorrect: parsed.countsAsCorrect,
          feedback: parsed.feedback,
          tips: parsed.tips,
          comparisonNote: parsed.comparisonNote,
          aiAvailable: true,
        };
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error('DeepSeek practice evaluate failed');
    }

    const local = this.fallbackLocalPracticeEvaluate(dto.userAnswer, card.definition);
    return {
      ...local,
      feedback:
        local.feedback === '与参考答案一致。'
          ? local.feedback
          : `${local.feedback}（AI 暂不可用，已用简单对比代替）`,
    };
  }

  private normalizePracticeAnswer(value: string) {
    return value.trim().toLowerCase();
  }

  private fallbackLocalPracticeEvaluate(userAnswer: string, expected: string) {
    const ok = this.normalizePracticeAnswer(userAnswer) === this.normalizePracticeAnswer(expected);
    return {
      verdict: ok ? ('correct' as const) : ('incorrect' as const),
      countsAsCorrect: ok,
      feedback: ok ? '与参考答案一致。' : '与参考答案不完全一致。',
      tips: ok ? '' : '可对照参考答案，尝试抓住关键词并用自己的话表达。',
      comparisonNote: '',
      aiAvailable: false,
    };
  }

  private parsePracticeEvaluateContent(content: unknown): null | {
    verdict: 'correct' | 'partial' | 'incorrect';
    countsAsCorrect: boolean;
    feedback: string;
    tips: string;
    comparisonNote: string;
  } {
    const raw =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? (content as unknown[])
              .map((item) =>
                typeof item === 'string'
                  ? item
                  : item && typeof item === 'object' && 'text' in item && typeof (item as { text: unknown }).text === 'string'
                    ? (item as { text: string }).text
                    : ''
              )
              .join('\n')
          : '';
    const trimmed = raw.trim();
    if (!trimmed) return null;
    let jsonStr = trimmed;
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence?.[1]) jsonStr = fence[1].trim();
    try {
      const o = JSON.parse(jsonStr) as Record<string, unknown>;
      const verdict = o.verdict;
      if (verdict !== 'correct' && verdict !== 'partial' && verdict !== 'incorrect') return null;
      const tipsRaw = o.tips;
      const tipsStr =
        typeof tipsRaw === 'string'
          ? tipsRaw
          : Array.isArray(tipsRaw)
            ? tipsRaw.map((item) => String(item)).join('\n')
            : String(tipsRaw ?? '');
      return {
        verdict,
        countsAsCorrect: Boolean(o.countsAsCorrect),
        feedback: String(o.feedback ?? ''),
        tips: tipsStr,
        comparisonNote: String(o.comparisonNote ?? ''),
      };
    } catch {
      return null;
    }
  }

  private async callDeepSeekPracticeEvaluate(input: {
    cardTypeLabel: string;
    promptStem: string;
    referenceAnswer: string;
    userAnswer: string;
  }) {
    const apiKey = process.env.DEEPSEEK_API_KEY!.trim();
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '你是语言学习批改助手。根据题型、题干、参考答案和用户答案判断对错并给出简短中文反馈。只输出一个 JSON 对象，不要 Markdown，不要其它说明文字。',
          },
          {
            role: 'user',
            content: [
              `题型：${input.cardTypeLabel}`,
              input.promptStem,
              `参考答案：${input.referenceAnswer}`,
              `用户答案：${input.userAnswer}`,
              '',
              '输出 JSON，仅含以下字段：',
              '{"verdict":"correct|partial|incorrect","countsAsCorrect":布尔,"feedback":"2-4句总评","tips":"可执行的改进建议","comparisonNote":"用户答案与参考答案的差异简述，无则空字符串"}',
              '规则：语义正确可判 correct；小错误可判 partial；错误明显为 incorrect。partial 时若基本可用可将 countsAsCorrect 设为 true，否则 false。',
            ].join('\n'),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      },
    );
    return response?.data?.choices?.[0]?.message?.content;
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
