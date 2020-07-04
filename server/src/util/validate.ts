import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import definitions from '../definitions';

function validateCommands(text: string, textDocument: TextDocument): Diagnostic[] {
  // this will match <ABC, <ABC0000, <ABC0000:0001, <ABC0000:0001:0002, <ABC0000:0001:0002:0003
  const commandPattern = /\<(([A-Z0-9+-]){3}(([0-9]){4})?)((\:([0-9]){4})?){0,3}/g;
  let match: RegExpExecArray | null;

  let diagnostics: Diagnostic[] = [];

  while (match = commandPattern.exec(text)) {
    const input = match[0];
    const targetCommand = input.substr(0, 4);
    const command = definitions.find(c => c.key === targetCommand);

    if (!command) {
      continue;
    }

    const args = input.slice(4).split(':').filter(a => !!a.length);

    if (args.length !== command.nargs) {
      const quantity = args.length > command.nargs
        ? 'many'
        : 'few';

      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: textDocument.positionAt(match.index),
          end: textDocument.positionAt(match.index + input.length)
        },
        message: `Too ${quantity} arguments provided to ${command.key}. Expected ${command.nargs}, got ${args.length}.`,
        source: 'tsc-argc'
      });
    }
  }

  return diagnostics;
}

function validateEvents(text: string, textDocument: TextDocument): Diagnostic[] {
  // this will match #0000
  const eventPattern = /#([0-9]{4})/g;
  let match: RegExpExecArray | null;

  let diagnostics: Diagnostic[] = [];
  let events: string[] = [];

  while (match = eventPattern.exec(text)) {
    const input = match[0];

    if (events.includes(input)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: textDocument.positionAt(match.index),
          end: textDocument.positionAt(match.index + input.length)
        },
        message: `Event ${input} has already been declared in this file.`,
        source: 'no-event-dup'
      });
    }

    events.push(input);
  }

  return diagnostics;
}

function validateMessages(text: string, textDocument: TextDocument): Diagnostic[] {
  // this will match anything that starts with <MSG, <MS2, or <MS3 and ends
  // <CLO, <END, <ESC, <EVE, <INI, <TRA, or <XX1
  const messageBoxPattern = /(?:<MS[G|2|3]\n?)((.|\n)+?)(?:<CLO|<END|<ESC|<EVE|<INI|<TRA|<XX1)/g;
  let match: RegExpExecArray | null;

  const diagnostics: Diagnostic[] = [];

  while (match = messageBoxPattern.exec(text)) {
    const message = match[0];

    const lines = message.split(/\n|<CLR/g);

    let hasPortrait: boolean = false;

    lines.forEach(line => {
      // this will remove all TSC tags from the string, giving us a clean output
      const cleanLine = line.replace(/<(([A-Z0-9+-]){3}(([0-9]){4})?)((\:([0-9]){4})?){0,3}/g, '');

      if (line.includes('<FAC0000')) {
        hasPortrait = false;
      }

      if (line.includes('<FAC') && !line.includes('<FAC0000')) {
        hasPortrait = true;
      }

      const limit = hasPortrait ? 28 : 35;

      if (cleanLine.length > limit) {
        // tbh I have no idea why I have to check for match here
        match && diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: textDocument.positionAt(match.index + message.indexOf(line)),
            end: textDocument.positionAt(match.index + message.indexOf(line) + line.length)
          },
          message: `Message exceeds ${limit} characters (current length: ${cleanLine.length}). This may cause text overflow issues.`,
          source: 'text-overflow'
        });
      }
    });
  }

  return diagnostics;
}

function validate(textDocument: TextDocument): Diagnostic[] {
  const text = textDocument.getText();

  let diagnostics: Diagnostic[] = [
    ...validateCommands(text, textDocument),
    ...validateEvents(text, textDocument),
    ...validateMessages(text, textDocument)
  ];

  return diagnostics;
}

export default validate;