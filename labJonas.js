console.log(`labJonas.js loaded\n${Date()}`);

(async function(){
   //const tcgaPath = await import('http://localhost:8000/tcgapath/loadTCGAreports.mjs')
   const tcgaPath = await import('https://epiverse.github.io/tcgapath/loadTCGAreports.mjs')
   loadData = document.getElementById('loadData')
   messages = document.getElementById('messages')
   fullDownload = document.getElementById('fullDownload')
   reps={}
   loadData.onclick=async function(){
       loadData.disabled=true
       messages.innerHTML=' please wait, it typically takes a minute'
       messages.style.color='blue'
       loadData.innerHTML='<span style="color:red;background-color:yellow">Loading ...</span>'
       reps = await tcgaPath.loadTCGAreports()
       console.log('reports',reps)
       messages.innerHTML=`loaded: ${reps.length} reports embedded with ${reps[0].embeddings.length} dimensions`
       loadData.innerHTML='<span style="color:blue;background-color:white">... Data loaded</span>'
       // activate dowload buttons
       fullDownload.disabled=false
       fullDownload.style.color='green'
   }
    fullDownload.onclick = async function(){
        if(Object.entries(reps).length==0){
            reps = await tcgaPath.loadTCGAreports()
        }
        tcgaPath.saveFullDataJSON(reps)
        fullDownload.onmouseover=function(ev){ev.target.style.backgroundColor='yellow'}
    }


})()