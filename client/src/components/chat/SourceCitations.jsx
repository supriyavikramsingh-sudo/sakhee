import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const SourceCitations = ({ sources }) => {
  const [expanded, setExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="ml-12 mt-3 p-3 bg-surface rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-muted hover:text-primary transition"
      >
        <ChevronDown
          size={16}
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
          className="transition-transform"
        />
        Sources ({sources.length})
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs">
          {sources.map((source, idx) => (
            <div key={idx} className="p-2 bg-white rounded border-l-2 border-primary">
              <p className="font-medium text-gray-900 mb-1">
                {source.source || 'Medical Literature'}
              </p>
              <p className="text-muted line-clamp-2">{source.content}</p>
              <span className="inline-block mt-1 px-2 py-1 bg-primary bg-opacity-10 text-primary rounded text-xs">
                {source.type || 'Reference'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SourceCitations
