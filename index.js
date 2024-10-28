console.log(`index.js loaded\n${Date()}`);

(async function() {
    const saveFile = (await import('https://jonasalmeida.github.io/jmat/jmat.mjs')).saveFile;
    let conversation = [];
    console.log(`async runtime\n${Date()}`);
    const shdown = new ((await import('https://esm.sh/showdown@2.1.0')).default).Converter;

    // Import GEM and instantiate it
    const { GEM } = await import(`./gem.mjs`); // import {GEM,validKey} from './gem.mjs' ???
    g1 = new GEM(); // Initialize g1 here

    // Now that g1 is initialized, call the functions
    await initializeEmbeddings(); // Call the function to initialize embeddings
})();

// Function to initialize embeddings after g1 is set up
async function initializeEmbeddings() {
    const specificText = 'TCGA-BP-5195.25c0b433-5557-4165-922e-2c1eac9c26f0, Date of Receipt: Clinical Diagnosis & History: Incidental 3 cm left upper pole renal mass. Specimens Submitted: 1: Kidney, Left Upper Pole';

    // Display a loading message while fetching the single embedding
    document.getElementById('singleEmbedding').textContent = 'Fetching embedding for specific text...';

    // Get the embedding for the specific text
    const singleEmbedding = await getEmbedding(specificText);
    displaySingleEmbedding(singleEmbedding);

    // After displaying the single embedding, fetch batch embeddings
    const texts = [
        "What is the meaning of life?",
        "How much wood would a woodchuck chuck?",
        "How does the brain work?"
    ];

    // Display a loading message while fetching batch embeddings
    document.getElementById('batchEmbeddings').textContent = 'Fetching batch embeddings...';

    // Get batch embeddings for the texts
    const batchEmbeddings = await getBatchEmbeddings(texts);
    displayBatchEmbeddings(batchEmbeddings);
}

// Function to get embedding using Gemini API
async function getEmbedding(text) {
    try {
        // Use the existing instance of g1
        const embedding = await g1.embed(text);
        return embedding;
    } catch (error) {
        console.error('Error retrieving embedding:', error);
        return null;  // Return null in case of an error
    }
}

// Function to display the single embedding result on the webpage
function displaySingleEmbedding(embedding) {
    if (embedding) {
        document.getElementById('singleEmbedding').textContent = JSON.stringify(embedding, null, 2);
    } else {
        document.getElementById('singleEmbedding').textContent = 'Error generating embedding.';
    }
}

//Function
async function getBatchEmbeddings(texts) {
    try {
        // Format the requests for the API
        const requests = texts.map(text => ({
            model: "models/text-embedding-004",
            content: {
                parts: [{
                    text: text
                }]
            }
        }));

        // Make the API call with the correct payload structure
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${localStorage.gemKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests: requests }) // Wrap requests in an object
        });

        // Parse the JSON response
        const embeddingsData = await response.json();

        // Log the entire response for debugging
        console.log("Full API Response:", embeddingsData);

        // Check if the response contains an error
        if (embeddingsData.error) {
            throw new Error(`API error: ${embeddingsData.error.message}`);
        }

        // Check if the 'embeddings' array exists
        if (!embeddingsData.embeddings || embeddingsData.embeddings.length === 0) {
            console.error("API Response Missing 'embeddings' Key:", embeddingsData); // Log the full response
            throw new Error("No embeddings in the API response.");
        }

        // Extract the embedding values from the 'embeddings' array
        const values = embeddingsData.embeddings.map((embedding, index) => embedding.values);

        console.log("Batch embeddings retrieved successfully:", values);
        return values;  // Return the extracted values array
    } catch (error) {
        console.error('Error retrieving batch embeddings:', error);
        return null; // Return null in case of an error
    }
}


// Function to display the batch embedding results on the webpage
function displayBatchEmbeddings(embeddings) {
    if (embeddings && Array.isArray(embeddings)) {
        // Create a formatted string to display each embedding
        const formattedEmbeddings = embeddings.map((embedding, index) =>
            `Embedding for text ${index + 1}: ${JSON.stringify(embedding, null, 2)}`
        ).join('\n\n'); // Join the embeddings with double newlines for better readability

        document.getElementById('batchEmbeddings').textContent = formattedEmbeddings;
    } else {
        document.getElementById('batchEmbeddings').textContent = 'Error generating batch embeddings. Check console for details.';
    }
}
