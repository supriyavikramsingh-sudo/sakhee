import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = null; // Will be loaded during initialization
    this.initialized = false;
  }

  /**
   * Initialize the Google Sheets API client
   * This should be called before using any other methods
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Load spreadsheet ID from environment
      this.spreadsheetId = process.env.GOOGLE_SHEET_ID;

      if (!this.spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID environment variable is not set');
      }

      console.log(`📋 Using Google Sheet ID: ${this.spreadsheetId.substring(0, 10)}...`);

      // Try to use environment variable first (for production/Render)
      // Fall back to local file for development
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        console.log('🔑 Using Google credentials from environment variable');

        // Parse the JSON credentials from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

        this.auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else {
        // Development: Use local file
        console.log('🔑 Using Google credentials from local file');

        const credentialsPath = path.join(__dirname, '../src/config/google-credentials.json');

        // Check if credentials file exists
        if (!fs.existsSync(credentialsPath)) {
          console.error('Looking for credentials at:', credentialsPath);
          throw new Error(
            'Google credentials file not found. Please add google-credentials.json to server/src/config/ OR set GOOGLE_SERVICE_ACCOUNT_KEY environment variable'
          );
        }

        this.auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;

      console.log('✅ Google Sheets API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets API:', error.message);
      throw error;
    }
  }

  /**
   * Check if an email already exists in the Google Sheet
   * @param {string} email - Email to check for duplicates
   * @returns {Promise<boolean>} - True if email exists, false otherwise
   */
  async checkDuplicateEmail(email) {
    try {
      await this.initialize();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!B:B', // Column B contains emails
      });

      const rows = response.data.values || [];

      // Check if email exists (case-insensitive)
      const emailExists = rows.some(
        (row) => row[0] && row[0].toLowerCase() === email.toLowerCase()
      );

      return emailExists;
    } catch (error) {
      console.error('Error checking duplicate email:', error);
      throw new Error('Failed to verify email. Please try again.');
    }
  }

  /**
   * Append a new row to the Google Sheet
   * @param {Object} data - Data to append
   * @param {string} data.email - User email
   * @param {string} data.city - City name
   * @param {string} data.state - State name
   * @param {string} data.country - Country name
   * @param {number} [data.latitude] - Latitude
   * @param {number} [data.longitude] - Longitude
   * @param {string} data.deviceType - Device type (Mobile/Tablet/Desktop)
   * @param {string} data.ipAddress - User IP address
   * @param {string} data.userAgent - Browser user agent
   * @returns {Promise<Object>} - Response with row number
   */
  async appendRow(data) {
    try {
      await this.initialize();

      const timestamp = new Date().toISOString();
      const row = [
        timestamp,
        data.email,
        data.city,
        data.state,
        data.country,
        data.latitude || '',
        data.longitude || '',
        data.deviceType,
        data.ipAddress,
        data.userAgent,
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:J', // Columns A through J
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row],
        },
      });

      console.log('✅ Successfully added row to Google Sheets');

      return {
        success: true,
        rowNumber: response.data.updates.updatedRows,
      };
    } catch (error) {
      console.error('Error appending row to Google Sheets:', error);
      throw new Error('Failed to save data. Please try again.');
    }
  }

  /**
   * Create the header row in the Google Sheet if it doesn't exist
   * This should be run once during initial setup
   */
  async createHeaderRow() {
    try {
      await this.initialize();

      const headers = [
        'Timestamp',
        'Email',
        'City',
        'State',
        'Country',
        'Latitude',
        'Longitude',
        'Device Type',
        'IP Address',
        'User Agent',
      ];

      // Check if sheet is empty
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A1:J1',
      });

      if (!response.data.values || response.data.values.length === 0) {
        // Add header row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A1:J1',
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [headers],
          },
        });

        console.log('✅ Header row created successfully');
        return { success: true, message: 'Header row created' };
      } else {
        console.log('ℹ️ Header row already exists');
        return { success: true, message: 'Header row already exists' };
      }
    } catch (error) {
      console.error('Error creating header row:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const googleSheetsService = new GoogleSheetsService();

export default googleSheetsService;
