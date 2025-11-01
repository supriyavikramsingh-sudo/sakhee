export const boldify = (text: string) => {
  if (text === undefined) {
    return '';
  }
  
  let processedText = text;
  
  // STEP 1: Convert markdown headers FIRST (before bold processing)
  processedText = processedText.replace(/^#### (.*?)$/gm, '<h4 class="text-lg font-semibold mt-4 mb-2">$1</h4>');
  processedText = processedText.replace(/^### (.*?)$/gm, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>');
  processedText = processedText.replace(/^## (.*?)$/gm, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>');
  processedText = processedText.replace(/^# (.*?)$/gm, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>');
  
  // STEP 2: Convert horizontal rules (before bullets)
  processedText = processedText.replace(/^---$/gm, '<hr class="my-4 border-gray-300" />');
  
  // STEP 3: Handle bullet points - BEFORE converting \n to <br />
  // Strategy: Match lines with bullets, strip them from content, add back ONE bullet
  processedText = processedText.replace(/^\s*[-•]\s*(.+?)$/gm, (_match, content) => {
    // Strip ALL leading bullets/spaces from content
    const cleanContent = content.replace(/^[•\s-]+/, '').trim();
    // Add single bullet (using plain text bullet, not CSS list-style)
    return `<div class="ml-4">• ${cleanContent}</div>`;
  });
  
  // STEP 4: Convert numbered lists
  processedText = processedText.replace(/^\d+\.\s+(.*?)$/gm, '<li class="ml-4">$1</li>');
  
  // STEP 5: Convert markdown links [text](url) to HTML <a> tags
  processedText = processedText.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, linkText, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-dark">${linkText}</a>`
  );
  
  // STEP 6: Special handling for disclaimer warnings (⚠️ *text* should be bold, not italic)
  processedText = processedText.replace(/^(⚠️\s+)\*(.+?)\*$/gm, '$1<strong>$2</strong>');
  
  // STEP 7: Convert **bold** to <strong>
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // STEP 8: Convert *italic* to <em> (only single asterisks that haven't been converted)
  processedText = processedText.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
  
  // STEP 9: Convert line breaks to <br> tags (LAST!)
  processedText = processedText.replace(/\n/g, '<br />');
  
  return processedText;
};

export const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';

  try {
    // Handle Firestore Timestamp objects
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleTimeString();
    }

    // Handle Firebase Timestamp with seconds
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleTimeString();
    }

    // Handle ISO string or regular Date object
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString();
    }

    return '';
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};
