export const boldify = (text: string) => {
  if (text === undefined) {
    return '';
  }
  let boldText = text.replace(/\*\*(.*?)\*\*/g, (_, word) => `<strong>${word}</strong>`);
  return boldText.replace(/\*(.*?)\*/g, (_, word) => `<strong>${word}</strong>`);
};

export const formatTimestamp = (timestamp) => {
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
