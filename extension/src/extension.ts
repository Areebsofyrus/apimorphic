import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('aiApiTester.openDashboard', () => {
    const panel = vscode.window.createWebviewPanel(
      'aiApiTesterDashboard',
      'APIMorphic Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview', 'dist'))],
      },
    );

    const config = vscode.workspace.getConfiguration('aiApiTester');
    const backendUrl = config.get<string>('backendUrl') || 'http://localhost:3000';

    panel.webview.html = getWebviewContent(panel.webview, context.extensionPath, backendUrl);
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(webview: vscode.Webview, extensionPath: string, backendUrl: string): string {
  const distPath = path.join(extensionPath, 'webview', 'dist');
  const htmlPath = path.join(distPath, 'index.html');

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    const jsUri = webview.asWebviewUri(vscode.Uri.file(path.join(distPath, 'assets', 'index.js')));
    const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(distPath, 'assets', 'index.css')));
    const logoUri = webview.asWebviewUri(vscode.Uri.file(path.join(distPath, 'logo.png')));

    html = html.replace(/src="\/assets\/index\.js"/g, `src="${jsUri}"`);
    html = html.replace(/href="\/assets\/index\.css"/g, `href="${cssUri}"`);
    html = html.replace(/src="assets\/index\.js"/g, `src="${jsUri}"`);
    html = html.replace(/href="assets\/index\.css"/g, `href="${cssUri}"`);
    html = html.replace(/src="\/logo\.png"/g, `src="${logoUri}"`);
    html = html.replace(/src="logo\.png"/g, `src="${logoUri}"`);

    const configScript = `<script>window.API_BASE_URL = "${backendUrl}";</script>`;
    html = html.replace('<head>', `<head>${configScript}`);

    return html;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>APIMorphic</title>
</head>
<body style="background-color: #0f172a; color: #fff; font-family: sans-serif; padding: 2rem;">
  <h2>APIMorphic Webview Bundle Not Found</h2>
  <p>Please run <code>cd extension/webview && npm run build</code> and re-launch.</p>
</body>
</html>`;
}

export function deactivate() {}
