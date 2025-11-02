import express from 'express'
import { Logger } from '../utils/logger.js'

const router = express.Router()
const logger = new Logger('ProgressRoutes')

// In-memory storage for progress data
const progressData = new Map()

/**
 * POST /api/progress/:userId/log
 * Log daily progress entry
 */
router.post('/:userId/log', (req, res) => {
  try {
    const { userId } = req.params
    const {
      date,
      symptoms,
      weight,
      cycle,
      mood,
      energy,
      sleep,
      exercise,
      notes
    } = req.body

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date is required' }
      })
    }

    // Get or create user progress
    if (!progressData.has(userId)) {
      progressData.set(userId, {
        userId,
        entries: [],
        goals: [],
        startDate: new Date()
      })
    }

    const userProgress = progressData.get(userId)

    // Create entry
    const entry = {
      id: 'entry_' + Date.now(),
      date: new Date(date),
      symptoms: symptoms || [],
      weight: weight || null,
      cycle: cycle || null,
      mood: mood || null,
      energy: energy || null,
      sleep: sleep || null,
      exercise: exercise || null,
      notes: notes || '',
      createdAt: new Date()
    }

    userProgress.entries.push(entry)
    userProgress.entries.sort((a, b) => new Date(b.date) - new Date(a.date))

    progressData.set(userId, userProgress)
    logger.info('Progress logged', { userId, entryId: entry.id })

    res.json({
      success: true,
      data: entry
    })
  } catch (error) {
    logger.error('Log progress failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to log progress' }
    })
  }
})

/**
 * GET /api/progress/:userId
 * Get user progress data
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const { startDate, endDate, limit } = req.query

    let userProgress = progressData.get(userId)

    if (!userProgress) {
      return res.json({
        success: true,
        data: {
          entries: [],
          goals: [],
          analytics: null
        }
      })
    }

    let entries = userProgress.entries

    // Filter by date range
    if (startDate) {
      entries = entries.filter(e => new Date(e.date) >= new Date(startDate))
    }
    if (endDate) {
      entries = entries.filter(e => new Date(e.date) <= new Date(endDate))
    }

    // Limit results
    if (limit) {
      entries = entries.slice(0, parseInt(limit))
    }

    // Calculate analytics
    const analytics = calculateAnalytics(entries)

    res.json({
      success: true,
      data: {
        entries,
        goals: userProgress.goals,
        analytics,
        startDate: userProgress.startDate
      }
    })
  } catch (error) {
    logger.error('Get progress failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve progress' }
    })
  }
})

/**
 * PUT /api/progress/:userId/entry/:entryId
 * Update progress entry
 */
router.put('/:userId/entry/:entryId', (req, res) => {
  try {
    const { userId, entryId } = req.params
    const updates = req.body

    const userProgress = progressData.get(userId)
    if (!userProgress) {
      return res.status(404).json({
        success: false,
        error: { message: 'User progress not found' }
      })
    }

    const entryIndex = userProgress.entries.findIndex(e => e.id === entryId)
    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { message: 'Entry not found' }
      })
    }

    // Update entry
    userProgress.entries[entryIndex] = {
      ...userProgress.entries[entryIndex],
      ...updates,
      updatedAt: new Date()
    }

    progressData.set(userId, userProgress)
    logger.info('Progress entry updated', { userId, entryId })

    res.json({
      success: true,
      data: userProgress.entries[entryIndex]
    })
  } catch (error) {
    logger.error('Update entry failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update entry' }
    })
  }
})

/**
 * DELETE /api/progress/:userId/entry/:entryId
 * Delete progress entry
 */
router.delete('/:userId/entry/:entryId', (req, res) => {
  try {
    const { userId, entryId } = req.params

    const userProgress = progressData.get(userId)
    if (!userProgress) {
      return res.status(404).json({
        success: false,
        error: { message: 'User progress not found' }
      })
    }

    userProgress.entries = userProgress.entries.filter(e => e.id !== entryId)
    progressData.set(userId, userProgress)

    logger.info('Progress entry deleted', { userId, entryId })

    res.json({
      success: true,
      message: 'Entry deleted'
    })
  } catch (error) {
    logger.error('Delete entry failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete entry' }
    })
  }
})

/**
 * POST /api/progress/:userId/goals
 * Set or update goals
 */
router.post('/:userId/goals', (req, res) => {
  try {
    const { userId } = req.params
    const { goals } = req.body

    if (!progressData.has(userId)) {
      progressData.set(userId, {
        userId,
        entries: [],
        goals: [],
        startDate: new Date()
      })
    }

    const userProgress = progressData.get(userId)
    userProgress.goals = goals
    progressData.set(userId, userProgress)

    logger.info('Goals updated', { userId, goalCount: goals.length })

    res.json({
      success: true,
      data: { goals }
    })
  } catch (error) {
    logger.error('Update goals failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update goals' }
    })
  }
})

/**
 * Helper: Calculate analytics from entries
 */
function calculateAnalytics(entries) {
  if (entries.length === 0) return null

  // Weight trend
  const weightEntries = entries.filter(e => e.weight).map(e => ({
    date: e.date,
    value: e.weight
  }))

  const weightChange = weightEntries.length >= 2
    ? weightEntries[0].value - weightEntries[weightEntries.length - 1].value
    : 0

  // Symptom frequency
  const symptomCounts = {}
  entries.forEach(entry => {
    (entry.symptoms || []).forEach(symptom => {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
    })
  })

  // Mood average
  const moodEntries = entries.filter(e => e.mood !== null && e.mood !== undefined)
  const avgMood = moodEntries.length > 0
    ? moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length
    : null

  // Energy average
  const energyEntries = entries.filter(e => e.energy !== null && e.energy !== undefined)
  const avgEnergy = energyEntries.length > 0
    ? energyEntries.reduce((sum, e) => sum + e.energy, 0) / energyEntries.length
    : null

  // Sleep average
  const sleepEntries = entries.filter(e => e.sleep !== null && e.sleep !== undefined)
  const avgSleep = sleepEntries.length > 0
    ? sleepEntries.reduce((sum, e) => sum + e.sleep, 0) / sleepEntries.length
    : null

  return {
    totalEntries: entries.length,
    dateRange: {
      start: entries[entries.length - 1]?.date,
      end: entries[0]?.date
    },
    weight: {
      current: weightEntries[0]?.value || null,
      change: weightChange,
      trend: weightChange < 0 ? 'down' : weightChange > 0 ? 'up' : 'stable'
    },
    symptoms: {
      counts: symptomCounts,
      mostCommon: Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    },
    averages: {
      mood: avgMood ? avgMood.toFixed(1) : null,
      energy: avgEnergy ? avgEnergy.toFixed(1) : null,
      sleep: avgSleep ? avgSleep.toFixed(1) : null
    }
  }
}

export default router