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

    const averageEmbeddings = {};
    for (const type in grouped) {
        const typeEmbeddings = grouped[type];
        const averageEmbedding = typeEmbeddings[0].map((_, i) => d3.mean(typeEmbeddings, embedding => embedding[i]));
        averageEmbeddings[type] = averageEmbedding;
    }

    return averageEmbeddings;
}

function getPearsonCorrelationMatrixBetweenTypes(averageEmbeddings) {
    const types = Object.keys(averageEmbeddings);
    const n = types.length;
    const correlationMatrix = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            console.log(averageEmbeddings[types[i]]);
            correlationMatrix[i][j] = corr(averageEmbeddings[types[i]], averageEmbeddings[types[j]]);
        }
    }
    return { types, correlationMatrix };
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

function renderCorrelationMatrix(types, correlationMatrix) {
    const container = d3.select("#correlationMatrix");

    // Clear previous content
    container.selectAll("*").remove();

    const table = container.append("table").attr("class", "correlation-table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");

    // Create table header
    const headerRow = thead.append("tr");
    headerRow.append("th").text("Cancer Types");
    types.forEach(type => {
        headerRow.append("th").text(type);
    });

    // Create table body
    types.forEach((type, i) => {
        const row = tbody.append("tr");
        row.append("th").text(type);
        correlationMatrix[i].forEach(value => {
            row.append("td")
                .attr("class", "correlation-cell")
                .text(value.toFixed(2));  // Display correlation value rounded to two decimal places
        });
    });
}

async function createDendrogramAndCorrelationMatrix() {
    const [embeddings, cancerTypes] = await Promise.all([
        fetchEmbeddings(),
        fetchCancerTypeMeta()
    ]);

    const averageEmbeddings = groupEmbeddingsByCancerType(embeddings, cancerTypes);
    const { types, correlationMatrix } = getPearsonCorrelationMatrixBetweenTypes(averageEmbeddings);

    console.log("Correlation Matrix:", correlationMatrix);

    renderCorrelationMatrix(types, correlationMatrix);

    // Create hierarchical data structure
    const hierarchicalData = {
        name: "root",
        children: types.map((type, i) => ({
            name: type,
            children: correlationMatrix[i].map((value, j) => ({
                name: types[j],
                value
            })).filter((child, index) => index !== i)
        }))
    };

    console.log("Hierarchical Data:", hierarchicalData);

    const width = 1000;
    const height = 700;

    const svg = d3.select("#dendrogramContainer")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const root = d3.hierarchy(hierarchicalData, d => d.children);

    const tree = d3.cluster()
        .size([height - 160, width - 160]);

    tree(root);

    const link = svg.append("g")
        .selectAll(".link")
        .data(root.descendants().slice(1))
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => colElbow(d));

    const node = svg.append("g")
        .selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("r", 4.5);

    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -10 : 10)
        .style("text-anchor", d => d.children ? "end" : "start")
        .style("font-size", "12px")
        .text(d => d.data.name)
        .clone(true).lower()
        .attr("stroke", "white");

    return svg.node();
}

createDendrogramAndCorrelationMatrix().catch(error => {
    console.error("Error creating dendrogram:", error);
});
