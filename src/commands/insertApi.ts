import * as vscode from "vscode";
import { openInputBoxForApiKey } from '../editor';
import { storeApiKey } from '../utils/storage';

// Saves a new api key to the config
export default async function insertApi() {
  let input = await openInputBoxForApiKey();
  if (!input) { return vscode.window.showWarningMessage("Please enter you API Key"); }
  await storeApiKey(input);
  vscode.window.showInformationMessage("Inserted API Key");
}