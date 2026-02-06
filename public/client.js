// --- DOM Elements ---

// Views
const viewHome = document.getElementById('view-home');
const viewPost = document.getElementById('view-post');

// Buttons 
const btnHome = document.getElementById('btn-home');
const btnBack = document.getElementById('back-btn');
const btnReadMore = document.querySelector('.read-more-btn');


// --- Navigation Functions ---

function goHome() {
    viewHome.style.display = 'block';
    viewPost.style.display = 'none';
}

function goToPost() {
    viewHome.style.display = 'none';
    viewPost.style.display = 'block';
}

// --- Event Listeners ---

btnHome.addEventListener('click', () => {
    goHome();
});

btnBack.addEventListener('click', () => {
    goHome();
});
if (btnReadMore) {
    btnReadMore.addEventListener('click', () => {
        goToPost();
    });
}

// --- Form Handling ---

const commentForm = document.getElementById('comment-form');
const feedbackMessage = document.getElementById('feedback-message');

if (commentForm) {
    commentForm.addEventListener('submit', (event) => {
        // 1. PREVENT DEFAULT: Stop the browser from reloading the page
        event.preventDefault();

        // 2. Get values from the input fields
        const author = document.getElementById('comment-author').value;
        const text = document.getElementById('comment-text').value;

        console.log("Form submitted by:", author);
        console.log("Comment text:", text);

        // 3. Clear previous feedback
        feedbackMessage.textContent = "Arbejder...";
        feedbackMessage.style.color = "blue";

       // 4. URL validation (placeholder for now)
        setTimeout(() => {
             feedbackMessage.textContent = "Tak for din kommentar! (URL validering kommer snart)";
             feedbackMessage.style.color = "green";
             // Clear the form
             commentForm.reset();
        }, 1000);
    });
}