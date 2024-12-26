async function fetchTCGAReports() {
    const GITHUB_ZIP_URL = "https://epiverse.github.io/tcgapath/embeddings.tsv.zip";
    try {
        const response = await fetch(GITHUB_ZIP_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch ZIP file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched ZIP file.");

        const data = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(data);
        console.log("Successfully loaded ZIP file.");

        const file = zip.file('embeddings.tsv');
        if (!file) {
            throw new Error("TSV file not found in the ZIP archive.");
        }

        const content = await file.async('string');
        return content;
    } catch (error) {
        console.error("Error fetching and unzipping file:", error);
        throw error;
    }
}

function parseTSV(tsvContent) {
    const data = tsvContent.trim().split("\n").map(line => line.split("\t").map(parseFloat));
    console.log("Parsed TSV data. Rows:", data.length, "Columns per row:", data[0]?.length || 0);
    return data;
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
        const reports = await fetchTCGAReports();
        const embeddings = parseTSV(reports);

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
window.addEventListener("load", () => mainUMAP(3));  // Use 2 or 3 for 2D or 3D UMAP
