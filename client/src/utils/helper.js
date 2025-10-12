export const boldify = (text) => {
  return text.replace(/\*\*(.*?)\*\*/g, (_, word) => `<strong>${word}</strong>`);
};
