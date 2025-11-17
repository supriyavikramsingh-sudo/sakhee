import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Job {
  id: string
  type: string
  userId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  result: any
  error: string | null
  metadata: {
    progressMessage?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

interface JobStore {
  activeJobs: Job[]
  completedJobs: Job[]
  addJob: (job: Job) => void
  updateJob: (jobId: string, updates: Partial<Job>) => void
  removeJob: (jobId: string) => void
  getJob: (jobId: string) => Job | undefined
  clearCompletedJobs: () => void
  markJobAsNotified: (jobId: string) => void
  getUnnotifiedCompletedJobs: () => Job[]
}

export const useJobStore = create<JobStore>()(
  persist(
    (set, get) => ({
      activeJobs: [],
      completedJobs: [],

      addJob: (job) =>
        set((state) => ({
          activeJobs: [...state.activeJobs, { ...job, notified: false }],
        })),

      updateJob: (jobId, updates) =>
        set((state) => {
          const jobIndex = state.activeJobs.findIndex((j) => j.id === jobId)
          
          if (jobIndex === -1) return state

          const updatedJob = { ...state.activeJobs[jobIndex], ...updates }
          const newActiveJobs = [...state.activeJobs]
          
          // If job is completed or failed, move to completedJobs
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            newActiveJobs.splice(jobIndex, 1)
            return {
              activeJobs: newActiveJobs,
              completedJobs: [...state.completedJobs, updatedJob],
            }
          }

          newActiveJobs[jobIndex] = updatedJob
          return { activeJobs: newActiveJobs }
        }),

      removeJob: (jobId) =>
        set((state) => ({
          activeJobs: state.activeJobs.filter((j) => j.id !== jobId),
          completedJobs: state.completedJobs.filter((j) => j.id !== jobId),
        })),

      getJob: (jobId) => {
        const state = get()
        return (
          state.activeJobs.find((j) => j.id === jobId) ||
          state.completedJobs.find((j) => j.id === jobId)
        )
      },

      clearCompletedJobs: () =>
        set(() => ({
          completedJobs: [],
        })),

      markJobAsNotified: (jobId) =>
        set((state) => ({
          completedJobs: state.completedJobs.map((job) =>
            job.id === jobId ? { ...job, notified: true } : job
          ),
        })),

      getUnnotifiedCompletedJobs: () => {
        const state = get()
        return state.completedJobs.filter((job: any) => !job.notified)
      },
    }),
    {
      name: 'job-storage',
    }
  )
)
