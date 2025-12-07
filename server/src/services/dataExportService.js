/**
 * Data Export Service
 * Handles CSV and JSON export for daily tracking, weekly summaries, and monthly reports
 */

import { db } from '../config/firebase.js';

/**
 * Convert array of objects to CSV string
 * @param {Array<Object>} data - Array of data objects
 * @param {Array<string>} headers - Column headers
 * @returns {string} CSV formatted string
 */
function convertToCSV(data, headers) {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  // Create header row
  const csvRows = [headers.join(',')];

  // Create data rows
  data.forEach((item) => {
    const values = headers.map((header) => {
      const value = item[header];

      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      }

      if (typeof value === 'object') {
        // Convert objects/arrays to JSON string
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }

      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
      }

      return value;
    });

    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Export daily tracking data
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {string} options.format - 'csv' or 'json'
 * @returns {Promise<Object>} Export data with content and metadata
 */
export async function exportDailyTracking(userId, options = {}) {
  try {
    const { startDate = null, endDate = null, format = 'csv' } = options;

    // Fetch daily tracking data
    let query = db
      .collection('users')
      .doc(userId)
      .collection('progressTracking')
      .doc('dailyTracking')
      .collection('entries')
      .orderBy('date', 'desc');

    // Apply date filters
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      throw new Error('No daily tracking data found for the specified date range');
    }

    const entries = [];
    snapshot.forEach((doc) => {
      entries.push({
        date: doc.id,
        ...doc.data(),
      });
    });

    // Flatten the data for CSV export
    const flattenedEntries = entries.map((entry) => ({
      date: entry.date,
      weight: entry.weight || '',
      activityLevel: entry.activityLevel || '',
      sleepQuality: entry.sleepQuality || '',
      energyLevel: entry.energyLevel || '',
      stressLevel: entry.stressLevel || '',
      notes: entry.notes || '',
      symptoms: entry.symptoms ? entry.symptoms.join('; ') : '',
      createdAt: entry.createdAt || '',
      updatedAt: entry.updatedAt || '',
    }));

    let content;
    let mimeType;
    let filename;

    if (format === 'json') {
      content = JSON.stringify(entries, null, 2);
      mimeType = 'application/json';
      filename = `daily-tracking-${userId}-${Date.now()}.json`;
    } else {
      // CSV format
      const headers = [
        'date',
        'weight',
        'activityLevel',
        'sleepQuality',
        'energyLevel',
        'stressLevel',
        'notes',
        'symptoms',
        'createdAt',
        'updatedAt',
      ];
      content = convertToCSV(flattenedEntries, headers);
      mimeType = 'text/csv';
      filename = `daily-tracking-${userId}-${Date.now()}.csv`;
    }

    return {
      content,
      mimeType,
      filename,
      recordCount: entries.length,
      startDate: startDate || entries[entries.length - 1]?.date || 'N/A',
      endDate: endDate || entries[0]?.date || 'N/A',
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting daily tracking data:', error);
    throw new Error(`Failed to export daily tracking: ${error.message}`);
  }
}

/**
 * Export weekly summaries data
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @param {number} options.numberOfWeeks - Number of recent weeks to export
 * @param {string} options.format - 'csv' or 'json'
 * @returns {Promise<Object>} Export data with content and metadata
 */
export async function exportWeeklySummaries(userId, options = {}) {
  try {
    const { numberOfWeeks = null, format = 'csv' } = options;

    // Fetch weekly summaries
    let query = db
      .collection('users')
      .doc(userId)
      .collection('progressTracking')
      .doc('weeklySummaries')
      .collection('summaries')
      .orderBy('weekStartDate', 'desc');

    if (numberOfWeeks) {
      query = query.limit(numberOfWeeks);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      throw new Error('No weekly summaries found');
    }

    const summaries = [];
    snapshot.forEach((doc) => {
      summaries.push({
        weekId: doc.id,
        ...doc.data(),
      });
    });

    // Flatten the data for CSV export
    const flattenedSummaries = summaries.map((summary) => ({
      weekId: summary.weekId,
      weekStartDate: summary.weekStartDate,
      weekEndDate: summary.weekEndDate,
      daysTracked: summary.daysTracked || 0,
      avgWeight: summary.avgWeight || '',
      weightChange: summary.weightChange || '',
      avgActivityLevel: summary.avgActivityLevel || '',
      avgSleepQuality: summary.avgSleepQuality || '',
      avgEnergyLevel: summary.avgEnergyLevel || '',
      avgStressLevel: summary.avgStressLevel || '',
      topSymptoms: summary.topSymptoms ? summary.topSymptoms.map((s) => s.name).join('; ') : '',
      mentalHealthAnxiety: summary.mentalHealth?.anxiety || '',
      mentalHealthDepression: summary.mentalHealth?.depression || '',
      mentalHealthMoodSwings: summary.mentalHealth?.moodSwings || '',
      achievements: summary.achievements ? summary.achievements.join('; ') : '',
      concerns: summary.concerns ? summary.concerns.join('; ') : '',
      generatedAt: summary.generatedAt || '',
    }));

    let content;
    let mimeType;
    let filename;

    if (format === 'json') {
      content = JSON.stringify(summaries, null, 2);
      mimeType = 'application/json';
      filename = `weekly-summaries-${userId}-${Date.now()}.json`;
    } else {
      // CSV format
      const headers = [
        'weekId',
        'weekStartDate',
        'weekEndDate',
        'daysTracked',
        'avgWeight',
        'weightChange',
        'avgActivityLevel',
        'avgSleepQuality',
        'avgEnergyLevel',
        'avgStressLevel',
        'topSymptoms',
        'mentalHealthAnxiety',
        'mentalHealthDepression',
        'mentalHealthMoodSwings',
        'achievements',
        'concerns',
        'generatedAt',
      ];
      content = convertToCSV(flattenedSummaries, headers);
      mimeType = 'text/csv';
      filename = `weekly-summaries-${userId}-${Date.now()}.csv`;
    }

    return {
      content,
      mimeType,
      filename,
      recordCount: summaries.length,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting weekly summaries:', error);
    throw new Error(`Failed to export weekly summaries: ${error.message}`);
  }
}

/**
 * Export monthly reports data
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @param {number} options.numberOfMonths - Number of recent months to export
 * @param {string} options.format - 'csv' or 'json'
 * @param {boolean} options.includeAIInsights - Include AI insights in export
 * @returns {Promise<Object>} Export data with content and metadata
 */
export async function exportMonthlyReports(userId, options = {}) {
  try {
    const { numberOfMonths = null, format = 'csv', includeAIInsights = false } = options;

    // Fetch monthly reports
    let query = db
      .collection('users')
      .doc(userId)
      .collection('progressTracking')
      .doc('monthlyReports')
      .collection('reports')
      .orderBy('startDate', 'desc');

    if (numberOfMonths) {
      query = query.limit(numberOfMonths);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      throw new Error('No monthly reports found');
    }

    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({
        monthId: doc.id,
        ...doc.data(),
      });
    });

    // Optionally fetch AI insights
    if (includeAIInsights) {
      for (const report of reports) {
        try {
          const insightsDoc = await db
            .collection('users')
            .doc(userId)
            .collection('progressTracking')
            .doc('aiInsightsCache')
            .collection('insights')
            .doc(report.monthId)
            .get();

          if (insightsDoc.exists) {
            report.aiInsights = insightsDoc.data().insights;
          }
        } catch (error) {
          console.warn(`No AI insights for month ${report.monthId}`);
        }
      }
    }

    // Flatten the data for CSV export
    const flattenedReports = reports.map((report) => ({
      monthId: report.monthId,
      year: report.year,
      month: report.month,
      startDate: report.startDate,
      endDate: report.endDate,
      totalDaysTracked: report.totalDaysTracked || 0,
      trackingCompletion: report.trackingCompletion || 0,
      startWeight: report.startWeight || '',
      endWeight: report.endWeight || '',
      avgWeight: report.avgWeight || '',
      weightChange: report.weightChange || '',
      weightTrend: report.weightTrend || '',
      goalWeight: report.goalWeight || '',
      periodsLogged: report.periodsLogged || 0,
      avgCycleLength: report.avgCycleLength || '',
      cycleRegularity: report.cycleRegularity || '',
      avgOvulationScore: report.avgOvulationScore || '',
      ovulationRegularity: report.ovulationRegularity || '',
      fertileWindowsDetected: report.fertileWindowsDetected || 0,
      avgActivityLevel: report.avgActivityLevel || '',
      avgSleepQuality: report.avgSleepQuality || '',
      avgEnergyLevel: report.avgEnergyLevel || '',
      avgStressLevel: report.avgStressLevel || '',
      topSymptoms: report.topSymptoms ? report.topSymptoms.map((s) => s.name).join('; ') : '',
      mentalHealthAnxiety: report.mentalHealthAvg?.anxiety || '',
      mentalHealthDepression: report.mentalHealthAvg?.depression || '',
      mentalHealthMoodSwings: report.mentalHealthAvg?.moodSwings || '',
      achievements: report.achievements ? report.achievements.join('; ') : '',
      concerns: report.concerns ? report.concerns.join('; ') : '',
      aiHealthScore: includeAIInsights ? report.aiInsights?.healthScore || '' : '',
      aiSummary: includeAIInsights ? report.aiInsights?.summary || '' : '',
      generatedAt: report.generatedAt || '',
    }));

    let content;
    let mimeType;
    let filename;

    if (format === 'json') {
      content = JSON.stringify(reports, null, 2);
      mimeType = 'application/json';
      filename = `monthly-reports-${userId}-${Date.now()}.json`;
    } else {
      // CSV format
      const headers = [
        'monthId',
        'year',
        'month',
        'startDate',
        'endDate',
        'totalDaysTracked',
        'trackingCompletion',
        'startWeight',
        'endWeight',
        'avgWeight',
        'weightChange',
        'weightTrend',
        'goalWeight',
        'periodsLogged',
        'avgCycleLength',
        'cycleRegularity',
        'avgOvulationScore',
        'ovulationRegularity',
        'fertileWindowsDetected',
        'avgActivityLevel',
        'avgSleepQuality',
        'avgEnergyLevel',
        'avgStressLevel',
        'topSymptoms',
        'mentalHealthAnxiety',
        'mentalHealthDepression',
        'mentalHealthMoodSwings',
        'achievements',
        'concerns',
      ];

      if (includeAIInsights) {
        headers.push('aiHealthScore', 'aiSummary');
      }

      content = convertToCSV(flattenedReports, headers);
      mimeType = 'text/csv';
      filename = `monthly-reports-${userId}-${Date.now()}.csv`;
    }

    return {
      content,
      mimeType,
      filename,
      recordCount: reports.length,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting monthly reports:', error);
    throw new Error(`Failed to export monthly reports: ${error.message}`);
  }
}

/**
 * Export all progress tracking data (combined)
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @param {string} options.format - 'json' only (CSV would be too complex for combined data)
 * @returns {Promise<Object>} Export data with content and metadata
 */
export async function exportAllData(userId, options = {}) {
  try {
    const { format = 'json' } = options;

    if (format !== 'json') {
      throw new Error('Combined data export is only available in JSON format');
    }

    // Fetch all data types in parallel
    const [dailyData, weeklyData, monthlyData] = await Promise.all([
      exportDailyTracking(userId, { format: 'json' }),
      exportWeeklySummaries(userId, { format: 'json' }),
      exportMonthlyReports(userId, { format: 'json', includeAIInsights: true }),
    ]);

    const combinedData = {
      exportMetadata: {
        userId,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        dataTypes: ['dailyTracking', 'weeklySummaries', 'monthlyReports'],
      },
      dailyTracking: {
        recordCount: dailyData.recordCount,
        data: JSON.parse(dailyData.content),
      },
      weeklySummaries: {
        recordCount: weeklyData.recordCount,
        data: JSON.parse(weeklyData.content),
      },
      monthlyReports: {
        recordCount: monthlyData.recordCount,
        data: JSON.parse(monthlyData.content),
      },
    };

    const content = JSON.stringify(combinedData, null, 2);
    const mimeType = 'application/json';
    const filename = `progress-tracking-complete-${userId}-${Date.now()}.json`;

    return {
      content,
      mimeType,
      filename,
      recordCount: dailyData.recordCount + weeklyData.recordCount + monthlyData.recordCount,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting all data:', error);
    throw new Error(`Failed to export all data: ${error.message}`);
  }
}
