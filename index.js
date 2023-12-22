function dosyaYukle() {
    var dosyaInput = document.getElementById('dosya');
    var dosya = dosyaInput.files[0];
    if (dosya) {
        // Value to be passed to the second page
        const valueToSend = 'Hello from the first page!';

        // Store the value in localStorage
        localStorage.setItem('dataToSend', valueToSend);
        
        window.location.href = 'edit.html';
    } else {
        alert('Please select a PDF file.');
    }
}

// function googleLogin() {
//     // Replace YOUR_CLIENT_ID with your Google API client ID
//     const CLIENT_ID = '227211577164-i0a5pa4n9vnviknl4pf14ccpvk8tp9u9.apps.googleusercontent.com';
//     const REDIRECT_URI = 'http://localhost:8080'; // Update with your redirect URI

//     const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token`;

//     // Open Google OAuth login page in a new window
//     window.open(authUrl, '_self');
// }


function uploadFile() {
    localStorage.removeItem('lastPdf');
    const fileInput = document.getElementById('dosya');
    const file = fileInput.files[0];
    const fileName = file.name.replace(/\.[^/.]+$/, "");

    if (file) {
        const formData = new FormData();
        formData.append('fileName', fileName);
        formData.append('file', file);

        fetch('http://localhost:8080/uploadPdf', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`File upload failed with status: ${response.status}`);
            }
            return response.text(); // Parse response as text
        })
        .then(data => {
            console.log('File uploaded successfully:', data);

            // Handle the response text
            const valueToSend = fileName;
            localStorage.setItem('dataToSend', valueToSend);
            localStorage.setItem('lastPdf', fileName);

            // Redirect to edit.html after successful upload
            window.location.href = 'edit.html';
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });
    } else {
        console.error('No file selected.');
    }
}

function uploadFileUser(uid) {
    localStorage.removeItem('lastPdf');
    const fileInput = document.getElementById('dosya');
    const file = fileInput.files[0];
    const fileName = file.name.replace(/\.[^/.]+$/, "");

    if (file) {
        const formData = new FormData();
        formData.append('fileName', fileName);
        formData.append('file', file);

        fetch(`http://localhost:8080/uploadPdfUser/${uid}`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`File upload failed with status: ${response.status}`);
            }
            return response.text(); // Parse response as text
        })
        .then(data => {
            console.log('File uploaded successfully:', data);

            // Handle the response text
            const valueToSend = fileName;
            localStorage.setItem('dataToSend', valueToSend);
            localStorage.setItem('lastPdf', fileName);

            // Redirect to edit.html after successful upload
            window.location.href = 'edit.html';
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });
    } else {
        console.error('No file selected.');
    }
}
