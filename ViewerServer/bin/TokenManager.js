// Workspace/your_open_repos/ViewerServer/bin/TokenManager.js

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export class TokenManager {

    constructor({

        authRoot

    }) {

        this.authRoot =
            authRoot;

        fs.mkdirSync(
            authRoot,
            {
                recursive:true
            }
        );
    }

    getCurrentPath() {

        return path.join(
            this.authRoot,
            "current.json"
        );
    }

    initialize() {

        const file =
            this.getCurrentPath();

        if (
            fs.existsSync(
                file
            )
        ) {

            return;
        }

        const token =
            crypto
            .randomBytes(32)
            .toString("hex");

        fs.writeFileSync(
            file,

            JSON.stringify({

                token,

                createdAt:
                    new Date()
                    .toISOString()
            })
        );
    }

    getCurrentToken() {

        return JSON.parse(

            fs.readFileSync(
                this.getCurrentPath(),
                "utf8"
            )

        ).token;
    }

    validate(
        token
    ) {

        return (
            token ===
            this.getCurrentToken()
        );
    }
}

