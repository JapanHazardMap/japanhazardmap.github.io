// Workspace/your_open_repos/ViewerServer/bin/DiagnosticCollector.js

import fs from "node:fs";

export class DiagnosticCollector {

    constructor(
        root = "./diagnostics"
    ) {

        this.root = root;

        fs.mkdirSync(
            root,
            {
                recursive:true
            }
        );
    }

    write(
        event,
        data = {}
    ) {

        const file =
`${this.root}/${Date.now()}.json`;

        fs.writeFileSync(
            file,
            JSON.stringify(
                {
                    timestamp:
                        new Date()
                        .toISOString(),

                    event,

                    ...data
                },
                null,
                2
            )
        );
    }
}

