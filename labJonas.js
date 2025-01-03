console.log(`labJonas.js loaded\n${Date()}`);

(async function(){
   const tcgaPath = await import('http://localhost:8000/tcgapath/loadTCGAreports.mjs')
   //const tcgaPath = await import('https://epiverse.github.io/tcgapath/loadTCGAreports.mjs')
   loadData = document.getElementById('loadData')
   messages = document.getElementById('messages')
   fullDownload = document.getElementById('fullDownload')
   reps={}
   loadData.onclick=async function(){
       loadData.disabled=true
       messages.innerHTML=' please wait, it typically takes a minute - use the browser console in the Dev tools to follow the progress of injesting from diferent data sources.'
       messages.style.color='blue'
       loadData.innerHTML='<span style="color:red;background-color:yellow">Loading ...</span>'
       reps = await tcgaPath.loadTCGAreports()
       console.log('reports',reps)
       messages.innerHTML=`loaded: ${reps.length} reports embedded with ${reps[0].embeddings.length} dimensions by <a href="https://ai.google.dev/gemini-api/docs/models/gemini" target="blank">Gemini 1.5 Flash</a>.`
       loadData.innerHTML='<span style="color:blue;background-color:white">... Data loaded</span>'
       // activate dowload buttons
       fullDownload.disabled=false
       fullDownload.style.color='green'
       metadataAsTsv.disabled=false
       metadataAsTsv.style.color='green'
       
   }
    fullDownload.onclick = async function(){
        if(Object.entries(reps).length==0){
            reps = await tcgaPath.loadTCGAreports()
        }
        tcgaPath.saveFullDataJSON(reps)
        fullDownload.onmouseover=function(ev){ev.target.style.backgroundColor='yellow'}
    }
    metadataAsTsv.onclick = async function(){
        // create header
        meta = `row\tcancer_type\tpatiend_id`
        // fill rows
        meta += reps.map(rep=>{
            return `\n${rep.i+1}\t${rep.cancer_type}\t${rep.patient_id}`
        }).join('')
        tcgaPath.saveFile(meta,'cancer_type_meta.tsv')
        return meta
    }


})()