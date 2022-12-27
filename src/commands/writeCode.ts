import { window } from 'vscode';
import { requestToOpenApi } from '../api';
import * as util from '../editor';
import { getApiKey, storeApiKey } from '../utils/storage';

// Generates code from the comment given
export default async function writeCode() {
  let apiKey = getApiKey();
  if (!apiKey) {
    apiKey = await util.openInputBoxForApiKey();
    if (!apiKey) { return window.showWarningMessage("Please enter you API Key"); }
    await storeApiKey(apiKey);
  }

  const comment = util.getComment();

  if (!comment) {
    return window.showWarningMessage("Please select a comment");
  } else if (comment.split(" ").length < 3) {
    return window.showWarningMessage("Minimum of three words are required");
  }

  let statusBarMsg = window.setStatusBarMessage("🤖 Searching...");
  let response = await requestToOpenApi(comment, apiKey);
  statusBarMsg.dispose();

  if (response.status !== 200) {
    window.setStatusBarMessage("Failed...", 3000);
    return window.showErrorMessage(response.statusText);
  }

  let selection = await util.insertText(response.data);
  if (selection) { util.selectText(selection); }
}