import { jsPDF } from 'jspdf';
import type { Day, PlanData } from '../types/meal.type';

export const downloadPDFHelper = (days: Day[], plan: PlanData) => {
  console.log(days, plan);
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
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
  pdf.text(
    `Region: ${(plan.regions.map((region) => region.replace('-', ' ')).join() || 'Indian').replace(
      '-',
      ' '
    )}`,
    margin,
    yPos
  );
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
        pdf.text(meal.mealType.toUpperCase() || `Meal ${idx + 1}`, margin, yPos);
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
            const ingLines = pdf.splitTextToSize(`• ${ingredient.item}`, maxWidth - 10);
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
        if (meal.calories || meal.protein || meal.carbs || meal.fats) {
          checkPageBreak(40);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Nutrition:', margin, yPos);
          yPos += 15;
          pdf.setFont('helvetica', 'normal');
          let nameLines = pdf.splitTextToSize(String(meal.calories), maxWidth);
          pdf.text(`Calories : ${nameLines}`, margin + 10, yPos);
          yPos += nameLines.length * 15;
          nameLines = pdf.splitTextToSize(String(meal.protein), maxWidth);
          pdf.text(`Protein : ${nameLines}`, margin + 10, yPos);
          yPos += nameLines.length * 15;
          nameLines = pdf.splitTextToSize(String(meal.carbs), maxWidth);
          pdf.text(`Carbs : ${nameLines}`, margin + 10, yPos);
          yPos += nameLines.length * 15;
          nameLines = pdf.splitTextToSize(String(meal.fats), maxWidth);
          pdf.text(`Fats : ${nameLines}`, margin + 10, yPos);
          yPos += nameLines.length * 15;
        }

        yPos += 15; // Space between meals
      });
    }

    // Add extra space between days
    yPos += 20;
  });

  const filename = `meal-plan-all-days.pdf`;
  pdf.save(filename);
};
