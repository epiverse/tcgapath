console.log(`labJonas.js loaded\n${Date()}`);

(async function(){
   loadData = document.getElementById('loadData')
   messages = document.getElementById('messages')
   reps={}
   const tcgaPath = await import('https://epiverse.github.io/tcgapath/loadTCGAreports.mjs')
   loadData.onclick=async function(){
       loadData.disabled=true
       messages.innerHTML=' please wait, it typically takes a minute'
       messages.style.color='blue'
       loadData.innerHTML='<span style="color:red;background-color:yellow">Loading ...</span>'
       reps = await tcgaPath.loadTCGAreports()
       console.log('reports',reps)
       messages.innerHTML=`loaded: ${reps.length} reports embedded with ${reps[0].embeddings.length} dimensions`
       loadData.innerHTML='<span style="color:blue;background-color:white">... Data loaded</span>'
   }

})()