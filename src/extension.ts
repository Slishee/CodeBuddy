// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios, { Axios, AxiosResponse } from 'axios';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "code-buddy" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('code-buddy.command', async () => {
    let apiKey = getApiKey();
    if (!apiKey) {
      let input = await openInputBoxForApiKey();
      if (!input) { return vscode.window.showWarningMessage("Please enter you API Key"); }
      apiKey = input;
      storeApiKey(apiKey);
    }

    const comment = getComment();

    if (!comment) {
      return vscode.window.showWarningMessage("You should be in a position to comment");
    } else if (comment.split(" ").length < 3) {
      return vscode.window.showWarningMessage("You must use a minimum of three words");
    }

    let statusBarMsg = vscode.window.setStatusBarMessage("Searching...");

    let response = await requestToOpenApi(comment, apiKey);

    statusBarMsg.dispose();

    if (response.status !== 200) {
      vscode.window.setStatusBarMessage("Failed", 3000);
      return vscode.window.showErrorMessage(response.statusText);
    }

    let selection = await insertText(response.data);
    if (selection) {
      selectText(selection);
    }
  });

  context.subscriptions.push(disposable);
}


/**
 * This makes http request to openAi with the query as prompt
 *
 * @param {String} query it is the prompt for openai chatGPT
 * @param {String} apiKey the API Key of OpenAI
 *
 * @returns {Promise<Object>}
 */
async function requestToOpenApi(query: string, apiKey: string): Promise<AxiosResponse> {
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

  let response;
  try {
    response = await axios.request(options);
  } catch (err: any) {
    response = err.response;
    storeApiKey(""); // Remove the invalid API Key.
    // return { status: 404, statusText: response.data.error.message };
    return response;
  }

  if (response.status !== 200) { return response; }

  let text = response.data.choices[0].text;
  return text.slice(2, text.length);
}

/**
 * It inserts text after the comment and
 * returns the selection of inserted text
 *
 * @param {string} text this will be inserted to the doc
 * @returns {Promise<vscode.Selection>}
 */
async function insertText(text: string): Promise<vscode.Selection | undefined> {
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
function getEndPosition(text: string, startLine: number): vscode.Position {
  let lines = text.split("\n");
  let line = startLine + lines.length;
  let endPos = new vscode.Position(line, 0);
  return endPos;
}

/**
 * Selects a range of text in the active text editor.
 *
 * @param {vscode.Selection} selection - The start position of the selection range.
 */
function selectText(selection: vscode.Selection) {
  const textEditor = vscode.window.activeTextEditor;
  if (textEditor) { return textEditor.selection = selection; }
}

/**
 * It gives comment if the cursor is in a comment line
 * Else it will return an empty string
 *
 * @returns {String}
 */
function getComment(): string {
  let editor = vscode.window.activeTextEditor;
  if (!editor) { return ""; }

  let lineIndex = editor.selection.active.line;
  let lineText = editor.document.lineAt(lineIndex).text;

  let comments, i = 0;
  do {
    comments = lineText.match(COMMENT_REGEX[i]);
  } while (++i < COMMENT_REGEX.length && !comments);

  if (!comments) { return ""; }
  let comment = comments[0].replace(/\/\/|\/\*|\*\/|#|<!--|-->/g, "");
  return comment.trim();
}

async function openInputBoxForApiKey() {
  let input = await vscode.window.showInputBox({
    placeHolder: 'Enter your API Key of OpenAI'
  });
  return input;
}

async function storeApiKey(apiKey: string) {
  let config = vscode.workspace.getConfiguration();
  config.update('openAi.apiKey', apiKey, true);
}

function getApiKey(): string | undefined {
  let config = vscode.workspace.getConfiguration();
  let apiKey: string | undefined = config.get('openAi.apiKey');
  return apiKey;
}

const COMMENT_REGEX = [
  /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, // /* */ , //
  /#[^\n]*/g, // #
  /<!--([\s\S]*?)-->/g // <!-- -->
];

// This method is called when your extension is deactivated
export function deactivate() { }
