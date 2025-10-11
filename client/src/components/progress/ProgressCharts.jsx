import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const ProgressCharts = ({ progressData }) => {
  if (!progressData?.entries || progressData.entries.length === 0) {
    return null
  }

  // Prepare weight data
  const weightData = progressData.entries
    .filter(e => e.weight)
    .reverse()
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: e.weight
    }))

  // Prepare mood/energy data
  const moodEnergyData = progressData.entries
    .filter(e => e.mood || e.energy)
    .reverse()
    .slice(0, 14) // Last 14 days
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: e.mood || 0,
      energy: e.energy || 0
    }))

  // Prepare symptom frequency data
  const symptomData = Object.entries(progressData.analytics?.symptoms?.counts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symptom, count]) => ({
      symptom: symptom.length > 15 ? symptom.substring(0, 15) + '...' : symptom,
      count
    }))

  return (
    <div className="space-y-6">
      {/* Weight Trend */}
      {weightData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Weight Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#9d4edd"
                strokeWidth={2}
                dot={{ fill: '#9d4edd' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mood & Energy */}
      {moodEnergyData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Mood & Energy Levels</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={moodEnergyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#ff006e"
                strokeWidth={2}
                name="Mood"
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#ff8b2e"
                strokeWidth={2}
                name="Energy"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Symptom Frequency */}
      {symptomData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Most Common Symptoms</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={symptomData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symptom" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#9d4edd" name="Occurrences" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default ProgressCharts