import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StudyCardType, User } from '@prisma/client';
import axios from 'axios';
import { AddStudyCardsDto } from './dto/add-study-cards.dto';
import { CreateStudySetDto } from './dto/create-study-set.dto';
import { LearnFeedbackDto } from './dto/learn-feedback.dto';
import { PracticeEvaluateDto } from './dto/practice-evaluate.dto';
import { PracticeTeachDto } from './dto/practice-teach.dto';
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
    const isQa = card.cardType === StudyCardType.qa;
    const translatePromise =
      isQa && apiKey ? this.translateStudyQuestionToZh(card.term) : Promise.resolve<string | null>(null);

    if (!apiKey) {
      const local = this.fallbackLocalPracticeEvaluate(dto.userAnswer, card.definition);
      return { ...local, aiAvailable: false, questionTranslation: null };
    }

    const cardTypeLabel = card.cardType === StudyCardType.qa ? '问答题' : '翻译题';
    const promptStem =
      card.cardType === StudyCardType.qa
        ? `题目：${card.term}`
        : `请翻译的原文：${card.term}`;

    let questionTranslation: string | null = null;

    try {
      const [rawContent, translated] = await Promise.all([
        this.callDeepSeekPracticeEvaluate({
          cardTypeLabel,
          promptStem,
          referenceAnswer: card.definition,
          userAnswer: dto.userAnswer.trim(),
        }),
        translatePromise,
      ]);
      questionTranslation = translated;
      const parsed = this.parsePracticeEvaluateContent(rawContent);
      if (parsed) {
        return {
          ...this.normalizeEvaluateResponse(parsed),
          aiAvailable: true,
          questionTranslation,
        };
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error('DeepSeek practice evaluate failed');
    }

    if (questionTranslation === null && isQa && apiKey) {
      questionTranslation = await translatePromise;
    }

    const local = this.fallbackLocalPracticeEvaluate(dto.userAnswer, card.definition);
    return {
      ...local,
      summary:
        local.summary === '与参考答案一致。'
          ? local.summary
          : `${local.summary}（AI 暂不可用，已用简单对比代替）`,
      feedback:
        local.feedback === '与参考答案一致。'
          ? local.feedback
          : `${local.feedback}（AI 暂不可用，已用简单对比代替）`,
      questionTranslation,
    };
  }

  async practiceTeach(setId: string, userId: string, dto: PracticeTeachDto) {
    await this.ensureSetOwned(setId, userId);
    const card = await this.prisma.studyCard.findFirst({
      where: { id: dto.cardId, studySetId: setId },
    });
    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    const isQa = card.cardType === StudyCardType.qa;
    const translatePromise =
      isQa && apiKey ? this.translateStudyQuestionToZh(card.term) : Promise.resolve<string | null>(null);

    if (!apiKey) {
      const local = this.fallbackLocalPracticeTeach(card);
      return { ...local, questionTranslation: null };
    }

    const cardTypeLabel = card.cardType === StudyCardType.qa ? '问答题' : '翻译题';
    const promptStem =
      card.cardType === StudyCardType.qa
        ? `题目：${card.term}`
        : `请翻译的原文：${card.term}`;

    let questionTranslation: string | null = null;

    try {
      const [rawContent, translated] = await Promise.all([
        this.callDeepSeekPracticeTeach({
          cardTypeLabel,
          promptStem,
          referenceAnswer: card.definition,
        }),
        translatePromise,
      ]);
      questionTranslation = translated;
      const parsed = this.parsePracticeTeachContent(rawContent);
      if (parsed) {
        return {
          ...this.normalizeTeachResponse(parsed),
          aiAvailable: true,
          questionTranslation,
        };
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error('DeepSeek practice teach failed');
    }

    if (questionTranslation === null && isQa && apiKey) {
      questionTranslation = await translatePromise;
    }

    const local = this.fallbackLocalPracticeTeach(card);
    return {
      bodyMd: `${local.bodyMd}\n\n> *AI 暂不可用，以上为本地简要提示。*`,
      aiAvailable: false,
      questionTranslation,
    };
  }

  /** 问答题题干译为简体中文（仅输出译文）。 */
  private async translateStudyQuestionToZh(term: string): Promise<string | null> {
    const text = term.trim();
    if (!text) return null;
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) return null;
    try {
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content:
                '你是翻译助手。将用户给出的题目原文译为流畅的简体中文。只输出译文本身，不要引号、前缀或解释。',
            },
            { role: 'user', content: text },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        },
      );
      const raw = response?.data?.choices?.[0]?.message?.content;
      const content =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw
                .map((item: unknown) =>
                  typeof item === 'string'
                    ? item
                    : item && typeof item === 'object' && 'text' in item
                      ? String((item as { text: unknown }).text ?? '')
                      : ''
                )
                .join('\n')
            : '';
      const trimmed = content.trim().replace(/^["「]|["」]$/g, '');
      return trimmed || null;
    } catch {
      return null;
    }
  }

  private normalizePracticeAnswer(value: string) {
    return value.trim().toLowerCase();
  }

  private fallbackLocalPracticeEvaluate(userAnswer: string, expected: string) {
    const ok = this.normalizePracticeAnswer(userAnswer) === this.normalizePracticeAnswer(expected);
    const summary = ok ? '**一致**：与参考答案要点相符。' : '**不一致**：关键词或表述与参考有出入。';
    const tip = ok ? '' : '对照参考补 **关键词**，用自己的话精简改写。';
    const tipsStr = ok ? '' : tip;
    return {
      verdict: ok ? ('correct' as const) : ('incorrect' as const),
      countsAsCorrect: ok,
      accuracyScore: ok ? 100 : 0,
      summary,
      strengths: ok ? ['关键信息与参考一致'] : [],
      issues: ok ? [] : [{ detail: '表述与参考未完全对齐', suggestion: tip }],
      actionSteps: ok ? [] : [tip],
      gapVsReference: '',
      feedback: summary,
      tips: tipsStr,
      comparisonNote: '',
      aiAvailable: false,
    };
  }

  /** 将解析结果对齐为对外 DTO（含兼容字段 feedback / tips / comparisonNote）。 */
  private normalizeEvaluateResponse(parsed: {
    verdict: 'correct' | 'partial' | 'incorrect';
    countsAsCorrect: boolean;
    accuracyScore: number | null;
    summary: string;
    strengths: string[];
    issues: Array<{ aspect?: string; detail: string; suggestion: string }>;
    actionSteps: string[];
    gapVsReference: string;
    feedback: string;
    tips: string;
    comparisonNote: string;
  }) {
    const softened = this.softenEvaluation(parsed);
    return {
      verdict: softened.verdict,
      countsAsCorrect: softened.countsAsCorrect,
      accuracyScore: softened.accuracyScore,
      summary: softened.summary,
      strengths: softened.strengths,
      issues: softened.issues,
      actionSteps: softened.actionSteps,
      gapVsReference: softened.gapVsReference,
      feedback: softened.feedback,
      tips: softened.tips,
      comparisonNote: softened.comparisonNote,
    };
  }

  /** 避免“高分但措辞苛刻”的体验：语义基本正确时默认更宽容。 */
  private softenEvaluation(parsed: {
    verdict: 'correct' | 'partial' | 'incorrect';
    countsAsCorrect: boolean;
    accuracyScore: number | null;
    summary: string;
    strengths: string[];
    issues: Array<{ aspect?: string; detail: string; suggestion: string }>;
    actionSteps: string[];
    gapVsReference: string;
    feedback: string;
    tips: string;
    comparisonNote: string;
  }) {
    const out = {
      ...parsed,
      strengths: [...parsed.strengths],
      issues: [...parsed.issues],
      actionSteps: [...parsed.actionSteps],
    };
    const score = out.accuracyScore ?? 0;

    // 高分下不再“吹毛求疵”：partial + 80+ 升级为 correct。
    if (out.verdict === 'partial' && score >= 80) {
      out.verdict = 'correct';
      out.countsAsCorrect = true;
      if (!out.summary || out.summary.includes('部分正确')) {
        out.summary = '**基本正确**：核心语义准确，仅有轻微措辞可优化。';
      }
      if (out.feedback.includes('部分正确')) {
        out.feedback = out.summary;
      }
      // 高分时建议最多 1 条，避免打击感。
      if (out.issues.length > 1) out.issues = out.issues.slice(0, 1);
      if (out.actionSteps.length > 1) out.actionSteps = out.actionSteps.slice(0, 1);
    }

    if (out.verdict === 'correct') {
      out.countsAsCorrect = true;
      if (out.accuracyScore !== null && out.accuracyScore < 80) {
        out.accuracyScore = 80;
      }
    }

    return out;
  }

  private coerceMessageContentToString(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return (content as unknown[])
      .map((item) =>
        typeof item === 'string'
          ? item
          : item && typeof item === 'object' && 'text' in item && typeof (item as { text: unknown }).text === 'string'
            ? (item as { text: string }).text
            : '',
      )
      .join('\n');
  }

  private extractJsonObjectFromModelText(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    let jsonStr = trimmed;
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence?.[1]) jsonStr = fence[1].trim();
    try {
      const o = JSON.parse(jsonStr) as Record<string, unknown>;
      return o && typeof o === 'object' ? o : null;
    } catch {
      return null;
    }
  }

  private clampScore0to100(value: unknown): number | null {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private parseStringList(o: unknown): string[] {
    if (!Array.isArray(o)) return [];
    return o.map((item) => String(item).trim()).filter(Boolean);
  }

  private parseIssuesRaw(o: unknown): Array<{ aspect?: string; detail: string; suggestion: string }> {
    if (!Array.isArray(o)) return [];
    return o
      .map((item) => {
        if (typeof item === 'string') {
          const s = item.trim();
          return s ? { detail: s, suggestion: '' } : null;
        }
        if (item && typeof item === 'object') {
          const r = item as Record<string, unknown>;
          const detail = String(r.detail ?? r.issue ?? r.message ?? '').trim();
          const suggestion = String(r.suggestion ?? r.fix ?? '').trim();
          const aspect = String(r.aspect ?? r.area ?? '').trim();
          if (!detail && !suggestion) return null;
          return {
            ...(aspect ? { aspect } : {}),
            detail: detail || suggestion,
            suggestion: suggestion || detail,
          };
        }
        return null;
      })
      .filter((x): x is { aspect?: string; detail: string; suggestion: string } => Boolean(x));
  }

  private parsePracticeEvaluateContent(content: unknown): null | {
    verdict: 'correct' | 'partial' | 'incorrect';
    countsAsCorrect: boolean;
    accuracyScore: number | null;
    summary: string;
    strengths: string[];
    issues: Array<{ aspect?: string; detail: string; suggestion: string }>;
    actionSteps: string[];
    gapVsReference: string;
    feedback: string;
    tips: string;
    comparisonNote: string;
  } {
    const o = this.extractJsonObjectFromModelText(this.coerceMessageContentToString(content));
    if (!o) return null;

    const verdict = o.verdict;
    if (verdict !== 'correct' && verdict !== 'partial' && verdict !== 'incorrect') return null;

    let summary = String(o.summary ?? o.feedback ?? '').trim();
    const tipsRaw = o.tips;
    const tipsStrLegacy =
      typeof tipsRaw === 'string'
        ? tipsRaw
        : Array.isArray(tipsRaw)
          ? tipsRaw.map((item) => String(item)).join('\n')
          : String(tipsRaw ?? '');

    let actionSteps = this.parseStringList(o.actionSteps);
    if (actionSteps.length === 0 && tipsStrLegacy.trim()) {
      actionSteps = tipsStrLegacy
        .split(/\n|;|；/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    let strengths = this.parseStringList(o.strengths);
    const gapVsReference = String(o.gapVsReference ?? o.comparisonNote ?? '').trim();
    let issues = this.parseIssuesRaw(o.issues);
    if (issues.length === 0 && Array.isArray(o.whatToFix)) {
      issues = this.parseIssuesRaw(o.whatToFix);
    }

    let accuracyScore = this.clampScore0to100(o.accuracyScore);
    if (accuracyScore === null) {
      if (verdict === 'correct') accuracyScore = 95;
      else if (verdict === 'partial') accuracyScore = 60;
      else accuracyScore = 30;
    }

    if (!summary) {
      summary =
        verdict === 'correct'
          ? '**正确**：整体可用。'
          : verdict === 'partial'
            ? '**部分正确**：差一两处。'
            : '**需改进**：对照参考调整要点。';
    }

    const tipsOut = actionSteps.length > 0 ? actionSteps.join('\n') : tipsStrLegacy;
    return {
      verdict,
      countsAsCorrect: Boolean(o.countsAsCorrect),
      accuracyScore,
      summary,
      strengths,
      issues,
      actionSteps,
      gapVsReference,
      feedback: summary,
      tips: tipsOut,
      comparisonNote: gapVsReference,
    };
  }

  private async callDeepSeekPracticeEvaluate(input: {
    cardTypeLabel: string;
    promptStem: string;
    referenceAnswer: string;
    userAnswer: string;
  }) {
    const apiKey = process.env.DEEPSEEK_API_KEY!.trim();
    const schema = [
      '{',
      '  "verdict": "correct|partial|incorrect",',
      '  "countsAsCorrect": true 或 false,',
      '  "accuracyScore": 0-100 整数,',
      '  "summary": "1～2 短句中文，可用 **加粗** 标关键词",',
      '  "strengths": 最多 2 条、每条 ≤24 字，可为 []',
      '  "issues": 最多 2 条 {"aspect?":"可省","detail":"问题","suggestion":"改法"}，可 []',
      '  "actionSteps": 最多 2 条、每条 ≤28 字',
      '  "gapVsReference": "与参考差异一句内，无则空串，可用 **词** 强调"',
      '}',
    ].join('\n');

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '你是语言学习批改助手。只输出一个 JSON 对象，不要代码围栏、不要任何 JSON 外的文字。各 **字符串字段值** 内可使用 Markdown 子集：`**加粗**`、必要时一行内用 `；` 分隔，勿写长段落。',
          },
          {
            role: 'user',
            content: [
              `题型：${input.cardTypeLabel}`,
              input.promptStem,
              `参考答案：${input.referenceAnswer}`,
              `用户答案：${input.userAnswer}`,
              '',
              '务必精炼。输出 JSON（严格包含这些键）：',
              schema,
              '规则：优先判断语义是否正确，不要求与参考答案逐字一致；同义表达、语序差异、风格差异通常不降为 incorrect。',
              '当核心语义正确且可理解时，优先给 correct 或 partial 且 countsAsCorrect=true；仅在关键信息缺失/相反时给 incorrect。',
              '反馈语气鼓励，避免吹毛求疵。accuracyScore 与 verdict 一致。',
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

  private fallbackLocalPracticeTeach(card: { term: string; definition: string; cardType: StudyCardType }) {
    const isQa = card.cardType === StudyCardType.qa;
    const hint = isQa
      ? '- 圈出题干关键词\n- 先列 2 个必答点，再各写一句\n- 最后用参考答案对一下漏项'
      : '- 划出谓语与时态\n- 分块直译再顺语序\n- 对照参考补缺词';
    const refPeek = `${card.definition.slice(0, 120)}${card.definition.length > 120 ? '…' : ''}`;
    const bodyMd = [
      '## 思路',
      '',
      isQa ? '看清「问什么」，先要点后展开，控制在两三句。' : '抓谓语和修饰关系，先对后顺。',
      '',
      '## 步骤',
      '',
      hint,
      '',
      '## 参考片段',
      '',
      `\`${refPeek}\``,
    ].join('\n');
    return { bodyMd, aiAvailable: false };
  }

  private normalizeTeachResponse(parsed: { bodyMd: string }) {
    return { bodyMd: parsed.bodyMd };
  }

  /** 兼容旧版模型按分字段返回时拼成一段 Markdown */
  private composeTeachBodyMdFromParts(input: {
    approach: string;
    keyPoints: string[];
    steps: string[];
    exampleOutline: string;
    pitfalls: string[];
  }) {
    const lines: string[] = [];
    if (input.approach) {
      lines.push('## 思路', '', input.approach, '');
    }
    if (input.keyPoints.length) {
      lines.push('## 要点', '', ...input.keyPoints.map((s) => `- ${s}`), '');
    }
    if (input.steps.length) {
      lines.push('## 步骤', '', ...input.steps.map((s, i) => `${i + 1}. ${s}`), '');
    }
    if (input.exampleOutline) {
      lines.push('## 示例', '', input.exampleOutline, '');
    }
    if (input.pitfalls.length) {
      lines.push('## 易错', '', ...input.pitfalls.map((s) => `- ${s}`), '');
    }
    return lines.join('\n').trim();
  }

  private parsePracticeTeachContent(content: unknown): null | { bodyMd: string } {
    const o = this.extractJsonObjectFromModelText(this.coerceMessageContentToString(content));
    if (!o) return null;

    let bodyMd = String(o.bodyMd ?? o.body ?? o.contentMd ?? '').trim();
    if (bodyMd) {
      return { bodyMd };
    }

    let approach = String(o.approach ?? o.idea ?? o['思路'] ?? '').trim();
    const keyPoints = this.parseStringList(o.keyPoints ?? o.points ?? o['要点']);
    const steps = this.parseStringList(o.steps ?? o.actionSteps ?? o['步骤']);
    const exampleOutline = String(
      o.exampleOutline ?? o.sampleAnswer ?? o['示例要点'] ?? o.example ?? '',
    ).trim();
    const pitfalls = this.parseStringList(o.pitfalls ?? o.commonMistakes ?? o['易错点']);

    if (!approach && keyPoints.length === 0 && steps.length === 0 && !exampleOutline) {
      return null;
    }
    if (!approach) approach = '先理解题目考查点，再组织要点作答。';

    bodyMd = this.composeTeachBodyMdFromParts({
      approach,
      keyPoints: keyPoints.length ? keyPoints : ['抓题干关键词', '短句写完整'],
      steps: steps.length ? steps : ['列要点 → 连成答案 → 对照参考'],
      exampleOutline: exampleOutline || '*（可用自己的话先写一版，再对照参考答案。）*',
      pitfalls: pitfalls.length ? pitfalls : ['漏掉限定词', '术语不一致'],
    });
    return { bodyMd };
  }

  private async callDeepSeekPracticeTeach(input: {
    cardTypeLabel: string;
    promptStem: string;
    referenceAnswer: string;
  }) {
    const apiKey = process.env.DEEPSEEK_API_KEY!.trim();
    const schema = [
      '{',
      '  "bodyMd": "字符串：整篇讲解用 Markdown 写成，必须精炼（全文约 120～240 字）。"',
      '}',
      '',
      'bodyMd 内容结构（按需选用小节标题，勿堆砌）：',
      '- 使用二级标题：## 思路、## 要点、## 步骤、## 示例、## 易错',
      '- 要点/易错用 - 列表；步骤用 1. 2. 编号；可加 **关键词** 加粗',
      '- 不要输出代码围栏；不要复述整段参考答案，示例只给骨架或半句',
    ].join('\n');

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        temperature: 0.35,
        messages: [
          {
            role: 'system',
            content:
              '你是语言学习导师。用户点了「不会/放弃」，尚未作答；用简短 Markdown 教他怎么答。只输出一个 JSON 对象，键仅含 bodyMd，bodyMd 的值是纯 Markdown 文本（可含 ##、列表、**加粗**）。不要包裹在 ``` 里，不要其它说明。',
          },
          {
            role: 'user',
            content: [
              `题型：${input.cardTypeLabel}`,
              input.promptStem,
              `参考答案（内部参照，勿大段照抄）：${input.referenceAnswer}`,
              '',
              '输出 JSON：',
              schema,
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
