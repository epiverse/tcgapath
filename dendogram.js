async function fetchEmbeddings() {
    try {
        const response = await fetch(EMBEDDINGS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch embeddings file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched embeddings file.");

        const data = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(data);
        console.log("Successfully loaded ZIP file.");

        const file = zip.file('embeddings.tsv');
        if (!file) {
            throw new Error("Embeddings file not found in the ZIP archive.");
        }

        const content = await file.async('string');
        return content.trim().split("\n").map(line => line.split("\t").map(Number));
    } catch (error) {
        console.error("Error fetching and unzipping embeddings file:", error);
        throw error;
    }
}

async function fetchCancerTypeMeta() {
    try {
        const response = await fetch(CANCER_TYPE_META_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch cancer type meta file. HTTP Status: ${response.status}`);
        }
        console.log("Successfully fetched cancer type meta file.");

        const content = await response.text();
        const lines = content.trim().split("\n");
        return lines.slice(1).map(line => line.split("\t")[1]);
    } catch (error) {
        console.error("Error fetching cancer type meta file:", error);
        throw error;
    }
}

function corr(x, y) {
    const n = x.length;
    if (y.length !== n) throw new Error("The two columns must have the same length.");
    const x_ = d3.mean(x);
    const y_ = d3.mean(y);
    const XY = d3.sum(x, (_, i) => (x[i] - x_) * (y[i] - y_));
    const XX = d3.sum(x, d => (d - x_) ** 2);
    const YY = d3.sum(y, d => (d - y_) ** 2);
    return XY / Math.sqrt(XX * YY);
}

function groupEmbeddingsByCancerType(embeddings, cancerTypes) {
    const grouped = {};
    embeddings.forEach((embedding, index) => {
        const type = cancerTypes[index];
        if (!grouped[type]) {
            grouped[type] = [];
        }
        grouped[type].push(embedding);
    });
    return grouped;
}

function renderCorrelationMatrix(meanCorrelations) {
    const container = d3.select("#correlationMatrix");

    // Clear previous content
    container.selectAll("*").remove();

    const table = container.append("table").attr("class", "correlation-table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");

    // Create table header
    const headerRow = thead.append("tr");
    headerRow.append("th").text("Cancer Types");
    const types = Object.keys(meanCorrelations);
    types.forEach(type => {
        headerRow.append("th").text(type);
    });

    // Create table body
    types.forEach((type, i) => {
        const row = tbody.append("tr");
        row.append("th").text(type);
        types.forEach((otherType, j) => {
            const correlation = meanCorrelations[type] && meanCorrelations[type][otherType];
            row.append("td")
                .attr("class", "correlation-cell")
                .text(correlation !== undefined ? correlation.toFixed(2) : "--");  // Display correlation value rounded to two decimal places or '--' if undefined
        });
    });
}

// Function to download data as a JSON file
function downloadJSON(data, filename) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

function getMeanCorrelationBetweenTypes(groupedEmbeddings) {
    const types = Object.keys(groupedEmbeddings);
    const meanCorrelations = {};

    for (let i = 0; i < types.length; i++) {
        for (let j = i; j < types.length; j++) {
            const type1 = types[i];
            const type2 = types[j];
            const embeddings1 = groupedEmbeddings[type1];
            const embeddings2 = groupedEmbeddings[type2];
            const n1 = embeddings1.length;
            const n2 = embeddings2.length;
            let totalCorrelation = 0;
            let count = 0;

            if (type1 === type2) {
                meanCorrelations[type1] = meanCorrelations[type1] || {};
                meanCorrelations[type1][type2] = 1;  // Set the main diagonal to 1
                continue;
            }

            for (let m = 0; m < n1; m++) {
                for (let n = 0; n < n2; n++) {
                    totalCorrelation += corr(embeddings1[m], embeddings2[n]);
                    count++;
                }
            }

            const meanCorrelation = count > 0 ? totalCorrelation / count : 0;
            meanCorrelations[type1] = meanCorrelations[type1] || {};
            meanCorrelations[type2] = meanCorrelations[type2] || {};
            meanCorrelations[type1][type2] = meanCorrelation;
            meanCorrelations[type2][type1] = meanCorrelation;  // Mirror the values below the main diagonal
        }
    }
    return meanCorrelations;
}

function colElbow(d) {
    const sourceX = d.source?.x ?? d.parent?.x;
    const targetX = d.target?.x ?? d.parent?.x;
    const sourceY = d.source?.y ?? d.parent?.y;
    const targetY = d.target?.y ?? d.parent?.y;

    if (typeof sourceX === 'undefined' || typeof targetX === 'undefined' || typeof sourceY === 'undefined' || typeof targetY === 'undefined') {
        console.error("Undefined property in colElbow:", d);
        return '';
    }

    return `M${sourceY},${sourceX}
            H${(sourceY + targetY) / 2}
            V${targetX}
            H${targetY}`;
}

// Function to load the correlation matrix from a JSON file
async function loadCorrelationMatrixFromFile(filename) {
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Failed to fetch the correlation matrix file. HTTP Status: ${response.status}`);
        }
        const jsonData = await response.json();
        console.log("Successfully loaded correlation matrix from file.");
        return jsonData;
    } catch (error) {
        console.error("Error loading correlation matrix file:", error);
        return null;
    }
}

