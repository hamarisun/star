const API_KEY = import.meta.env.VITE_NASA_API_KEY;
const date = document.querySelector("#datepicker").value;
fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&date=${date}`)


document.querySelector("#app").innerHTML = "<p>loading...</p>";

fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`)
.then(response => response.json()).then(data => {
    
    let media;

    if (data.media_type === "image") {
        media = `<img src="${data.url}"/>`;
    } else {
        media = `<video src="${data.url}" controls></video>`;
    }
    console.log(data);
    document.querySelector("#app").innerHTML = `
        <h1>nasa curently expiriences a problem with APS what couses only the explenation to be diplaied :| </h1>
        <h1>${data.title}</h1>
        ${media}
        <p>${data.explanation}</p>
    `;
})