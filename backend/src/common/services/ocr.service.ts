/**
 * Service do domínio de infraestrutura compartilhada; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private available: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.available === null) {
      try {
        await execPromise('which tesseract');
        this.available = true;
        this.logger.log('Tesseract OCR detectado');
      } catch {
        this.available = false;
        this.logger.warn(
          'Tesseract OCR nao instalado. sudo apt install tesseract-ocr tesseract-ocr-por',
        );
      }
    }
    return this.available;
  }

  /**
   * Extrai texto de imagem ou PDF via Tesseract OCR local.
   * Retorna null se OCR não disponível ou falhar.
   */
  async extractText(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string | null> {
    if (!(await this.isAvailable())) return null;

    const tmpDir = '/tmp/ocr_finanza';
    fs.mkdirSync(tmpDir, { recursive: true });

    const stamp = Date.now();
    const isPdf = mimeType === 'application/pdf';
    const inPath = path.join(tmpDir, `in_${stamp}${isPdf ? '.pdf' : '.png'}`);
    let text = '';

    try {
      fs.writeFileSync(inPath, fileBuffer);

      if (isPdf) {
        // Tenta pdftotext primeiro (mais rapido), fallback OCR em imagem
        try {
          const { stdout } = await execPromise(
            `pdftotext "${inPath}" - 2>/dev/null`,
          );
          text = stdout;
        } catch {
          // pdftotext falhou → converte primeira pagina pra PNG e faz OCR
          const ppmPath = path.join(tmpDir, `ppm_${stamp}`);
          await execPromise(
            `pdftoppm -png -f 1 -l 1 "${inPath}" "${ppmPath}" 2>/dev/null`,
          );
          const imgFile = fs
            .readdirSync(tmpDir)
            .find((f) => f.startsWith(`ppm_${stamp}`) && f.endsWith('.png'));
          if (imgFile) {
            const imgFull = path.join(tmpDir, imgFile);
            const { stdout } = await execPromise(
              `tesseract "${imgFull}" stdout -l por 2>/dev/null`,
            );
            text = stdout;
            fs.unlinkSync(imgFull);
          }
        }
      } else {
        const { stdout } = await execPromise(
          `tesseract "${inPath}" stdout -l por 2>/dev/null`,
        );
        text = stdout;
      }

      text = text.trim();
      if (text.length < 5) {
        this.logger.warn('OCR extraiu muito pouco texto');
        return null;
      }

      this.logger.log(`OCR OK: ${text.length} caracteres extraidos`);
      return text;
    } catch (err) {
      this.logger.error('Erro OCR:', err);
      return null;
    } finally {
      try {
        fs.unlinkSync(inPath);
      } catch (error: unknown) {
        this.logger.debug(
          `Cleanup skipped for ${inPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
