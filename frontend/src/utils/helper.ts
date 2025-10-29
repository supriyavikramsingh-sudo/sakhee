export const boldify = (text: string) => {
  if (text === undefined) {
    return '';
  }
  let boldText = text.replace(/\*\*(.*?)\*\*/g, (_, word) => `<strong>${word}</strong>`);
  return boldText.replace(/\*(.*?)\*/g, (_, word) => `<strong>${word}</strong>`);
};
