import * as vscode from "vscode";
import axios, { Axios, AxiosResponse } from 'axios';
import COMMENT_REGEX from "../utils/reg";

export async function insertText(text: string): Promise<vscode.Selection | undefined> {
  let editor = vscode.window.activeTextEditor;

  if (!editor) { return; }

  let lineIndex = editor.selection.active.line;
  let characterIndex = editor.document.lineAt(lineIndex).text.length;
  let insertionPosition = new vscode.Position(lineIndex, characterIndex);
  let edit = new vscode.WorkspaceEdit();
  edit.insert(editor.document.uri, insertionPosition, `\n${text}`);
  vscode.workspace.applyEdit(edit);

  let startLine = lineIndex + 1;
  let startPos = new vscode.Position(startLine, 0);
  let endPos = getEndPosition(text, startLine);

  return new Promise((resolve) => {
    setTimeout(() => {
      let selection = new vscode.Selection(startPos, endPos);
      resolve(selection);
    }, 10);
  });
}

export function getEndPosition(text: string, startLine: number): vscode.Position {
  let line = startLine + text.indexOf("\n") > -1 ? text.split("\n").length : 0;
  return new vscode.Position(line, 0);
}

export function selectText(selection: vscode.Selection) {
  const textEditor = vscode.window.activeTextEditor;
  if (textEditor) { return textEditor.selection = selection; }
}

export function getComment(): string {
  let editor = vscode.window.activeTextEditor;
  if (!editor) { return ""; }

  let lineText = editor.document.lineAt(editor.selection.active.line).text;

  let comments, i = 0;
  do {
    comments = lineText.match(COMMENT_REGEX[i]);
  } while (++i < COMMENT_REGEX.length && !comments);

  if (!comments) { return ""; }
  let comment = comments[0].replace(/\/\/|\/\*|\*\/|#|<!--|-->/g, "");
  return comment.trim();
}

export async function openInputBoxForApiKey() {
  return await vscode.window.showInputBox({
    placeHolder: 'OpenAi api key'
  });
}