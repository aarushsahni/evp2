export function formatMarkdown(text: string): string {
  let formatted = text;

  // Handle old format first (more specific): 【id†source】 -> extracts source after †
  formatted = formatted.replace(/【[^†]*?†([^】]+)】/g, '<sup>[$1]</sup>');
  
  // Handle new format: 【SourceName】 (without †) -> extracts full content
  formatted = formatted.replace(/【([^】]+)】/g, '<sup>[$1]</sup>');

  formatted = formatted.replace(/^- /gm, '\n- ');
  formatted = formatted.replace(/^• /gm, '\n• ');
  
  // Add visual spacing before numbered sections (2 and 3 only - 1 is at the start)
  formatted = formatted.replace(/2️⃣/g, '<div class="mt-4 pt-2"></div>2️⃣');
  formatted = formatted.replace(/3️⃣/g, '<div class="mt-4 pt-2"></div>3️⃣');

  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

  formatted = formatted.replace(/^#{1} (.+)$/gm, '<h1>$1</h1>');
  formatted = formatted.replace(/^#{2} (.+)$/gm, '<h2>$1</h2>');
  formatted = formatted.replace(/^#{3} (.+)$/gm, '<h3>$1</h3>');

  const lines = formatted.split('\n');
  let inList = false;
  const processedLines = lines.map((line) => {
    if (line.trim().match(/^[-•]/)) {
      if (!inList) {
        inList = true;
        return '<ul><li>' + line.trim().substring(1).trim() + '</li>';
      }
      return '<li>' + line.trim().substring(1).trim() + '</li>';
    } else {
      if (inList) {
        inList = false;
        return '</ul>' + line;
      }
      return line;
    }
  });

  if (inList) {
    processedLines.push('</ul>');
  }

  formatted = processedLines.join('\n');

  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted;
}
