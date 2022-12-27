// Vscode api
import { ExtensionContext, commands } from 'vscode';
// Storage access
import { storeApiKey } from './utils/storage';

// Commands
import insertApi from './commands/insertApi';
import checkApi from './commands/checkApi';
import writeCode from './commands/writeCode';

// This methods gets called when the extension is loaded
export function activate(context: ExtensionContext) {
  // Set api key and store to global
  let insertApiCmd = commands.registerCommand('code-buddy.insertApi', insertApi);
  context.subscriptions.push(insertApiCmd);

  // Check for available api key
  let checkApiCmd = commands.registerCommand('code-buddy.checkApi', checkApi);
  context.subscriptions.push(checkApiCmd);

  // Clear api key from global
  let clearApiCmd = commands.registerCommand('code-buddy.clearApi', async () => {
    await storeApiKey(undefined);
  });
  context.subscriptions.push(clearApiCmd);

  // Get code from comment
  let writeCodeCmd = commands.registerCommand('code-buddy.command', writeCode);
  context.subscriptions.push(writeCodeCmd);
}

// This method is called when your extension is deactivated
export function deactivate() { }
