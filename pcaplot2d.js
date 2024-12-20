// Function to initialize Pyodide
async function initializePyodide() {
    if (typeof loadPyodide === "undefined") {
      throw new Error("Pyodide is not loaded. Check if the script is correctly included.");
    }

    const pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/",
    });
    await pyodide.loadPackage("scikit-learn");
    return pyodide;
  }

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

  // Function to perform PCA using Pyodide
  async function pcaTransform(pyodide, data, nComponents = 2) {
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

    return transformedData.toJs();
  }

  // Function to plot the PCA-transformed data using Plotly
  function plotPCA(data) {
    const xValues = data.map((point) => point[0]);
    const yValues = data.map((point) => point[1]);

    const trace = {
      x: xValues,
      y: yValues,
      mode: "markers",
      type: "scatter",
      marker: { size: 6, color: "blue" },
    };

    const layout = {
      title: "PCA Plot",
      xaxis: { title: "PC1" },
      yaxis: { title: "PC2" },
    };

    Plotly.newPlot("pcaPlot", [trace], layout);
  }

  // Main function to execute PCA on embeddings and display results
  async function main() {
    try {
      const pyodide = await initializePyodide();
      const embeddings = await loadEmbeddingsFromIndexedDB();

      // Run PCA on the embeddings
      const dataPcaTransformed = await pcaTransform(pyodide, embeddings, 2);

      // Plot the transformed PCA results
      plotPCA(dataPcaTransformed);

    } catch (error) {
      console.error("Error performing PCA:", error);
    }
  }

  // Run the main function when the page loads
  window.addEventListener("load", main);
