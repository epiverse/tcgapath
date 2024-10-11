// async function getEmbedding(text) {
//     try {
//         const response = await fetch('https://episphere.github.io/gemini/', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ text: text })
//         });

//         if (!response.ok) {
//             throw new Error('Error retrieving embedding');
//         }

//         const data = await response.json();
//         return data.embedding;  // Returns the embedded vector
//     } catch (error) {
//         console.error('Fetch error:', error);
//     }
// }

// const sampleText = "TCGA-BP-5195.25c0b433-5557-4165-922e-2c1eac9c26f0, Date of Receipt: Clinical Diagnosis & History: Incidental 3 cm left upper pole renal mass. Specimens Submitted: 1: Kidney, Left Upper Pole";

// // Ensure the elements exist in the DOM before updating
// document.addEventListener("DOMContentLoaded", function() {
//     const originalTextElement = document.getElementById('originalText');
//     const embeddingElement = document.getElementById('embedding');

//     if (originalTextElement && embeddingElement) {
//         // Update original text
//         originalTextElement.textContent = sampleText;

//         // Get and update the embedding
//         getEmbedding(sampleText)
//             .then(embedding => {
//                 if (embedding) {
//                     embeddingElement.textContent = JSON.stringify(embedding, null, 2);  // Pretty-print
//                 } else {
//                     embeddingElement.textContent = "Error: Embedding not retrieved";
//                 }
//             })
//             .catch(error => {
//                 console.error('Embedding error:', error);
//                 embeddingElement.textContent = "Error fetching embedding";
//             });
//     } else {
//         console.error('HTML elements not found');
//     }
// });
