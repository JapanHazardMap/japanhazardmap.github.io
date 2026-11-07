// Workspace/your_open_repos/ViewerServer/bin/ConnectionDrainManager.js

export class ConnectionDrainManager {

    constructor({
        server,
        diagnostics
    }) {

        this.server =
            server;

        this.diagnostics =
            diagnostics;

        this.draining =
            false;
    }

    middleware() {

        return (
            req,
            res,
            next
        ) => {

            if (
                this.draining
            ) {

                return res
                    .status(503)
                    .json({
                        status:
                            "draining"
                    });
            }

            next();
        };
    }

    async drain() {

        if (
            this.draining
        ) {
            return;
        }

        this.draining =
            true;

        this.diagnostics.write(
            "DrainStart"
        );

        await new Promise(
            resolve =>
                this.server.close(
                    resolve
                )
        );

        this.diagnostics.write(
            "DrainCompleted"
        );
    }
}

