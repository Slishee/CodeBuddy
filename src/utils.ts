import * as vscode from "vscode";
import axios, { Axios, AxiosResponse } from 'axios';
import COMMENT_REGEX from "./reg";

/**
 * This makes http request to openAi with the query as prompt
 *
 * @param {String} query it is the prompt for openai chatGPT
 * @param {String} apiKey the API Key of OpenAI
 *
 * @returns {Promise<Object>}
 */
export async function requestToOpenApi(query: string, apiKey: string): Promise<AxiosResponse> {
  let languageId = vscode.window.activeTextEditor?.document.languageId;

  /* eslint-disable @typescript-eslint/naming-convention */
  const options = {
    method: "POST",
    url: "https://api.openai.com/v1/completions",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    data: {
      "model": "text-davinci-003",
      "prompt": `${query} (${languageId})`,
      "temperature": 0.7,
      "max_tokens": 256,
      "top_p": 1,
      "frequency_penalty": 0,
      "presence_penalty": 0,
    },
  };

  try {
    let response = await axios.request(options);
    if (response.status !== 200) { return response; }

    let text = response.data.choices[0].text;
    response.data = text.slice(2, text.length);
    return response;
  } catch (err: any) {
    // storeApiKey(undefined); // Remove the invalid API Key.
    return err.response;
  }
}

/**
 * It inserts text after the comment and
 * returns the selection of inserted text
 *
 * @param {string} text this will be inserted to the doc
 * @returns {Promise<vscode.Selection>}
 */
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

/**
 * This Helper function helps to get end position of inserted line
 *
 * @param {String} text the insertion text
 * @param {number} startLine the index of start line of insertion
 * @returns {vscode.Position}
 */
export function getEndPosition(text: string, startLine: number): vscode.Position {
  let line = startLine + text.indexOf("\n") > -1 ? text.split("\n").length : 0;
  return new vscode.Position(line, 0);
}

/**
 * Selects a range of text in the active text editor.
 *
 * @param {vscode.Selection} selection - The start position of the selection range.
 */
export function selectText(selection: vscode.Selection) {
  const textEditor = vscode.window.activeTextEditor;
  if (textEditor) { return textEditor.selection = selection; }
}

/**
 * It gives comment if the cursor is in a comment line
 * Else it will return an empty string
 *
 * @returns {String}
 */
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

export function storeApiKey(apiKey: string | undefined) {
  vscode.workspace.getConfiguration().update('openAi.apiKey', apiKey);
}

// Get API key from config
export function getApiKey(): string | undefined {
  let apiKey = vscode.workspace.getConfiguration().get('openAi.apiKey');
  if (typeof apiKey !== 'string') { return undefined; }
  return apiKey;
}