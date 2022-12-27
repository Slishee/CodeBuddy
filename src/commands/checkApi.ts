import { window } from "vscode";
import { getApiKey } from '../utils/storage';

// Returns the saved API key
export default async function checkApi() {
  let apiKey = getApiKey();
  window.showInformationMessage(`Inserted API Key: ${apiKey}`);
}