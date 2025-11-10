import { Activity, Heart, Moon, TrendingDown, TrendingUp, Zap } from 'lucide-react';

const ProgressDashboard = ({ progressData, loading }) => {
  if (loading) {
    return (
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-surface rounded mb-3 w-1/2" />
            <div className="h-8 bg-surface rounded" />
          </div>
        ))}
      </div>
    );
  }

  const analytics = progressData?.analytics;

  if (!analytics) {
    return (
      <div className="bg-white rounded-b-lg shadow p-12 text-center">
        <Activity className="mx-auto mb-4 text-muted" size={64} />
        <h3 className="text-xl font-bold mb-2">No Data Yet</h3>
        <p className="text-muted mb-6">
          Start logging your daily progress to see insights and trends
        </p>
      </div>
    );
  }

  const cards = [
    {
      icon: <Activity className="text-primary" />,
      label: 'Weight Trend',
      value: analytics.weight.current ? `${analytics.weight.current} kg` : 'Not tracked',
      change: analytics.weight.change,
      trend: analytics.weight.trend,
    },
    {
      icon: <Heart className="text-danger" />,
      label: 'Avg Mood',
      value: analytics.averages.mood ? `${analytics.averages.mood}/10` : 'Not tracked',
      color: 'text-danger',
    },
    {
      icon: <Zap className="text-warning" />,
      label: 'Avg Energy',
      value: analytics.averages.energy ? `${analytics.averages.energy}/10` : 'Not tracked',
      color: 'text-warning',
    },
    {
      icon: <Moon className="text-info" />,
      label: 'Avg Sleep',
      value: analytics.averages.sleep ? `${analytics.averages.sleep}h` : 'Not tracked',
      color: 'text-info',
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-3">
            <div className={card.color || 'text-primary'}>{card.icon}</div>
            {card.trend && (
              <div className="flex items-center gap-1 text-xs">
                {card.trend === 'down' ? (
                  <>
                    <TrendingDown className="text-success" size={16} />
                    <span className="text-success">{Math.abs(card.change).toFixed(1)} kg</span>
                  </>
                ) : card.trend === 'up' ? (
                  <>
                    <TrendingUp className="text-danger" size={16} />
                    <span className="text-danger">+{card.change.toFixed(1)} kg</span>
                  </>
                ) : (
                  <span className="text-muted">Stable</span>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-muted mb-1">{card.label}</p>
          <p className="text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default ProgressDashboard;
