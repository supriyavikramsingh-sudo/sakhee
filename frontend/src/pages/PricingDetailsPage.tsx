import { Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

const PricingDetailsPage = () => {
  const navigate = useNavigate();

  const featureCategories = [
    {
      title: 'AI Chatbot & Scanning',
      availableNow: [
        {
          feature: 'Unlimited AI chat',
          free: true,
          pro: true,
          max: true,
        },
      ],
      comingSoon: [
        {
          feature: '5 photo scans/month with basic nutritional info',
          free: true,
          pro: false,
          max: false,
        },
        {
          feature: 'Unlimited photo scans ⭐ with advanced nutritional info',
          free: false,
          pro: true,
          max: true,
        },
      ],
    },
    {
      title: 'Meal Planning',
      availableNow: [
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
          max: true,
        },
        {
          feature: '3/5/7 days, all cuisines & features',
          free: true,
          pro: true,
          max: true,
        },
      ],
      comingSoon: [
        {
          feature: 'Nutritionist approval ⭐⭐',
          free: false,
          pro: false,
          max: true,
        },
      ],
    },
    {
      title: 'Lab Reports',
      availableNow: [
        {
          feature: 'AI analysis (25+ markers)',
          free: true,
          pro: true,
          max: true,
        },
      ],
      comingSoon: [
        {
          feature: '1 FREE doctor review/month ⭐',
          free: false,
          pro: true,
          max: true,
        },
        {
          feature: 'Extra reviews: ₹400 each',
          free: false,
          pro: true,
          max: false,
        },
        {
          feature: 'Extra reviews: ₹200 (50% off) ⭐⭐',
          free: false,
          pro: false,
          max: true,
        },
      ],
    },
    {
      title: 'Food Ordering',
      availableNow: [],
      comingSoon: [
        {
          feature: 'Zomato ordering: No discount',
          free: true,
          pro: false,
          max: false,
        },
        {
          feature: 'Zomato + Swiggy: 10% discount ⭐',
          free: false,
          pro: true,
          max: false,
        },
        {
          feature: 'Zomato + Swiggy: 20% discount ⭐⭐',
          free: false,
          pro: false,
          max: true,
        },
      ],
    },
    {
      title: 'Progress Tracking',
      availableNow: [
        {
          feature: 'Manual logging',
          free: true,
          pro: true,
          max: true,
        },
        {
          feature: '7-day view',
          free: true,
          pro: true,
          max: true,
        },
        {
          feature: 'AI insights ⭐: 30-day trends',
          free: false,
          pro: true,
          max: true,
        },
      ],
      comingSoon: [
        {
          feature: '6-month history',
          free: false,
          pro: false,
          max: true,
        },
        {
          feature: 'Advanced analytics ⭐⭐: 12-month retention',
          free: false,
          pro: false,
          max: true,
        },
        {
          feature: 'Doctor-shareable reports',
          free: false,
          pro: false,
          max: true,
        },
      ],
    },
    {
      title: 'Supplements',
      availableNow: [
        {
          feature: 'Basic recommendations',
          free: true,
          pro: true,
          max: true,
        },
      ],
      comingSoon: [
        {
          feature: 'Personalized by labs ⭐: Purchase links',
          free: false,
          pro: true,
          max: true,
        },
        {
          feature: 'Nutritionist consultation ⭐⭐: Custom plans',
          free: false,
          pro: false,
          max: true,
        },
      ],
    },
    {
      title: 'Languages',
      availableNow: [
        {
          feature: 'Currently Available: English, Hindi',
          free: true,
          pro: true,
          max: true,
        },
      ],
      comingSoon: [
        {
          feature: 'Coming Soon: Telugu, Tamil, Marathi, Gujarati, Kannada, Bengali',
          free: true,
          pro: true,
          max: true,
        },
      ],
    },
  ];

  const renderCell = (value: boolean, isComingSoonSection: boolean = false) => {
    return value ? (
      <Check className={`w-5 h-5 mx-auto ${isComingSoonSection ? 'text-green-400' : 'text-green-500'}`} />
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
                    <tr key={`cat-${catIndex}`} className="bg-gradient-to-r from-gray-100 to-gray-50">
                      <td
                        colSpan={4}
                        className="px-6 py-3 text-base font-bold text-gray-800"
                      >
                        {category.title}
                      </td>
                    </tr>
                    
                    {/* Available Now Section */}
                    {category.availableNow.length > 0 && (
                      <>
                        <tr key={`available-${catIndex}`} className="bg-white">
                          <td
                            colSpan={4}
                            className="px-6 py-2 text-sm font-medium text-gray-600"
                          >
                            Available Now
                          </td>
                        </tr>
                        {category.availableNow.map((row, rowIndex) => (
                          <tr
                            key={`available-row-${catIndex}-${rowIndex}`}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 text-sm text-gray-700">{row.feature}</td>
                            <td className="px-6 py-4 text-center">
                              {renderCell(row.free, false)}
                            </td>
                            <td className="px-6 py-4 text-center bg-pink-50/30">
                              {renderCell(row.pro, false)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {renderCell(row.max, false)}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                    
                    {/* Coming Soon Section */}
                    {category.comingSoon.length > 0 && (
                      <>
                        <tr key={`coming-${catIndex}`} className="bg-white">
                          <td
                            colSpan={4}
                            className="px-6 py-2 text-sm font-medium text-amber-600 italic"
                          >
                            Coming Soon
                          </td>
                        </tr>
                        {category.comingSoon.map((row, rowIndex) => (
                          <tr
                            key={`coming-row-${catIndex}-${rowIndex}`}
                            className="border-b border-gray-100 hover:bg-gray-50 opacity-70"
                          >
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {row.feature} <span className="text-amber-600 text-xs ml-1">(Coming Soon)</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {renderCell(row.free, true)}
                            </td>
                            <td className="px-6 py-4 text-center bg-pink-50/30">
                              {renderCell(row.pro, true)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {renderCell(row.max, true)}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
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
              <p className="text-sm text-gray-600">Coming Soon - Medical-grade care with professional support</p>
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
