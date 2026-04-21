/**
 * Recursively translates specified keys in a JS object.
 * Handles API limits by chunking large requests.
 */
export async function translateObject<T>(
  data: T,
  targetLang: string,
  keysToTranslate: string[] = [
    "title",
    "description",
    "message",
    "buttonText",
    "successMessage",
    "mainButtonText",
    "urlButtonText",
  ]
): Promise<T> {
  const translationsMap: {
    path: string[];
    value: string;
    protectedPhrases: string[];
  }[] = [];

  // 1. Collect strings
  function collectStrings(obj: any, path: string[] = []) {
    if (typeof obj !== "object" || obj === null) return;
    for (const key in obj) {
      const value = obj[key];
      const currentPath = [...path, key];
      if (
        keysToTranslate.includes(key) &&
        typeof value === "string" &&
        value.trim() !== ""
      ) {
        const protectedPhrases: string[] = [];
        const processedValue = value.replace(/\*(.*?)\*/g, (_, phrase) => {
          const placeholder = `[[${protectedPhrases.length}]]`;
          protectedPhrases.push(phrase);
          return placeholder;
        });
        translationsMap.push({
          path: currentPath,
          value: processedValue,
          protectedPhrases,
        });
      } else if (typeof value === "object") {
        collectStrings(value, currentPath);
      }
    }
  }

  collectStrings(data);
  if (translationsMap.length === 0) return data;

  // 2. CHUNKING LOGIC: Split the map into groups of 50 to avoid API limits
  const CHUNK_SIZE = 50;
  const allTranslatedStrings: string[] = [];
  const textStrings = translationsMap.map((t) => t.value);

  try {
    for (let i = 0; i < textStrings.length; i += CHUNK_SIZE) {
      const chunk = textStrings.slice(i, i + CHUNK_SIZE);

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: chunk,
          targetLang,
          format: "text",
        }),
      });

      const { translations, error } = await response.json();
      if (error) throw new Error(error);

      allTranslatedStrings.push(...translations);
    }

    // 3. Reassemble the object
    const result = JSON.parse(JSON.stringify(data));

    allTranslatedStrings.forEach((translatedText, index) => {
      const { path, protectedPhrases } = translationsMap[index];
      let restoredText = translatedText;

      protectedPhrases.forEach((original, i) => {
        // Regex handles cases where Google adds spaces: [[0]] -> [[ 0 ]]
        const placeholderRegex = new RegExp(`\\[\\[\\s*${i}\\s*\\]\\]`, "g");
        restoredText = restoredText.replace(placeholderRegex, original);
      });

      let current = result;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = restoredText;
    });

    return result as T;
  } catch (err) {
    console.error("Translation utility failed:", err);
    return data;
  }
}
