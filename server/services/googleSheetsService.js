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

      // Priority order for finding credentials:
      // 1. Render secret file (production)
      // 2. Environment variable with JSON (alternative production method)
      // 3. Local file (development)

      let credentialsPath = null;

      // Check for Render secret file first
      if (process.env.GOOGLE_CREDENTIALS_PATH) {
        credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
        console.log('🔑 Using Google credentials from Render secret file');
      }
      // Check for environment variable with JSON credentials
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        console.log('🔑 Using Google credentials from environment variable');

        // Parse the JSON credentials from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

        this.auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
      // Fall back to local file for development
      else {
        credentialsPath = path.join(__dirname, '../src/config/google-credentials.json');
        console.log('🔑 Using Google credentials from local file');
      }

      // If we have a file path, use it
      if (credentialsPath) {
        // Check if credentials file exists
        if (!fs.existsSync(credentialsPath)) {
          console.error('Looking for credentials at:', credentialsPath);
          throw new Error(
            `Google credentials file not found at ${credentialsPath}. Please add google-credentials.json to server/src/config/ OR set GOOGLE_CREDENTIALS_PATH or GOOGLE_SERVICE_ACCOUNT_KEY environment variable`
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
        range: 'Sheet1!E:E', // Column E now contains emails
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
   * Check if a phone number already exists in the Google Sheet
   * @param {string} fullPhoneNumber - Full phone number with country code to check
   * @returns {Promise<boolean>} - True if phone exists, false otherwise
   */
  async checkDuplicatePhone(fullPhoneNumber) {
    try {
      await this.initialize();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!D:D', // Column D contains full phone numbers
      });

      const rows = response.data.values || [];

      // Check if phone number exists
      const phoneExists = rows.some((row) => row[0] && row[0] === fullPhoneNumber);

      return phoneExists;
    } catch (error) {
      console.error('Error checking duplicate phone:', error);
      throw new Error('Failed to verify phone number. Please try again.');
    }
  }

  /**
   * Append a new row to the Google Sheet
   * @param {Object} data - Data to append
   * @param {string} data.phoneNumber - User phone number (without country code)
   * @param {string} data.countryCode - Country code (e.g., +91)
   * @param {string} data.fullPhoneNumber - Full phone number with country code
   * @param {string} data.email - User email (optional)
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
        data.countryCode,
        data.phoneNumber,
        data.fullPhoneNumber,
        data.email || '',
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
        range: 'Sheet1!A:M', // Columns A through M (expanded for phone fields)
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
        'Country Code',
        'Phone Number',
        'Full Phone Number',
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
        range: 'Sheet1!A1:M1',
      });

      if (!response.data.values || response.data.values.length === 0) {
        // Add header row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A1:M1',
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

  /**
   * Update location data for an existing user by email
   * @param {string} email - Email of the user to update
   * @param {Object} location - Location data to update
   * @param {string} location.city - City name
   * @param {string} location.state - State name
   * @param {string} location.country - Country name
   * @param {number} [location.latitude] - Latitude
   * @param {number} [location.longitude] - Longitude
   * @returns {Promise<boolean>} - True if updated, false if user not found
   */
  async updateLocationByEmail(email, location) {
    try {
      await this.initialize();

      // Get all data from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:M',
      });

      const rows = response.data.values || [];

      // Find the row with matching email (case-insensitive)
      // Email is now in column E (index 4)
      // Skip header row (index 0)
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][4] && rows[i][4].toLowerCase() === email.toLowerCase()) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        console.log(`User not found for location update: ${email}`);
        return false;
      }

      // Update only if current location is 'Unknown' or empty
      // City is now in column F (index 5)
      const currentCity = rows[rowIndex][5];
      if (currentCity && currentCity !== 'Unknown') {
        console.log(`Location already set for ${email}, skipping update`);
        return true; // Not an error, just skip
      }

      // Prepare update - only update location columns (F, G, H, I, J)
      // City, State, Country, Latitude, Longitude
      const updateRange = `Sheet1!F${rowIndex + 1}:J${rowIndex + 1}`;
      const values = [
        [
          location.city || 'Unknown',
          location.state || 'Unknown',
          location.country || 'Unknown',
          location.latitude || '',
          location.longitude || '',
        ],
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      console.log(`✅ Location updated for ${email} at row ${rowIndex + 1}`);
      return true;
    } catch (error) {
      console.error('Error updating location by email:', error);
      throw new Error('Failed to update location data.');
    }
  }
}

// Export a singleton instance
const googleSheetsService = new GoogleSheetsService();

export default googleSheetsService;
