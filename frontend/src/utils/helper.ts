export const boldify = (text: string) => {
  if (text === undefined) {
    return '';
  }
  
  // Convert markdown links [text](url) to HTML <a> tags
  let processedText = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, linkText, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-dark">${linkText}</a>`
  );
  
  // Convert **bold** to <strong>
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, (_, word) => `<strong>${word}</strong>`);
  
  // Convert *italic* to <strong> (treating as bold for consistency)
  processedText = processedText.replace(/\*(.*?)\*/g, (_, word) => `<strong>${word}</strong>`);
  
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
