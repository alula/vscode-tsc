import * as path from 'path';
import { ExtensionContext } from 'vscode';

import {
  LanguageClient,
  ServerOptions,
  TransportKind,
  LanguageClientOptions
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  let serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  let serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  let clientOptions: LanguageClientOptions = {
    documentSelector: [
      {
        scheme: 'file',
        language: 'tsc'
      },
      {
        scheme: 'untitled',
        language: 'tsc'
      }
    ]
  };

  client = new LanguageClient(
    'tsc',
    'Cave Story TSC Language Client',
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }

  return client.stop();
}
