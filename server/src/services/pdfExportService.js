/**
 * PDF Export Service
 * Generates professional PDF reports for monthly progress tracking
 */

import PDFDocument from 'pdfkit';
import { db } from '../config/firebase.js';

/**
 * Generate PDF for a monthly report
 * @param {string} userId - User ID
 * @param {string} monthId - Month ID (YYYY-MM)
 * @param {Object} options - PDF generation options
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateMonthlyReportPDF(userId, monthId, options = {}) {
  try {
    const { includeAIInsights = true } = options;

    // Fetch monthly report
    const reportDoc = await db
      .collection('users')
      .doc(userId)
      .collection('progressTracking')
      .doc('monthlyReports')
      .collection('reports')
      .doc(monthId)
      .get();

    if (!reportDoc.exists) {
      throw new Error('Monthly report not found');
    }

    const report = { monthId, ...reportDoc.data() };

    // Optionally fetch AI insights
    let aiInsights = null;
    if (includeAIInsights) {
      try {
        const insightsDoc = await db
          .collection('users')
          .doc(userId)
          .collection('progressTracking')
          .doc('aiInsightsCache')
          .collection('insights')
          .doc(monthId)
          .get();

        if (insightsDoc.exists) {
          aiInsights = insightsDoc.data().insights;
        }
      } catch (error) {
        console.warn(`No AI insights found for month ${monthId}`);
      }
    }

    // Generate PDF
    const pdfBuffer = await createPDF(report, aiInsights);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating monthly report PDF:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

/**
 * Create PDF document from report data
 * @param {Object} report - Monthly report data
 * @param {Object} aiInsights - AI insights data (optional)
 * @returns {Promise<Buffer>} PDF buffer
 */
