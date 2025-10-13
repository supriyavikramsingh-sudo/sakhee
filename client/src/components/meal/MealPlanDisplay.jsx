import { useState } from 'react';
import { Calendar, Download, Share2, AlertCircle, Info } from 'lucide-react';
import MealCard from './MealCard';
import { jsPDF } from 'jspdf';

const MealPlanDisplay = ({ plan }) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!plan || !plan.plan) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="mx-auto mb-4 text-warning" size={40} />
        <p className="text-muted">No meal plan data available</p>
      </div>
    );
  }

  // Handle both parsed and raw plans
  let parsedPlan = plan.plan;
  let isFallback = false;

  // Check if it's a raw plan that failed to parse
  if (parsedPlan.rawPlan || parsedPlan.error) {
    // Use fallback display
    return (
      <div className="space-y-6">
        <div className="bg-warning bg-opacity-10 border-l-4 border-warning p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-warning flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-warning mb-2">
                Meal Plan Generated (Formatting Issue)
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                The AI generated your meal plan, but we're having trouble displaying it in the
                structured format. We've created a template-based plan for you instead.
              </p>
              <button onClick={() => window.location.reload()} className="btn-primary text-sm">
                Try Generating Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if using fallback
  if (parsedPlan.fallback) {
    isFallback = true;
  }

  // Extract days array
  const days = parsedPlan.days || [];

  if (days.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Info className="mx-auto mb-4 text-primary" size={40} />
        <p className="text-muted mb-4">Generating your personalized meal plan...</p>
        <button onClick={() => window.location.reload()} className="btn-secondary text-sm">
          Refresh Page
        </button>
      </div>
    );
  }

  const currentDay = days[selectedDay] || days[0];

  return (
    <div className="space-y-6">
      {/* Fallback Notice */}
      {isFallback && (
        <div className="bg-info bg-opacity-10 border-l-4 border-info p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="text-info flex-shrink-0" size={20} />
            <p className="text-sm text-gray-700">
              💡 We've created a PCOS-friendly meal plan using our expert templates. All meals are
              low-GI and suitable for your preferences.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Duration</p>
          <p className="text-2xl font-bold text-primary">{days.length} Days</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Daily Budget</p>
          <p className="text-2xl font-bold text-success">₹{plan.budget || '200'}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Diet Type</p>
          <p className="text-lg font-bold capitalize">{plan.dietType || 'Vegetarian'}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-muted mb-1">Region</p>
          <p className="text-lg font-bold capitalize">
            {(plan.region || 'Indian').replace('-', ' ')}
          </p>
        </div>
      </div>

      {/* Day Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-primary" />
          Select Day
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                selectedDay === i
                  ? 'bg-primary text-white'
                  : 'bg-surface text-gray-700 hover:bg-accent hover:text-white'
              }`}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Meals for Selected Day */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary">Day {selectedDay + 1} Meals</h3>

        {currentDay && currentDay.meals && currentDay.meals.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {currentDay.meals.map((meal, idx) => (
              <MealCard key={idx} meal={meal} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-muted">No meals available for this day</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={async () => {
            if (isDownloading) return;
            setIsDownloading(true);
            try {
              const pdf = new jsPDF('p', 'pt', 'a4');
              const pageWidth = pdf.internal.pageSize.getWidth();
              const pageHeight = pdf.internal.pageSize.getHeight();
              const margin = 40;
              const maxWidth = pageWidth - 2 * margin;
              let yPos = margin;

              // Helper to add new page if needed
              const checkPageBreak = (requiredSpace) => {
                if (yPos + requiredSpace > pageHeight - margin) {
                  pdf.addPage();
                  yPos = margin;
                  return true;
                }
                return false;
              };

              // Title
              pdf.setFontSize(24);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Meal Plan', margin, yPos);
              yPos += 30;

              // Summary Info
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'normal');
              pdf.text(`Duration: ${days.length} Days`, margin, yPos);
              yPos += 20;
              pdf.text(`Daily Budget: Rs${plan.budget || '200'}`, margin, yPos);
              yPos += 20;
              pdf.text(`Diet Type: ${plan.dietType || 'Vegetarian'}`, margin, yPos);
              yPos += 20;
              pdf.text(`Region: ${(plan.region || 'Indian').replace('-', ' ')}`, margin, yPos);
              yPos += 30;

              // Loop through all days
              days.forEach((day, dayIndex) => {
                if (!day) return;

                checkPageBreak(40);
                pdf.setFontSize(18);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Day ${dayIndex + 1} Meals`, margin, yPos);
                yPos += 30;

                // Render each meal
                if (day.meals && day.meals.length > 0) {
                  day.meals.forEach((meal, idx) => {
                    checkPageBreak(80);

                    // Meal type header
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(meal.type || `Meal ${idx + 1}`, margin, yPos);
                    yPos += 20;

                    // Meal name
                    if (meal.name) {
                      pdf.setFontSize(12);
                      pdf.setFont('helvetica', 'italic');
                      const nameLines = pdf.splitTextToSize(meal.name, maxWidth);
                      pdf.text(nameLines, margin, yPos);
                      yPos += nameLines.length * 15;
                    }

                    // Ingredients
                    if (meal.ingredients && meal.ingredients.length > 0) {
                      checkPageBreak(20 + meal.ingredients.length * 15);
                      pdf.setFontSize(11);
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Ingredients:', margin, yPos);
                      yPos += 15;
                      pdf.setFont('helvetica', 'normal');
                      meal.ingredients.forEach((ingredient) => {
                        const ingLines = pdf.splitTextToSize(`• ${ingredient}`, maxWidth - 10);
                        pdf.text(ingLines, margin + 10, yPos);
                        yPos += ingLines.length * 14;
                      });
                      yPos += 5;
                    }

                    // Recipe/Instructions
                    if (meal.recipe) {
                      checkPageBreak(40);
                      pdf.setFontSize(11);
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Recipe:', margin, yPos);
                      yPos += 15;
                      pdf.setFont('helvetica', 'normal');
                      const recipeLines = pdf.splitTextToSize(meal.recipe, maxWidth - 10);
                      recipeLines.forEach((line) => {
                        checkPageBreak(14);
                        pdf.text(line, margin + 10, yPos);
                        yPos += 14;
                      });
                      yPos += 5;
                    }

                    // Nutrition info
                    if (meal.nutrition) {
                      checkPageBreak(40);
                      pdf.setFontSize(11);
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('Nutrition:', margin, yPos);
                      yPos += 15;
                      pdf.setFont('helvetica', 'normal');
                      const nutritionText = Object.entries(meal.nutrition)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                      const nutritionLines = pdf.splitTextToSize(nutritionText, maxWidth - 10);
                      pdf.text(nutritionLines, margin + 10, yPos);
                      yPos += nutritionLines.length * 14 + 5;
                    }

                    yPos += 15; // Space between meals
                  });
                }

                // Add extra space between days
                yPos += 20;
              });

              const filename = `meal-plan-all-days.pdf`;
              pdf.save(filename);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('PDF generation failed', err);
              alert('Failed to generate PDF. Please try again.');
            } finally {
              setIsDownloading(false);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg hover:bg-accent hover:text-white transition ${
            isDownloading ? 'opacity-60 pointer-events-none' : ''
          }`}
          aria-disabled={isDownloading}
        >
          <Download size={20} />
          {isDownloading ? 'Preparing PDF...' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
};

export default MealPlanDisplay;
