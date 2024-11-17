console.log(`import loadTCGAreports.mjs\n${Date()}`);

const JSZip = (await import('https://esm.sh/jszip@3.10.1'))

// const url = 'https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip' // default file url

async function loadTCGAreports(url='https://epiverse.github.io/tcgapath/TCGA_Reports.csv.zip'){
    const response = await fetch(url)
    const data = response.arrayBuffer()
    const zip = await JSZip.loadAsync(data);
    let res = {}
    for (let filename in zip.files) {
            const file = zip.file(filename);
            if (file) {
                const content = await file.async('string');
                // Do something with the content (e.g., display, process)
                res[filename]=content
                //console.log(filename, 'length:', content.length); 
            }
        }
    res = (res['TCGA_Reports.csv']).split('\n').slice(1,-1) // remove first line with the headers "patient_filename,text"
                                                            // and and trailing blank. Recall fence posting pitfall
    res=res.map(function(row,i){
        const id = row.match(/(^[^\,]+)/)[0]
        const txt = row.slice(id.length+1)
        return {
            id:id,
            text:txt.slice(1,-1) // removing non standard start and end whitespace
        }
    })
    return res
}

export{
    loadTCGAreports
}

// reps = (await ((await import('http://localhost:8000/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())
// reps = (await ((await import('https://epiverse.github.io/tcgapath/loadTCGAreports.mjs')).loadTCGAreports)())