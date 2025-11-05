import { Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

const PricingDetailsPage = () => {
  const navigate = useNavigate();

  const featureCategories = [
    {
      title: 'AI Chatbot & Scanning',
      rows: [
        {
          feature: 'Unlimited AI chat',
          free: true,
          pro: true,
          max: false,
        },
        {
          feature: '5 photo scans/month with basic nutritional info (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
        {
          feature: 'Unlimited photo scans ⭐ with advanced nutritional info (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
      ],
    },
    {
      title: 'Meal Planning',
      rows: [
        {
          feature: '1 generation/month',
          free: true,
          pro: false,
          max: false,
        },
        {
          feature: '3 generations/week ⭐',
          free: false,
          pro: true,
          max: false,
        },
        {
          feature: '3/5/7 days, All cuisines & features',
          free: true,
          pro: true,
          max: false,
        },
        {
          feature: 'Nutritionist approval ⭐⭐ (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
      ],
    },
    {
      title: 'Lab Reports',
      rows: [
        {
          feature: 'AI analysis (25+ markers)',
          free: true,
          pro: true,
          max: false,
        },
        {
          feature: '1 FREE doctor review/month ⭐ (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
        {
          feature: 'Extra reviews: ₹400 each (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
        {
          feature: 'Extra reviews: ₹200 (50% off) ⭐⭐ (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
      ],
    },
    {
      title: 'Food Ordering',
      rows: [
        {
          feature: 'Zomato ordering, No discount (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
        {
          feature: 'Zomato + Swiggy, 10% discount ⭐ (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
        {
          feature: 'Zomato + Swiggy, 20% discount ⭐⭐ (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
      ],
    },
    {
      title: 'Progress Tracking',
      rows: [
        {
          feature: 'Manual logging',
          free: true,
          pro: true,
          max: false,
        },
        {
          feature: '7-day view',
          free: true,
          pro: true,
          max: false,
        },
        {
          feature: 'AI insights ⭐, 30-day trends',
          free: false,
          pro: true,
          max: false,
        },
        {
          feature: '6-month history',
          free: false,
          pro: true,
          max: false,
        },
        {
          feature: 'Advanced analytics ⭐⭐, 12-month retention (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
        {
          feature: 'Doctor-shareable reports (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
      ],
    },
    {
      title: 'Supplements',
      rows: [
        {
          feature: 'Basic recommendations',
          free: true,
          pro: true,
          max: false,
        },
        {
          feature: 'Personalized by labs ⭐, Purchase links (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
        {
          feature: 'Nutritionist consultation ⭐⭐, Custom plans (Coming Soon)',
          free: false,
          pro: false,
          max: false,
          comingSoon: true,
        },
      ],
    },
  ];

  const renderCell = (value: boolean, comingSoon: boolean = false) => {
    if (comingSoon) {
      return <span className="text-gray-400 text-sm">(Coming Soon)</span>;
    }
    return value ? (
      <Check className="w-5 h-5 text-green-500 mx-auto" />
    ) : (
      <span className="text-gray-300">—</span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-peach-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-primary hover:text-primaryDark mb-6 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Pricing
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            What's Included in Our Plans?
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Affordable PCOS Management for Every Stage of Your Journey
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                    FREE
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-primary bg-pink-50">
                    SAKHEE PRO
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-400">
                    SAKHEE MAX
                    <div className="text-xs font-normal mt-1">(Coming Soon)</div>
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {featureCategories.map((category, catIndex) => (
                  <>
                    {/* Category Header */}
                    <tr key={`cat-${catIndex}`} className="bg-gray-100">
                      <td
                        colSpan={4}
                        className="px-6 py-3 text-sm font-semibold text-gray-800"
                      >
                        {category.title}
                      </td>
                    </tr>
                    {/* Category Rows */}
                    {category.rows.map((row, rowIndex) => (
                      <tr
                        key={`row-${catIndex}-${rowIndex}`}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm text-gray-700">{row.feature}</td>
                        <td className="px-6 py-4 text-center">
                          {renderCell(row.free, row.comingSoon)}
                        </td>
                        <td className="px-6 py-4 text-center bg-pink-50/30">
                          {renderCell(row.pro, row.comingSoon)}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-400">
                          {renderCell(row.max, true)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Language Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-12">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Languages</h3>
          <p className="text-gray-700">
            <span className="font-medium">Currently Available:</span> English, Hindi
          </p>
          <p className="text-gray-600 mt-2">
            <span className="font-medium">Coming Soon:</span> Telugu, Tamil, Marathi, Gujarati, Kannada, Bengali
          </p>
        </div>

        {/* Who It's For */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Who It's For
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🌱</div>
              <h4 className="font-semibold text-gray-800 mb-2">FREE</h4>
              <p className="text-sm text-gray-600">First-time users exploring PCOS management</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💪</div>
              <h4 className="font-semibold text-gray-800 mb-2">SAKHEE PRO</h4>
              <p className="text-sm text-gray-600">Active daily users committed to their health journey</p>
            </div>
            <div className="text-center opacity-60">
              <div className="text-4xl mb-3">⚕️</div>
              <h4 className="font-semibold text-gray-800 mb-2">SAKHEE MAX</h4>
              <p className="text-sm text-gray-600">Coming Soon - Medical grade care with professional support</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => navigate('/pricing')}
            className="px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primaryDark transition"
          >
            Choose Your Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingDetailsPage;
