/**
 * OCR Service
 * Extracts text from images using Tesseract.js
 */

import Tesseract from 'tesseract.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger('OCRService')

class OCRService {
  /**
   * Perform OCR on image file
   */
  async performOCR(imagePath) {
    try {
      logger.info('Starting OCR', { imagePath })

      const result = await Tesseract.recognize(
        imagePath,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          }
        }
      )

      const text = result.data.text
      logger.info('OCR completed', { textLength: text.length })

      return text
    } catch (error) {
      logger.error('OCR failed', { error: error.message })
      throw new Error('Failed to extract text from image')
    }
  }

  /**
   * Perform OCR with preprocessing (future enhancement)
   */
  async performOCRWithPreprocessing(imagePath) {
    // TODO: Add image preprocessing
    // - Grayscale conversion
    // - Noise reduction
    // - Contrast enhancement
    return this.performOCR(imagePath)
  }
}

export const ocrService = new OCRService()
export default ocrService
