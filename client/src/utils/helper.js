export const boldify = (text) => {
  console.log(text);

  if (text === undefined) {
    return '';
  }
  let boldText = text.replace(/\*\*(.*?)\*\*/g, (_, word) => `<strong>${word}</strong>`);
  return boldText.replace(/\*(.*?)\*/g, (_, word) => `<strong>${word}</strong>`);
};