function createPDF(report, aiInsights) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Monthly Report - ${report.monthId}`,
          Author: 'Sakhee AI',
          Subject: 'PCOS Progress Tracking Report',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const primaryColor = '#8B5CF6'; // Purple
      const secondaryColor = '#EC4899'; // Pink
      const textColor = '#1F2937'; // Dark gray
      const lightGray = '#F3F4F6';

      // Page 1: Header and Overview
      addHeader(doc, report, primaryColor, secondaryColor);
      addOverviewSection(doc, report, textColor, lightGray);

      // Page 1: Weight Journey
      addWeightSection(doc, report, textColor, lightGray);

      // Page 1/2: Menstrual Cycle
      addMenstrualSection(doc, report, textColor, lightGray);

      // Page 2: Lifestyle Metrics
      doc.addPage();
      addLifestyleSection(doc, report, textColor, lightGray);

      // Page 2: Symptoms
      addSymptomsSection(doc, report, textColor, lightGray);

      // Page 3: AI Insights (if available)
      if (aiInsights) {
        doc.addPage();
        addAIInsightsSection(doc, aiInsights, primaryColor, textColor, lightGray);
      }

      // Page 3/4: Achievements and Concerns
      if (!aiInsights) {
        doc.addPage();
      }
      addAchievementsSection(doc, report, textColor, lightGray);

      // Footer on all pages
      addFooter(doc, report);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add header to PDF
 */
function addHeader(doc, report, primaryColor, secondaryColor) {
  // Logo/Brand area (gradient box)
  doc.rect(0, 0, doc.page.width, 120).linearGradient(0, 0, doc.page.width, 120, {
    0: primaryColor,
    1: secondaryColor,
  });

  // Title
  doc
    .fontSize(32)
    .fillColor('white')
    .font('Helvetica-Bold')
    .text('Monthly Progress Report', 50, 30);

  // Month and Year
  const monthName = getMonthName(report.month);
  doc.fontSize(20).fillColor('white').font('Helvetica').text(`${monthName} ${report.year}`, 50, 75);

  // Reset position
  doc.y = 150;
}

/**
 * Add overview section
 */
function addOverviewSection(doc, report, textColor, lightGray) {
  doc.fontSize(16).fillColor(textColor).font('Helvetica-Bold').text('Overview', 50, doc.y);

  doc.y += 10;

  // Overview stats in boxes
  const startY = doc.y;
  const boxWidth = (doc.page.width - 140) / 3;
  const boxHeight = 80;

  // Tracking Completion
  drawStatBox(doc, 50, startY, boxWidth, boxHeight, lightGray, textColor, {
    label: 'Tracking Completion',
    value: `${report.trackingCompletion || 0}%`,
    subtext: `${report.totalDaysTracked || 0} days tracked`,
  });

  // Weight Change
  const weightChange = report.weightChange || 0;
  const weightChangeText = weightChange > 0 ? `+${weightChange}kg` : `${weightChange}kg`;
  drawStatBox(doc, 50 + boxWidth + 20, startY, boxWidth, boxHeight, lightGray, textColor, {
    label: 'Weight Change',
    value: weightChangeText,
    subtext: report.weightTrend || 'N/A',
  });

  // Cycle Regularity
  drawStatBox(doc, 50 + (boxWidth + 20) * 2, startY, boxWidth, boxHeight, lightGray, textColor, {
    label: 'Cycle Regularity',
    value: report.cycleRegularity || 'N/A',
    subtext: `${report.avgCycleLength || 'N/A'} days avg`,
  });

  doc.y = startY + boxHeight + 30;
}

/**
 * Add weight section
 */
function addWeightSection(doc, report, textColor, lightGray) {
  doc.fontSize(16).fillColor(textColor).font('Helvetica-Bold').text('Weight Journey', 50, doc.y);

  doc.y += 10;

  const data = [
    { label: 'Start Weight', value: `${report.startWeight || 'N/A'} kg` },
    { label: 'End Weight', value: `${report.endWeight || 'N/A'} kg` },
    { label: 'Average Weight', value: `${report.avgWeight || 'N/A'} kg` },
    { label: 'Goal Weight', value: `${report.goalWeight || 'N/A'} kg` },
    {
      label: 'Distance from Goal',
      value:
        report.goalWeight && report.endWeight
          ? `${Math.abs(report.goalWeight - report.endWeight).toFixed(1)} kg`
          : 'N/A',
    },
  ];

  drawDataTable(doc, data, lightGray, textColor);

  doc.y += 20;
}

/**
 * Add menstrual cycle section
 */
function addMenstrualSection(doc, report, textColor, lightGray) {
  if (doc.y > 650) {
    doc.addPage();
    doc.y = 50;
  }

  doc
    .fontSize(16)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text('Menstrual Cycle & Ovulation', 50, doc.y);

  doc.y += 10;

  const data = [
    { label: 'Periods Logged', value: `${report.periodsLogged || 0}` },
    { label: 'Average Cycle Length', value: `${report.avgCycleLength || 'N/A'} days` },
    { label: 'Cycle Regularity', value: report.cycleRegularity || 'N/A' },
    { label: 'Avg Ovulation Score', value: `${report.avgOvulationScore || 'N/A'}/10` },
    { label: 'Ovulation Regularity', value: report.ovulationRegularity || 'N/A' },
    { label: 'Fertile Windows Detected', value: `${report.fertileWindowsDetected || 0}` },
  ];

  drawDataTable(doc, data, lightGray, textColor);

  doc.y += 20;
}

/**
 * Add lifestyle section
 */
function addLifestyleSection(doc, report, textColor, lightGray) {
  doc.fontSize(16).fillColor(textColor).font('Helvetica-Bold').text('Lifestyle Metrics', 50, 50);

  doc.y = 70;

  const data = [
    { label: 'Activity Level', value: `${report.avgActivityLevel || 'N/A'}/5` },
    { label: 'Sleep Quality', value: `${report.avgSleepQuality || 'N/A'}/5` },
    { label: 'Energy Level', value: `${report.avgEnergyLevel || 'N/A'}/5` },
    { label: 'Stress Level', value: `${report.avgStressLevel || 'N/A'}/5` },
  ];

  drawDataTable(doc, data, lightGray, textColor);

  doc.y += 20;

  // Mental Health
  doc.fontSize(16).fillColor(textColor).font('Helvetica-Bold').text('Mental Health', 50, doc.y);

  doc.y += 10;

  const mentalData = [
    { label: 'Anxiety', value: `${report.mentalHealthAvg?.anxiety || 'N/A'}/10` },
    { label: 'Depression', value: `${report.mentalHealthAvg?.depression || 'N/A'}/10` },
    { label: 'Mood Swings', value: `${report.mentalHealthAvg?.moodSwings || 'N/A'}/10` },
  ];

  drawDataTable(doc, mentalData, lightGray, textColor);

  doc.y += 20;
}

/**
 * Add symptoms section
 */
function addSymptomsSection(doc, report, textColor, lightGray) {
  if (doc.y > 600) {
    doc.addPage();
    doc.y = 50;
  }

  doc.fontSize(16).fillColor(textColor).font('Helvetica-Bold').text('Top Symptoms', 50, doc.y);

  doc.y += 10;

  if (report.topSymptoms && report.topSymptoms.length > 0) {
    report.topSymptoms.slice(0, 5).forEach((symptom) => {
      const severity = symptom.avgSeverity ? symptom.avgSeverity.toFixed(1) : 'N/A';
      const data = [
        { label: 'Symptom', value: symptom.name },
        { label: 'Average Severity', value: `${severity}/10` },
        { label: 'Frequency', value: `${symptom.frequency} weeks` },
        { label: 'Trend', value: symptom.trend },
      ];

      drawDataTable(doc, data, lightGray, textColor, true);
      doc.y += 10;
    });
  } else {
    doc
      .fontSize(12)
      .fillColor(textColor)
      .font('Helvetica')
      .text('No symptoms tracked this month', 50, doc.y);
    doc.y += 20;
  }
}

/**
 * Add AI insights section
 */
function addAIInsightsSection(doc, aiInsights, primaryColor, textColor, lightGray) {
  // Header
  doc
    .fontSize(20)
    .fillColor(primaryColor)
    .font('Helvetica-Bold')
    .text('AI-Powered Insights', 50, 50);

  doc.y = 80;

  // Health Score
  if (aiInsights.healthScore) {
    doc
      .fontSize(14)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(`Health Score: ${aiInsights.healthScore}/10`, 50, doc.y);
    doc.y += 25;
  }

  // Summary
  if (aiInsights.summary) {
    doc.fontSize(12).fillColor(textColor).font('Helvetica-Bold').text('Summary', 50, doc.y);
    doc.y += 5;
    doc
      .fontSize(11)
      .fillColor(textColor)
      .font('Helvetica')
      .text(aiInsights.summary, 50, doc.y, { width: doc.page.width - 100, align: 'justify' });
    doc.y += 25;
  }

  // Key Insights
  if (aiInsights.keyInsights && aiInsights.keyInsights.length > 0) {
    doc.fontSize(12).fillColor(textColor).font('Helvetica-Bold').text('Key Insights', 50, doc.y);
    doc.y += 5;
    aiInsights.keyInsights.forEach((insight) => {
      doc
        .fontSize(11)
        .fillColor(textColor)
        .font('Helvetica')
        .text(`• ${insight}`, 60, doc.y, {
          width: doc.page.width - 110,
        });
      doc.y += 20;
    });
    doc.y += 10;
  }

  // Patterns
  if (aiInsights.patternsDetected && aiInsights.patternsDetected.length > 0) {
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    doc
      .fontSize(12)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text('Patterns Detected', 50, doc.y);
    doc.y += 5;

    aiInsights.patternsDetected.slice(0, 3).forEach((pattern) => {
      doc
        .fontSize(11)
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`• ${pattern.title}`, 60, doc.y);
      doc.y += 15;
      doc
        .fontSize(10)
        .fillColor(textColor)
        .font('Helvetica')
        .text(pattern.description, 70, doc.y, {
          width: doc.page.width - 120,
        });
      doc.y += 20;
    });
    doc.y += 10;
  }

  // Recommendations
  if (aiInsights.recommendations && aiInsights.recommendations.length > 0) {
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    doc.fontSize(12).fillColor(textColor).font('Helvetica-Bold').text('Recommendations', 50, doc.y);
    doc.y += 5;

    aiInsights.recommendations.slice(0, 5).forEach((rec) => {
      const priority = rec.priority ? ` [${rec.priority.toUpperCase()}]` : '';
      doc
        .fontSize(11)
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`• ${rec.action}${priority}`, 60, doc.y, { width: doc.page.width - 110 });
      doc.y += 15;
      doc
        .fontSize(10)
        .fillColor(textColor)
        .font('Helvetica')
        .text(rec.rationale, 70, doc.y, {
          width: doc.page.width - 120,
        });
      doc.y += 20;
    });
  }
}

/**
 * Add achievements and concerns section
 */
function addAchievementsSection(doc, report, textColor, lightGray) {
  doc
    .fontSize(16)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text('Achievements & Concerns', 50, 50);

  doc.y = 70;

  // Achievements
  if (report.achievements && report.achievements.length > 0) {
    doc.fontSize(12).fillColor(textColor).font('Helvetica-Bold').text('Achievements', 50, doc.y);
    doc.y += 10;

    report.achievements.forEach((achievement) => {
      doc
        .fontSize(11)
        .fillColor(textColor)
        .font('Helvetica')
        .text(`✓ ${achievement}`, 60, doc.y, {
          width: doc.page.width - 110,
        });
      doc.y += 20;
    });
    doc.y += 10;
  }

  // Concerns
  if (report.concerns && report.concerns.length > 0) {
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    doc.fontSize(12).fillColor(textColor).font('Helvetica-Bold').text('Concerns', 50, doc.y);
    doc.y += 10;

    report.concerns.forEach((concern) => {
      doc
        .fontSize(11)
        .fillColor(textColor)
        .font('Helvetica')
        .text(`⚠ ${concern}`, 60, doc.y, {
          width: doc.page.width - 110,
        });
      doc.y += 20;
    });
  }
}

/**
 * Add footer to all pages
 */
function addFooter(doc, report) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    // Footer line
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(50, doc.page.height - 50)
      .lineTo(doc.page.width - 50, doc.page.height - 50)
      .stroke();

    // Footer text
    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .font('Helvetica')
      .text(
        `Sakhee AI - PCOS Progress Tracking | Generated on ${new Date().toLocaleDateString()}`,
        50,
        doc.page.height - 40,
        {
          width: doc.page.width - 100,
          align: 'center',
        }
      );

    // Page number
    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .text(`Page ${i + 1} of ${pages.count}`, doc.page.width - 100, doc.page.height - 40);
  }
}

/**
 * Helper: Draw stat box
 */
function drawStatBox(doc, x, y, width, height, bgColor, textColor, data) {
  // Background
  doc.rect(x, y, width, height).fill(bgColor);

  // Label
  doc
    .fontSize(10)
    .fillColor('#6B7280')
    .font('Helvetica')
    .text(data.label, x + 10, y + 15, {
      width: width - 20,
      align: 'center',
    });

  // Value
  doc
    .fontSize(20)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(data.value, x + 10, y + 35, {
      width: width - 20,
      align: 'center',
    });

  // Subtext
  doc
    .fontSize(9)
    .fillColor('#6B7280')
    .font('Helvetica')
    .text(data.subtext, x + 10, y + 62, {
      width: width - 20,
      align: 'center',
    });
}

/**
 * Helper: Draw data table
 */
function drawDataTable(doc, data, bgColor, textColor, compact = false) {
  const startY = doc.y;
  const rowHeight = compact ? 25 : 30;

  data.forEach((item, index) => {
    const y = startY + index * rowHeight;

    // Background
    if (index % 2 === 0) {
      doc.rect(50, y, doc.page.width - 100, rowHeight).fill(bgColor);
    }

    // Label
    doc
      .fontSize(11)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(item.label, 60, y + 8);

    // Value
    doc
      .fontSize(11)
      .fillColor(textColor)
      .font('Helvetica')
      .text(item.value, 300, y + 8);
  });

  doc.y = startY + data.length * rowHeight;
}

/**
 * Helper: Get month name
 */
function getMonthName(monthNumber) {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[monthNumber - 1] || 'Unknown';
}
