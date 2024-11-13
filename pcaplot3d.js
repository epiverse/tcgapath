// Function to initialize Pyodide for 3D PCA
async function initializePyodide3D() {
    if (typeof loadPyodide === "undefined") {
      throw new Error("Pyodide is not loaded. Check if the script is correctly included.");
    }

    const pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/",
    });
    await pyodide.loadPackage("scikit-learn");
    console.log("Pyodide initialized successfully for 3D PCA.");
    return pyodide;
}

// Function to load embeddings from IndexedDB for 3D PCA
async function loadEmbeddingsFromIndexedDB3D() {
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
                    console.log("Embeddings loaded successfully for 3D PCA:", embeddings);
                    resolve(embeddings);
                }
            };
        };
    });
}

// Function to perform 3D PCA transformation using Pyodide
async function pcaTransform3D(pyodide, data, nComponents = 3) {
    const jsonData = JSON.stringify(data);
    pyodide.globals.set("X_json", jsonData);
    pyodide.globals.set("n_components", nComponents);

    const transformedData = pyodide.runPython(`
        import json
        import numpy as np
        from sklearn.decomposition import PCA

        X = np.array(json.loads(X_json))
        del X_json

        pca = PCA(n_components=n_components)
        X_transformed = pca.fit_transform(X).tolist()
        X_transformed
    `);

    console.log("3D PCA transformation completed:", transformedData);
    return transformedData.toJs();
}

// Function to plot the 3D PCA-transformed data using Plotly
function plotPCA3D(data) {
    if (!data || data.length === 0) {
        console.error("No data available for 3D plotting.");
        return;
    }

    const xValues = data.map((point) => point[0]);
    const yValues = data.map((point) => point[1]);
    const zValues = data.map((point) => point[2]);

    const trace = {
        x: xValues,
        y: yValues,
        z: zValues,
        mode: "markers",
        type: "scatter3d",
        marker: { size: 6, color: "blue" },
    };

    const layout = {
        title: "3D PCA Plot",
        scene: {
            xaxis: { title: "PC1" },
            yaxis: { title: "PC2" },
            zaxis: { title: "PC3" },
        },
    };

    console.log("Plotting 3D PCA data.");
    Plotly.newPlot("pcaPlot3D", [trace], layout);  // Use the new HTML div ID
}

// Main function to execute 3D PCA on embeddings and display results
async function main3D() {
    try {
        const pyodide = await initializePyodide3D();
        const embeddings = await loadEmbeddingsFromIndexedDB3D();

        if (embeddings.length === 0) {
            console.error("No embeddings data available for 3D PCA.");
            return;
        }

        // Run 3D PCA on the embeddings
        const dataPcaTransformed = await pcaTransform3D(pyodide, embeddings, 3);

        // Plot the transformed PCA results in 3D
        plotPCA3D(dataPcaTransformed);

    } catch (error) {
        console.error("Error performing 3D PCA:", error);
    }
}

// Run the main function for the 3D plot when the page loads
window.addEventListener("load", main3D);
