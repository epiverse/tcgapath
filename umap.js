// Function to load embeddings from IndexedDB
async function loadEmbeddingsFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("EmbeddingsDB", 1);

        request.onerror = () => reject("Error opening database");
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("embeddings", "readonly");
            const store = transaction.objectStore("embeddings");

            const embeddings = [];
            store.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    embeddings.push(cursor.value.data);
                    cursor.continue();
                } else {
                    resolve(embeddings);
                }
            };
        };
    });
}

// Function to compute UMAP on the embeddings
async function computeUMAP(embeddings, nComponents = 2) {
    // Initialize UMAP
    const umap = new UMAP.UMAP({
        nComponents: nComponents,
        nNeighbors: 15,
        minDist: 0.1
    });

    console.log("Computing UMAP embeddings...");
    const umapEmbedding = await umap.fit(embeddings); // use fit method
    console.log("UMAP embedding computation completed.");
    return umapEmbedding;
}

// Function to plot UMAP embeddings with Plotly
function plotUMAP(umapData, nComponents) {
    if (nComponents === 2) {
        const trace = {
            x: umapData.map((point) => point[0]),
            y: umapData.map((point) => point[1]),
            mode: "markers",
            type: "scatter",
            marker: { size: 6, color: "blue" },
        };

        const layout = {
            title: "2D UMAP Plot",
            xaxis: { title: "UMAP1" },
            yaxis: { title: "UMAP2" },
        };

        Plotly.newPlot("umapPlot", [trace], layout);

    } else if (nComponents === 3) {
        const trace = {
            x: umapData.map((point) => point[0]),
            y: umapData.map((point) => point[1]),
            z: umapData.map((point) => point[2]),
            mode: "markers",
            type: "scatter3d",
            marker: { size: 6, color: "blue" },
        };

        const layout = {
            title: "3D UMAP Plot",
            scene: {
                xaxis: { title: "UMAP1" },
                yaxis: { title: "UMAP2" },
                zaxis: { title: "UMAP3" },
            },
        };

        Plotly.newPlot("umapPlot", [trace], layout);
    }
}

// Main function to load embeddings, compute UMAP, and plot
async function mainUMAP(nComponents = 2) {
    try {
        const embeddings = await loadEmbeddingsFromIndexedDB();

        if (embeddings.length === 0) {
            console.error("No embeddings data available for UMAP.");
            return;
        }

        const umapData = await computeUMAP(embeddings, nComponents);

        // Plot UMAP result
        plotUMAP(umapData, nComponents);

    } catch (error) {
        console.error("Error performing UMAP:", error);
    }
}

// Run UMAP main function with 2D or 3D based on your choice
window.addEventListener("load", () => mainUMAP(2));  // Use 2 or 3 for 2D or 3D UMAP