// Function to load the correlation matrix from a JSON file
async function loadCorrelationMatrixFromFile(filename) {
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Failed to fetch the correlation matrix file. HTTP Status: ${response.status}`);
        }
        const jsonData = await response.json();
        console.log("Successfully loaded correlation matrix from file.");
        return jsonData;
    } catch (error) {
        console.error("Error loading correlation matrix file:", error);
        return null;
    }
}

async function createDendrogramAndCorrelationMatrix() {
    // Load Pyodide
    const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.3/full/'
    });

    await pyodide.loadPackage('numpy');
    await pyodide.loadPackage('scipy');

    const data = await loadCorrelationMatrixFromFile('correlationmatrix.json');
    let meanCorrelations;
    let types;

    if (data && data.types && data.correlationMatrix) {
        types = data.types;
        const correlationMatrix = data.correlationMatrix;

        meanCorrelations = types.reduce((acc, type, i) => {
            acc[type] = {};
            types.forEach((otherType, j) => {
                acc[type][otherType] = correlationMatrix[i][j];
            });
            return acc;
        }, {});

        console.log("Using correlation matrix from file:", meanCorrelations);
    } else {
        console.log("Correlation matrix file not found. Calculating matrix.");
        const [embeddings, cancerTypes] = await Promise.all([
            fetchEmbeddings(),
            fetchCancerTypeMeta()
        ]);

        const groupedEmbeddings = groupEmbeddingsByCancerType(embeddings, cancerTypes);
        meanCorrelations = getMeanCorrelationBetweenTypes(groupedEmbeddings);
        types = Object.keys(meanCorrelations);

        console.log("Mean Correlations:", meanCorrelations);

        renderCorrelationMatrix(meanCorrelations);

        // Download mean correlations as JSON file
        downloadJSON({ types, correlationMatrix: types.map(type => types.map(otherType => meanCorrelations[type][otherType])) }, "mean_correlations.json");
    }

    renderCorrelationMatrix(meanCorrelations);

    // Convert the mean correlations to distances
    const distanceMatrix = types.map(type =>
        types.map(otherType => 1 - meanCorrelations[type][otherType])
    );

    const jsonData = JSON.stringify(distanceMatrix);
    pyodide.globals.set("distance_matrix_json", jsonData);

    await pyodide.runPythonAsync(`
        import json
        import numpy as np
        from scipy.spatial.distance import squareform
        from scipy.cluster.hierarchy import linkage, to_tree

        # Load the distance matrix
        distance_matrix = np.array(json.loads(distance_matrix_json))
        print("Distance Matrix:\\n", distance_matrix)

        # Convert to condensed distance matrix
        condensed_distance_matrix = squareform(distance_matrix)
        print("Condensed Distance Matrix:\\n", condensed_distance_matrix)

        # Perform hierarchical clustering
        Z = linkage(condensed_distance_matrix, 'complete')
        print("Linkage Matrix:\\n", Z)

        # Convert to tree structure
        root, _ = to_tree(Z, rd=True)

        # Function to convert tree to D3 hierarchy
        def to_d3_hierarchy(node):
            if not node.is_leaf():
                return {
                    'name': "",
                    'children': [to_d3_hierarchy(node.get_left()), to_d3_hierarchy(node.get_right())]
                }
            return {'name': str(node.id)}

        # Convert root node to D3 hierarchy
        hierarchy_data = to_d3_hierarchy(root)
        print("Hierarchy Data:\\n", hierarchy_data)
    `);

    const hierarchyData = pyodide.globals.get("hierarchy_data").toJs();
    console.log("Hierarchy Data:", hierarchyData);

    const width = 2000;
    const height = 2000;

    const svg = d3.select("#dendrogramContainer")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            svg.attr("transform", event.transform);
        }))
        .append("g")
        .attr("transform", "translate(50,50)");

    const root = d3.hierarchy(hierarchyData, d => d.children);

    const tree = d3.cluster()
        .size([height - 200, width - 200]);

    tree(root);

    // Link elements
    svg.selectAll(".link")
        .data(root.descendants().slice(1))
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => `
            M${d.parent.y},${d.parent.x}
            V${d.x}
            H${d.y}
        `)
        .style("stroke", "black"); // Ensure link color

    // Node elements
    svg.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .each(function(d) {
            d3.select(this).append("circle").attr("r", 4);
            d3.select(this).append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d.children ? -10 : 10)
                .style("text-anchor", d => d.children ? "end" : "start")
                .style("font-size", "10px")
                .text(d => types[+d.data.name]);
        });

    return svg.node();
}

createDendrogramAndCorrelationMatrix().catch(error => {
    console.error("Error creating dendrogram:", error);
});
