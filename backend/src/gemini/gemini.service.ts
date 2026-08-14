/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type { Project } from '@prisma/client';
import { Character, Chapter, Portrait, Illustration } from '../common/types';
import { StorageService } from '../storage/storage.service';

export interface StyleResult {
  style: string;
  styleInteractionId: string;
}

export interface CharactersResult {
  characters: Character[];
  charactersInteractionId: string;
}

export interface ChaptersResult {
  chapters: Chapter[];
  chaptersInteractionId: string;
}

export interface BookUploadResult {
  bookFileUri: string;
  bookInteractionId: string;
}

// 1x1 violet pixel PNG to mock visual generations when running in mock mode or quota exhausted
const MOCK_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai!: GoogleGenAI;
  private readonly isMockText: boolean = false;
  private readonly isMockImage: boolean = false;

  // Modern Gemini 3.6 Flash model for text interaction chain
  private readonly TEXT_MODEL = 'gemini-3.6-flash';
  // Gemini 3.1 Flash Image model (Nano Banana 2 family) for visual content generation
  private readonly IMAGE_MODEL = 'gemini-3.1-flash-image';

  constructor(private readonly storageService: StorageService) {
    const apiKey = process.env.GEMINI_API_KEY;
    const mockGemini = process.env.MOCK_GEMINI === 'true';
    const mockImages = process.env.MOCK_IMAGES === 'true';

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. All operations will run in MOCK mode.',
      );
      this.isMockText = true;
      this.isMockImage = true;
      return;
    }

    this.ai = new GoogleGenAI({ apiKey });

    if (mockGemini) {
      this.isMockText = true;
      this.isMockImage = true;
      this.logger.log(
        'GeminiService running in FULL MOCK mode. All API calls skipped.',
      );
    } else if (mockImages) {
      this.isMockImage = true;
      this.logger.log(
        'GeminiService running in IMAGE MOCK mode. Only image generation API calls will be skipped.',
      );
    } else {
      this.logger.log(
        'GeminiService running in REAL mode. All calls will hit Gemini API.',
      );
    }
  }

  /**
   * Upload book text to Gemini File API and start the interaction chain.
   * Returns the file URI and the first interaction ID.
   */
  async uploadBookAndStartChain(bookText: string): Promise<BookUploadResult> {
    if (this.isMockText) {
      return {
        bookFileUri: 'mock://files/book.txt',
        bookInteractionId: 'mock-interaction-0',
      };
    }

    this.logger.log('Uploading book text to Gemini File API...');
    const blob = new Blob([bookText], { type: 'text/plain' });
    const uploadedFile = await this.ai.files.upload({
      file: blob,
      config: { mimeType: 'text/plain', displayName: 'book.txt' },
    });

    const bookFileUri = uploadedFile.uri!;
    this.logger.log(`Book uploaded: ${bookFileUri}`);

    const interaction = await this.ai.interactions.create({
      model: this.TEXT_MODEL,
      input: [
        {
          type: 'document',
          uri: bookFileUri,
          mime_type: 'text/plain',
        } as any,
        {
          type: 'text',
          text: 'I am uploading this book for AI illustration. Please acknowledge you have received it.',
        } as any,
      ],
    });

    const bookInteractionId = interaction.id;
    return { bookFileUri, bookInteractionId };
  }

  /**
   * Ensure the book file URI is still valid.
   */
  async ensureFileUri(project: Project): Promise<string> {
    if (this.isMockText) return 'mock://files/book.txt';

    if (project.bookFileUri) {
      try {
        const name = project.bookFileUri.split('/').pop();
        if (name) {
          await this.ai.files.get({ name });
          return project.bookFileUri;
        }
      } catch {
        this.logger.warn(
          `Book file URI expired for project ${project.id}, re-uploading...`,
        );
      }
    }

    const bookText = await this.storageService.readBookText(project.id);
    const blob = new Blob([bookText], { type: 'text/plain' });
    const uploadedFile = await this.ai.files.upload({
      file: blob,
      config: { mimeType: 'text/plain', displayName: 'book.txt' },
    });
    return uploadedFile.uri!;
  }

  /**
   * Step 1 — Generate or confirm the art style.
   */
  async runStyle(
    bookInteractionId: string,
    userStyle?: string,
  ): Promise<StyleResult> {
    if (this.isMockText) {
      const style = userStyle
        ? `Custom Style confirmed: ${userStyle}. Apply soft edges and color tone.`
        : 'Warm storybook watercolor style, soft ink outlines with light pastel hues.';
      return { style, styleInteractionId: 'mock-interaction-1' };
    }

    this.logger.log('Step 1: Generating style via Interactions API...');

    let prompt: string;
    if (userStyle) {
      prompt = `The user has chosen the following art style for the illustrations: "${userStyle}". Please confirm this style and describe it in detail (2-3 sentences) as it should be applied to all illustrations of this book.`;
    } else {
      prompt = `Based on the book's text, themes, and tone, suggest the most appropriate art style for the illustrations. Describe the style in 2-3 sentences. Only output the style description, nothing else.`;
    }

    const interaction = await this.ai.interactions.create({
      model: this.TEXT_MODEL,
      input: prompt,
      previous_interaction_id: bookInteractionId,
    });

    const style = interaction.output_text ?? '';
    const styleInteractionId = interaction.id;

    return { style, styleInteractionId };
  }

  /**
   * Step 2 — Extract characters.
   */
  async runCharacters(styleInteractionId: string): Promise<CharactersResult> {
    if (this.isMockText) {
      const characters: Character[] = [
        {
          id: 'char-1',
          name: 'Protagonist Alice',
          prompt:
            'A young girl in a blue dress with golden hair, looking curious.',
        },
        {
          id: 'char-2',
          name: 'The White Rabbit',
          prompt:
            'An elegant white rabbit wearing a waistcoat, holding a pocket watch.',
        },
      ];
      return { characters, charactersInteractionId: 'mock-interaction-2' };
    }

    this.logger.log('Step 2: Extracting characters via Interactions API...');

    const prompt = `Based on the book text, identify the main adult characters (maximum 2). For each character, provide:
- name: the character's name
- prompt: a detailed image generation prompt for their portrait, in the established art style

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"id": "char-1", "name": "...", "prompt": "..."}, ...]`;

    const interaction = await this.ai.interactions.create({
      model: this.TEXT_MODEL,
      input: prompt,
      previous_interaction_id: styleInteractionId,
    });

    const raw = interaction.output_text ?? '';

    let characters: Character[] = [];
    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      characters = JSON.parse(cleaned) as Character[];
    } catch {
      this.logger.error(`Failed to parse characters JSON: ${raw}`);
      throw new Error(
        'Gemini returned invalid JSON for characters. Please retry.',
      );
    }

    characters = characters.slice(0, 2).map((c, i) => ({
      ...c,
      id: c.id || `char-${i + 1}`,
    }));

    const charactersInteractionId = interaction.id;

    return { characters, charactersInteractionId };
  }

  /**
   * Step 3 — Generate portraits.
   */
  async runPortraits(
    characters: Character[],
    style: string,
    projectId: string,
    onPortraitDone: (portrait: Portrait) => Promise<void>,
  ): Promise<void> {
    this.logger.log(`Step 3: Generating portraits...`);

    for (const character of characters) {
      this.logger.log(`Generating portrait for ${character.name}...`);

      let base64Data: string;
      if (this.isMockImage) {
        // Sleep 1s to simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 1000));
        base64Data = MOCK_PNG_BASE64;
      } else {
        const prompt = `Generate a portrait image of ${character.name}. Style: ${style}. ${character.prompt}. Square format, close-up portrait, no text or labels.`;
        const response = await this.ai.models.generateContent({
          model: this.IMAGE_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        base64Data = this.extractImage(
          response,
          `portrait of ${character.name}`,
        );
      }

      const filename = `${character.id}.png`;
      const localPath = await this.storageService.saveImage(
        projectId,
        'portraits',
        filename,
        base64Data,
      );

      let geminiFileUri = 'mock://files/portrait.png';
      if (!this.isMockImage) {
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        const uploadedPortrait = await this.ai.files.upload({
          file: blob,
          config: {
            mimeType: 'image/png',
            displayName: `portrait-${character.id}.png`,
          },
        });
        geminiFileUri = uploadedPortrait.uri!;
      }

      const portrait: Portrait = {
        characterId: character.id,
        localPath,
        geminiFileUri,
      };

      await onPortraitDone(portrait);
    }
  }

  /**
   * Step 4 — Extract chapter scene illustration prompts.
   */
  async runChapters(charactersInteractionId: string): Promise<ChaptersResult> {
    if (this.isMockText) {
      const chapters: Chapter[] = [
        {
          id: 'chap-1',
          name: 'Down the Rabbit Hole',
          prompt:
            'Alice falls down a deep rabbit hole lined with bookshelves and maps.',
        },
      ];
      return { chapters, chaptersInteractionId: 'mock-interaction-4' };
    }

    this.logger.log('Step 4: Extracting chapters via Interactions API...');

    const prompt = `Based on the book text and the characters we identified, generate illustration prompts for the most important scene or chapter (maximum 1 chapter). For each chapter, provide:
- name: a short descriptive name for the scene/chapter
- prompt: a detailed scene illustration prompt that references the characters and established art style

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"id": "chap-1", "name": "...", "prompt": "..."}]`;

    const interaction = await this.ai.interactions.create({
      model: this.TEXT_MODEL,
      input: prompt,
      previous_interaction_id: charactersInteractionId,
    });

    const raw = interaction.output_text ?? '';

    let chapters: Chapter[] = [];
    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      chapters = JSON.parse(cleaned) as Chapter[];
    } catch {
      this.logger.error(`Failed to parse chapters JSON: ${raw}`);
      throw new Error(
        'Gemini returned invalid JSON for chapters. Please retry.',
      );
    }

    chapters = chapters
      .slice(0, 1)
      .map((c, i) => ({ ...c, id: c.id || `chap-${i + 1}` }));
    const chaptersInteractionId = interaction.id;

    return { chapters, chaptersInteractionId };
  }

  /**
   * Step 5 — Generate scene illustrations.
   */
  async runIllustrations(
    chapters: Chapter[],
    portraits: Portrait[],
    style: string,
    projectId: string,
    onIllustrationDone: (illustration: Illustration) => Promise<void>,
  ): Promise<void> {
    this.logger.log(`Step 5: Generating illustrations...`);

    for (const chapter of chapters) {
      this.logger.log(`Generating illustration for "${chapter.name}"...`);

      let base64Data: string;
      if (this.isMockImage) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        base64Data = MOCK_PNG_BASE64;
      } else {
        const portraitParts = portraits
          .filter((p) => p.geminiFileUri)
          .map((p) => ({
            fileData: { mimeType: 'image/png', fileUri: p.geminiFileUri },
          }));

        const textPrompt = `Generate a scene illustration for: "${chapter.name}". Style: ${style}. Scene description: ${chapter.prompt}. The characters depicted should look consistent with the portrait images provided. Wide format scene illustration, cinematic composition, no text or labels.`;

        const response = await this.ai.models.generateContent({
          model: this.IMAGE_MODEL,
          contents: [
            {
              role: 'user',
              parts: [...portraitParts, { text: textPrompt }],
            },
          ],
        });

        base64Data = this.extractImage(
          response,
          `illustration of "${chapter.name}"`,
        );
      }

      const filename = `${chapter.id}.png`;
      const localPath = await this.storageService.saveImage(
        projectId,
        'illustrations',
        filename,
        base64Data,
      );

      const illustration: Illustration = {
        chapterId: chapter.id,
        localPath,
      };

      await onIllustrationDone(illustration);
    }
  }

  /**
   * Defensive helper to extract an inline image part from Gemini response.
   */
  private extractImage(response: any, context: string): string {
    try {
      const candidates = response?.candidates ?? [];
      for (const candidate of candidates) {
        const parts = candidate?.content?.parts ?? [];
        for (const part of parts) {
          if (part?.inlineData?.data) {
            return part.inlineData.data;
          }
        }
      }
      throw new Error(`No inline image data found in response for ${context}`);
    } catch (e) {
      this.logger.error(`[extractImage] Failed for ${context}: ${String(e)}`);
      throw e;
    }
  }
}
