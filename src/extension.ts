import * as vscode from 'vscode';
import axios, { Axios, AxiosResponse } from 'axios';

const EXTENSION_NAME = "code-buddy";

// Comments
const COMMENT_REGEX = [
  /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, // /* */ , //
  /#[^\n]*/g, // #
  /<!--([\s\S]*?)-->/g // <!-- -->
];

// This method is called when the extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Create a new configuration instance
  let config = vscode.workspace.getConfiguration(EXTENSION_NAME);

  // Subscribe to changes in the configuration
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
    config = vscode.workspace.getConfiguration(EXTENSION_NAME);
  }));


  let insertApi = vscode.commands.registerCommand('code-buddy.insertApi', async () => {
    let input = await openInputBoxForApiKey();
    if (!input) { return vscode.window.showWarningMessage("Please enter you API Key"); }
    storeApiKey(input);
    vscode.window.showInformationMessage("Inserted API Key");
  });
  context.subscriptions.push(insertApi);

  let clearApi = vscode.commands.registerCommand('code-buddy.clearApi', () => {
    storeApiKey(undefined);
  });
  context.subscriptions.push(clearApi);

  let disposable = vscode.commands.registerCommand('code-buddy.command', async () => {
    let apiKey = getApiKey();
    vscode.window.showInformationMessage(`Api Key: ${apiKey}`);
    if (!apiKey) {
      let input = await openInputBoxForApiKey();
      vscode.window.showInformationMessage(`Input: ${input}`);
      if (!input) { return vscode.window.showWarningMessage("Please enter you API Key"); }
      apiKey = input;
      storeApiKey(apiKey);
      let key = getApiKey();
      vscode.window.showInformationMessage(`Api Key: ${key}`);
    }

    const comment = getComment();

    if (!comment) {
      return vscode.window.showWarningMessage("You should be in a position to comment");
    } else if (comment.split(" ").length < 3) {
      return vscode.window.showWarningMessage("You must use a minimum of three words");
    }

    let statusBarMsg = vscode.window.setStatusBarMessage("[CodeBuddy] Searching...");
    let response = await requestToOpenApi(comment, apiKey);
    statusBarMsg.dispose();

    if (response.status !== 200) {
      vscode.window.setStatusBarMessage("Failed", 3000);
      return vscode.window.showErrorMessage(response.statusText);
    }

    let selection = await insertText(response.data);
    if (selection) { selectText(selection); }
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
    storeApiKey(undefined); // Remove the invalid API Key.
    return err.response;
  }

  if (response.status !== 200) { return response; }

  let text = response.data.choices[0].text;
  response.data = text.slice(2, text.length);
  return response;
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
  let line = startLine + text.indexOf("\n") > -1 ? text.split("\n").length : 0;
  return new vscode.Position(line, 0);
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

  let lineText = editor.document.lineAt(editor.selection.active.line).text;

  let comments, i = 0;
  do {
    comments = lineText.match(COMMENT_REGEX[i]);
  } while (++i < COMMENT_REGEX.length && !comments);

  if (!comments) { return ""; }
  let comment = comments[0].replace(/\/\/|\/\*|\*\/|#|<!--|-->/g, "");
  return comment.trim();
}

async function openInputBoxForApiKey() {
  return await vscode.window.showInputBox({
    placeHolder: 'OpenAi api key'
  });
}

function storeApiKey(apiKey: string | undefined) {
  vscode.workspace.getConfiguration(EXTENSION_NAME).update('apiKey', apiKey);
}

// Get API key from config
function getApiKey(): string | undefined {
  let apiKey = vscode.workspace.getConfiguration(EXTENSION_NAME).get('apiKey');
  vscode.window.showInformationMessage(`${apiKey}`);
  if (typeof apiKey === 'string') { return apiKey; }
  return undefined;
}

// This method is called when your extension is deactivated
export function deactivate() { }
