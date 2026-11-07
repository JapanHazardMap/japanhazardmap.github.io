// Workspace/your_open_repos/public/viewer/catalog.js

export async function loadCatalog() {

    const response =
        await fetch(
            "/catalog.json"
        );

    if (
        !response.ok
    ) {

        throw new Error(
            `catalog.json load failed : ${response.status}`
        );

    }

    return response.json();
}

