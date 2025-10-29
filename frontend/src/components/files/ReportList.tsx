import { FileText, Calendar, Trash2 } from 'lucide-react';

const ReportList = ({ reports, setReports, selectedReport, onSelectReport }) => {
  const handleDelete = async (reportId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this report?')) {
      const updatedReports = reports.filter((r) => r.reportId !== reportId);
      setReports(updatedReports);
      if (selectedReport?.reportId === reportId) {
        onSelectReport(null);
      }
    }
  };

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <FileText className="mx-auto mb-3 text-muted" size={48} />
        <p className="text-muted text-sm">No reports uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-surface">
        <h3 className="font-bold">Your Reports ({reports.length})</h3>
      </div>

      <div className="divide-y divide-surface max-h-96 overflow-y-auto">
        {reports.map((report) => (
          <div
            key={report.reportId}
            onClick={() => onSelectReport(report)}
            className={`p-4 cursor-pointer hover:bg-surface transition ${
              selectedReport?.reportId === report.reportId ? 'bg-primary bg-opacity-10' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <FileText className="text-primary flex-shrink-0 mt-1" size={20} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{report.filename}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <Calendar size={12} />
                  {new Date(report.uploadedAt).toLocaleDateString()}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.keys(report.labValues || {})
                    .slice(0, 3)
                    .map((key) => (
                      <span key={key} className="badge-primary text-xs">
                        {key.replace('_', ' ')}
                      </span>
                    ))}
                  {Object.keys(report.labValues || {}).length > 3 && (
                    <span className="text-xs text-muted">
                      +{Object.keys(report.labValues).length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(report.reportId, e)}
                className="p-2 hover:bg-danger hover:bg-opacity-10 rounded transition"
              >
                <Trash2 className="text-danger" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportList;
