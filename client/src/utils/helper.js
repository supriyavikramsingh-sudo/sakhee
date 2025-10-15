export const boldify = (text) => {
  if (text === undefined) {
    return '';
  }
  return text.replace(/\*\*(.*?)\*\*/g, (_, word) => `<strong>${word}</strong>`);
};
