import * as vscode from 'vscode';
import *  as util from './utils';

// This method is called when the extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Set api key and store to global
  let insertApi = vscode.commands.registerCommand('code-buddy.insertApi', async () => {
    let input = await util.openInputBoxForApiKey();
    if (!input) { return vscode.window.showWarningMessage("Please enter you API Key"); }
    util.storeApiKey(input);
    vscode.window.showInformationMessage("Inserted API Key");
  });
  context.subscriptions.push(insertApi);

  // Check for available api key
  let checkApi = vscode.commands.registerCommand('code-buddy.checkApi', () => {
    let apiKey = util.getApiKey();
    vscode.window.showInformationMessage(`Inserted API Key: ${apiKey}`);
  });
  context.subscriptions.push(checkApi);

  // Clear api key from global
  let clearApi = vscode.commands.registerCommand('code-buddy.clearApi', () => {
    util.storeApiKey(undefined);
  });
  context.subscriptions.push(clearApi);

  let disposable = vscode.commands.registerCommand('code-buddy.command', async () => {
    let apiKey = util.getApiKey();
    if (!apiKey) {
      let input = await util.openInputBoxForApiKey();
      vscode.window.showInformationMessage(`Input: ${input}`);
      if (!input) { return vscode.window.showWarningMessage("Please enter you API Key"); }
      apiKey = input;
      util.storeApiKey(apiKey);
    }

    const comment = util.getComment();

    if (!comment) {
      return vscode.window.showWarningMessage("You should be in a position to comment");
    } else if (comment.split(" ").length < 3) {
      return vscode.window.showWarningMessage("You must use a minimum of three words");
    }

    let statusBarMsg = vscode.window.setStatusBarMessage("🤖 Searching...");
    let response = await util.requestToOpenApi(comment, apiKey);
    statusBarMsg.dispose();

    if (response.status !== 200) {
      vscode.window.setStatusBarMessage("Failed", 3000);
      return vscode.window.showErrorMessage(response.statusText);
    }

    let selection = await util.insertText(response.data);
    if (selection) { util.selectText(selection); }
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
