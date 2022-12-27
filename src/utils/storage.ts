import * as vscode from "vscode";

export async function storeApiKey(apiKey: string | undefined) {
  await vscode.workspace.getConfiguration().update('codeBuddy.apiKey', apiKey, vscode.ConfigurationTarget.Global);
}

// Get API key from config
export function getApiKey(): string | undefined {
  let apiKey = vscode.workspace.getConfiguration().get('codeBuddy.apiKey');
  if (typeof apiKey !== 'string') { return undefined; }
  return apiKey;
}