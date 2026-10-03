let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },

];



function searchNotes(word) {
  const searchTerm = word.toLowerCase().trim();
  return notes.filter(note => note.text.toLowerCase().includes(searchTerm));
}
console.log(searchNotes("JAVASCRIPT")); //{   "id": 4,    "text": "Revise JavaScript arrays",   "category": "study"}
console.log(searchNotes("milk")); // input  output :{   "id": 1,    "text": "Buy milk and bread",   "category": "personal"}
console.log(searchNotes("not found")); // output: []


//Longest note 
function longestNote(){

    if(notes.length == 0){
        return null;
    }

 let longest = notes[0];

    for(let i = 1; i < notes.length; i++){
        if(notes[i].text.length > longest.text.length){
            longest = notes[i];
        }


    }

    return longest;





}

console.log("Longest note:", longestNote()); // input: notes[{ id: 1, text: "Buy milk and bread", category: "personal" },{ id: 2, text: "Finish the Day 3 assignment", category: "study" },text: "Email the project report to Grace", category: "work" },{ id: 4, text: "Revise JavaScript arrays", category: "study" },{ id: 5, text: "Call mum", category: "personal" }] output: Longest note:  {id: 3, text: 'Email the project report to Grace', category: 'work'}
console.log("Longest note:", longestNote()); //input: notes = [{ id: 5, text: "Call mum", category: "personal" }] output: Longest note: {id: 5, text: 'Call mum', category: 'personal'}

//Count By Category

function countByCategory(){

    const categoryCount = { personal: 0, work: 0, study: 0 };

  for (const note of notes) {
    categoryCount[note.category]++;
  }

  return categoryCount;

}

console.log("Count by category:", countByCategory()); //input: notes[{ id: 1, text: "Buy milk and bread", category: "personal" },{ id: 2, text: "Finish the Day 3 assignment", category: "study" },{ id: 3, text: "Email the project report to Grace", category: "work" },  { id: 4, text: "Revise JavaScript arrays", category: "study" },{ id: 5, text: "Call mum", category: "personal" }], Count by category: {personal: 2, work: 1, study: 2} output: Count by category: {personal: 2, work: 1, study: 2}
console.log("Count by category:", countByCategory()); //input: notes = [{ id: 5, text: "Call mum", category: "personal" }] output: Count by category: {personal: 1, work: 0, study: 0}


//GetSummary
function getSummary(){
  const counts = countByCategory();
  const label = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${label}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;

}

console.log("Summary:", getSummary()); //input: original notes[], Output: Summary: 5 notes: personal: 2, work: 1, study: 2 
 console.log("Summary:", getSummary());//input: notes = [{ id: 5, text: "Call mum", category: "personal" }], output: Summary: 1 note: personal: 1, work: 0, study: 0 



//is Duplicate

function isDuplicate(text){ 

normalizeText = text.toLowerCase().trim();

for(let i = 0; i < notes.length; i++){
    if(notes[i].text.toLowerCase().trim() == normalizeText){
        return true;
        continue;

    }



}

return false;

}   


console.log("Is Duplicate:", isDuplicate("Finish the Day 3 assignment")); //input: text = "Finish the Day 3 assignment" output: Is Duplicate: true
console.log("Is Duplicate:", isDuplicate("Go to boxing gym")); //input: text = "Go to boxing gym" output: Is Duplicate: false

//Add Note


function addNote(text, category){

    if(isDuplicate(text)){
        return false;
    }

    if (category != "personal" && category != "work" && category != "study"){
        return false;
    }

if(text.length >= 1 && text.length <= 200){
    const newNote = {
        id: notes.length + 1,
        text: text,
        category: category
};

    notes.push(newNote);
    return true;           

}else
{
    return false;

}


}

console.log("Add Note:", addNote("Go to church", "personal")); //input: text = "Go to church", category = "personal" output: Add Note: true
console.log("Add Note:", addNote("Buy milk and bread", "personal"));//input: text = "Buy milk and bread", category = "personal" output: Add Note: false
console.log("Add Note:", addNote("Call mum", "okkwi"));//input: text = "Call mum", category = "okkwi" output: Add Note: false