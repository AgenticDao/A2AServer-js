/**
 * Code format utilities for processing markdown code blocks
 */
import { z } from "zod";

export const CodeFileSchema = z.object({
  preamble: z.string().optional(),
  filename: z.string(),
  language: z.string().optional(),
  content: z.string(),
  done: z.boolean().default(true),
});

export const CodeMessageSchema = z.object({
  files: z.array(CodeFileSchema),
  postamble: z.string().optional(),
});

export type CodeFile = z.infer<typeof CodeFileSchema>;
export type CodeMessageData = z.infer<typeof CodeMessageSchema>;

export class CodeMessage implements CodeMessageData {
  constructor(public files: CodeFile[] = [], public postamble?: string) {}

  /** Returns the first file's preamble. */
  get preamble() {
    return this.files[0]?.preamble || "";
  }

  /** Returns the first file's filename. */
  get filename() {
    return this.files[0]?.filename || "";
  }

  /** Returns the first file's language. */
  get language() {
    return this.files[0]?.language || "";
  }

  /** Returns the first file's content. */
  get content() {
    return this.files[0]?.content || "";
  }

  toJSON(): CodeMessageData {
    return {
      files: this.files,
      postamble: this.postamble,
    };
  }
}

/**
 * Extracts code blocks from markdown text
 */
export function extractCodeFromMarkdown(source: string): CodeMessageData {
  const files: CodeFile[] = [];
  let currentPreamble = "";
  let postamble = "";

  const lines = source.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      if (!inCodeBlock) {
        // Starting a new code block
        inCodeBlock = true;
        // Parse the code block header
        let language = "";
        let filename = "";
        
        const header = trimmedLine.substring(3).trim();
        const parts = header.split(" ");
        
        if (parts.length >= 1) {
          language = parts[0];
        }
        if (parts.length >= 2) {
          filename = parts.slice(1).join(" ");
        }

        // Start a new file entry
        files.push({
          preamble: currentPreamble.trim(),
          filename: filename || `file_${files.length + 1}.${language}`,
          language,
          content: "",
          done: false,
        });
        currentPreamble = "";
      } else {
        // Ending a code block
        inCodeBlock = false;
        // Mark the current file as done
        if (files.length > 0) {
          files[files.length - 1].done = true;
        }
      }
      continue;
    }

    if (inCodeBlock) {
      // Add to the current file's content
      if (files.length > 0) {
        files[files.length - 1].content += line + "\n";
      }
    } else {
      // If we're past all code blocks and have content, this is postamble
      if (files.length > 0 && files[files.length - 1].done) {
        postamble += line + "\n";
      } else {
        // Otherwise this is preamble for the next file
        currentPreamble += line + "\n";
      }
    }
  }

  // Ensure all files are marked as done
  files.forEach(file => file.done = true);

  return {
    files,
    postamble: postamble.trim(),
  };
}

/**
 * Returns the system prompt for code generation
 */
export function getCodeGenerationSystemPrompt(): string {
  return `You are an expert coding assistant. Provide high-quality code samples according to the user's request.

=== Output Instructions

Output code in a markdown code block using the following format:

\`\`\`ts file.ts
// code goes here
\`\`\`

- Always include the filename on the same line as the opening code ticks.
- Always include both language and path.
- Do not include additional information other than the code unless explicitly requested.
- Ensure that you always include both the language and the file path.
- If you need to output multiple files, make sure each is in its own code block separated by two newlines.
- If you aren't working with a specific directory structure or existing file, use a descriptive filename like 'fibonacci.ts'

When generating code, always include a brief comment (using whatever comment syntax is appropriate for the language) at the top that provides a short summary of what the file's purpose is, for example:

\`\`\`ts src/components/habit-form.tsx
/** HabitForm is a form for creating and editing habits to track. */
"use client";
// ... rest of code generated below
\`\`\`
`;
}