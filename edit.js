// MAKE RENDERSIDE FUNC THINK FOR THE ORDER IN PAGES

//############################### INITILIZE ######################################### 
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf-js/build/pdf.worker.js';

const sidebar = document.getElementById('pdf-sidebar');
const pageThumbnails = document.getElementById('page-thumbnails');
const canvas = document.getElementById('#canvas');
const pageNum = document.getElementById('page_num');
const pageCount = document.getElementById('page_count');
const currentPage = document.getElementById('current_page');
const previousPage = document.getElementById('prev_page');
const nextPage = document.getElementById('next_page');
const zoomIn = document.getElementById('zoom_in');
const zoomOut = document.getElementById('zoom_out');
const saveBtn = document.getElementById('save_button');
const mergeBtn = document.getElementById('merge_button');
const extractBtn = document.getElementById('extract_button');
const undoBtn = document.getElementById('undo_button');
const redoBtn = document.getElementById('redu_button');

let pdfFile;
let pdfList = []; // Array to store PDF buffers


var numPages = 0;
// merged - true - save - merge db - pages list - download;



let processList = [];
let deletedPagesList = [];


const targetDpi = 450; // Set your target DPI (dots per inch)
const targetScale = targetDpi / 72.0; // PDF.js uses 72 DPI as the default

var receivedValue = localStorage.getItem('dataToSend');
// let fileName = receivedValue;

// ############################# RUN TIME SIZES #####################################

// Import the debounce function from lodash
// Function to update sidebar height
function updateSidebarHeight() {
	const windowOuterHeight = window.outerHeight;
	const sidesize = document.getElementsByClassName("sidebar")[0];

	if (sidesize) {
		sidesize.style.height = (windowOuterHeight - 190) + "px";
	} else {
		console.error('Element with class "sidebar" not found');
	}
}

// Call the function initially
updateSidebarHeight();

const debouncedResizeHandler = _.debounce(updateSidebarHeight, 200);

//  ################################################################################

const initialState = {
	pdfDoc: null,
	currentPage: 1,
	pageCount: 0,
	zoom: 1,
};

let pdfDocument;
let pages = []

// #####################################################################################

//############################### LOAD PDF FROM DB #####################################

async function loadPdf(fileName) {
	try {
        const loadingScreen = document.getElementById("loading-screen");
        loadingScreen.style.display = "flex";

        const response = await fetch(`http://localhost:8080/downloadPdf/${fileName}`);

        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            console.log('Type of pdfFile:', Object.prototype.toString.call(arrayBuffer));
            console.log('Size of pdfFile:', arrayBuffer.byteLength);
            return arrayBuffer;
        } else {
            console.error('Error getting PDF from database:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error getting PDF from database:', error);
        return null;
    }
}

window.onload = async function () {
	// var storedArrayBufferAsText = localStorage.getItem('lastPdf');
	var fileName = localStorage.getItem('lastPdf');

    // if (storedArrayBufferAsText) {
    //     // Metin formatındaki değeri ArrayBuffer'a çevir
	// 	receivedValue = fileName;

    //     var storedArrayBuffer = new Uint8Array(JSON.parse(storedArrayBufferAsText)).buffer;
	// 	console.log('Size of pdfFile:', storedArrayBuffer.byteLength);
	// 	console.log('Content of pdfFile:', storedArrayBuffer);
	// 	pdfList.push({name: fileName, content: storedArrayBuffer});
	// 	console.log(pdfList);
	// 	console.log(pdfList[0]);


    //     // Şimdi storedArrayBuffer, kullanılabilir bir ArrayBuffer
    //     initializePdf(storedArrayBuffer);
	// 	return 0;
    // }
	try {
        // const fileName = "sample"; // Replace with the actual file name
		receivedValue = fileName;
        console.log(receivedValue);
        
        const arrayBuffer = await loadPdf(receivedValue);
		pdfList.push({name: receivedValue, content: await loadPdf(receivedValue)});
        
        if (arrayBuffer) {
			var view = new DataView(arrayBuffer);
			view.setUint8(0, 42);

			// ArrayBuffer'ı metin formatına dönüştür
			var arrayBufferAsText = JSON.stringify(Array.from(new Uint8Array(arrayBuffer)));

			// localStorage'a kaydet
			localStorage.setItem('lastPdfName', receivedValue);
			localStorage.setItem('lastPdf', arrayBufferAsText);
            initializePdf(arrayBuffer);
			const loadingScreen = document.getElementById("loading-screen");
			loadingScreen.style.display = "none";
        } else {
            console.error('Error loading PDF. Using default PDF.');
            initializePdf(null);
        }
    } finally {
		console.log();
    }
};

async function initializePdf(pdfBuffer) {
    try {
        pdfDocument = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
        initialState.pdfDoc = pdfDocument;
        pageCount.textContent = initialState.pdfDoc.numPages;

        pages = [];
        for (let pageNumber = 1; pageNumber <= initialState.pdfDoc.numPages; pageNumber++) {
            pages.push(pageNumber);
        }

        renderPage();
        renderSide(pdfDocument);

        return Promise.resolve(pdfDocument); // Resolve the promise with the pdfDocument
    } catch (err) {
        console.error('Error initializing PDF:', err);
        alert(err.message);
        return Promise.reject(err); // Reject the promise if an error occurs
    }
}

// #####################################################################################


//############################### RENDER PAGE MAIN #####################################

// Render the page.
const renderPage = () => {
	// Load the first page.
	initialState.pdfDoc.getPage(initialState.currentPage).then((page) => {
		const canvas = document.querySelector('#canvas');
		const ctx = canvas.getContext('2d');
		const viewport = page.getViewport({
			scale: targetScale / 2,
			// rotation: 90,
			dpi: targetDpi,
		});

		canvas.height = viewport.height;
		canvas.width = viewport.width;

		// Render the PDF page into the canvas context.
		const renderCtx = {
			canvasContext: ctx,
			viewport: viewport,
		};

		page.render(renderCtx);

		pageNum.textContent = initialState.currentPage;
	});
};

// #####################################################################################


//############################### RENDER SIDE BAR #####################################

function renderSide(pdfDocument) {
	// Use the passed pdfDocument instead of the global variable
	const numPages = pdfDocument.numPages;
	console.log("aaaaa"+numPages);
	const fragment = document.createDocumentFragment();
	console.log('Number of pages:', numPages);
	console.log('Number of pages:', pages);



	for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
		if (!pages.includes(pageNumber)) {
			continue;
		}

		const listItem = createPageThumbnail(pageNumber);
		fragment.appendChild(listItem);
	}

	pageThumbnails.innerHTML = ''; // Clear existing thumbnails
	pageThumbnails.appendChild(fragment);

	// Add event listeners for drag-and-drop
	enableDragAndDrop();
}

function enableDragAndDrop() {
	const thumbnailsList = document.getElementById('page-thumbnails');

	new Sortable(thumbnailsList, {
		animation: 150,
		onEnd: updateThumbnailOrder,
	});
}

function updateThumbnailOrder() {
	const previousPages = [...pages];

	const thumbnails = document.querySelectorAll('#page-thumbnails li');
	const updatedPages = Array.from(thumbnails).map(thumbnail => {
		const pageNumber = parseInt(thumbnail.id.split('-').pop());
		return pageNumber;
	});

	// Update the 'pages' array or any data structure you use to track the order
	pages = updatedPages;
	console.log(pages)
	addProcess('Change Page Order', { previousOrder: previousPages });


	// Render the PDF with the new order
	// renderPdf();
}


function createPageThumbnail(pageNumber) {
	const listItem = document.createElement('li');
	listItem.id = `thumbnail-item-${pageNumber}`;
	console.log("asdadasdas"+pdfDocument.numPages)


	pdfDocument.getPage(pageNumber).then((page) => {
		const viewport = page.getViewport({
			scale: targetScale / 2,
			// rotation: 90,
			dpi: targetDpi, // Set the desired resolution
		});
		const canvas = document.createElement('canvas');

		canvas.width = viewport.width;
		canvas.height = viewport.height;

		// Render the page to the canvas
		const renderContext = {
			canvasContext: canvas.getContext('2d'),
			viewport: viewport,
		};

		page.render(renderContext).promise.then(() => {
			// Create a thumbnail image for each page
			const thumbnailImage = document.createElement('img');
			thumbnailImage.src = canvas.toDataURL();
			thumbnailImage.width = viewport.width / 8;
			thumbnailImage.height = viewport.height / 8;

			// Create delete and download buttons
			// Create delete and download buttons
			const deleteButton = createButton("delete", "", () => deletePage(pageNumber));
			const downloadButton = createButton("download", "", () => showDownloadOptions(pageNumber));

			// Create a link to navigate to the page
			const link = document.createElement('a');
			link.href = `javascript:goToPage(${pageNumber})`;
			link.appendChild(thumbnailImage);

			// Create a list item for each page thumbnail
			listItem.appendChild(link);
			listItem.appendChild(deleteButton);
			listItem.appendChild(downloadButton);
		});
	}).catch((error) => {
		console.error('Error getting page:', error);
	});

	return listItem;
}

function createButton(id, text, onClick) {
	const button = document.createElement('button');
	button.id = id;
	button.textContent = text;
	button.addEventListener("click", onClick);
	return button;
}


// #####################################################################################


//############################### DELETE PAGES #####################################

function deletePage(pageNumber) {
    // Remove the page number from the 'pages' array
    let indexToDelete = pages.indexOf(pageNumber);

    // Check if the element exists in the array
    if (indexToDelete !== -1) {
        // Use splice to remove the element
        pages.splice(indexToDelete, 1);
        console.log(`Element ${pageNumber} deleted. New array:`, pages);

        // Remove the corresponding list item from the 'pageThumbnails' container
        const thumbnailItem = document.getElementById(`thumbnail-item-${pageNumber}`);
        if (thumbnailItem) {
            thumbnailItem.remove();
        }

        if (currentPage.value == 1 && pageNumber == 1) {
            if (pdfDocument) {
                numPages = pdfDocument.numPages;
                console.log(`Number of pages: ${numPages}`);
            } else {
                console.error('PDF document not loaded.');
            }
            currentPage.value = initialState.currentPage;
        } else if (currentPage.value == numPages && pageNumber == numPages) {
            initialState.currentPage--;
            currentPage.value = initialState.currentPage;
        }

        addProcess('Delete Page', { pageNumber: pageNumber });
        deletedPagesList.push({ pageNumber: pageNumber, index: indexToDelete });
        renderPage();

        return true; // Return true indicating successful deletion
    } else {
        console.log(`Element ${pageNumber} not found in the array.`);
        alert(`Page ${pageNumber} does not exist.`);
        return false; // Return false indicating that the page does not exist
    }
}


// #####################################################################################

//############################### DOWNLOAD PAGE #####################################

function showDownloadOptions(pageNumber) {
	const modal = document.createElement('div');
	modal.style.position = 'fixed';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.width = '100%';
	modal.style.height = '100%';
	modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
	modal.style.display = 'flex';
	modal.style.alignItems = 'center';
	modal.style.justifyContent = 'center';

	const pdfButton = createButton("pdf", "Download as PDF", () => downloadPage(pageNumber, 'pdf'));
	const pngButton = createButton("png", "Download as PNG", () => downloadPage(pageNumber, 'png'));

	// Add styles to the buttons
	pdfButton.style = 'border: 1px solid #B99470; background-color: #5F6F52; color: #FEFAE0; padding: 10px; margin: 5px; cursor: pointer; border-radius: 5px;';
	pngButton.style = 'border: 1px solid #B99470; background-color: #5F6F52; color: #FEFAE0; padding: 10px; margin: 5px; cursor: pointer; border-radius: 5px;';

	modal.appendChild(pdfButton);
	modal.appendChild(pngButton);

	modal.addEventListener('click', (event) => {
		if (!event.target.closest('button')) {
			document.body.removeChild(modal);
		}
	});

	document.body.appendChild(modal);

	pdfButton.addEventListener('click', () => {
		document.body.removeChild(modal);
	});

	pngButton.addEventListener('click', () => {
		document.body.removeChild(modal);
	});
}

function createButton(id, text, clickHandler) {
	const button = document.createElement('button');
	button.id = id;
	button.textContent = text;
	button.addEventListener('click', clickHandler);
	return button;
}

function downloadPage(pageNumber, format) {
	// Your download logic goes here
	console.log(`Downloading page ${pageNumber} as ${format}`);
}

function downloadPage(pageNumber, type) {
	if (pdfDocument) {
		console.log(`Downloading page as ${type}:`, pageNumber);

		if (pageNumber >= 1 && pageNumber <= pdfDocument.numPages) {
			// Add your logic for PDF and PNG download here
			if (type === 'pdf') {
				// Download as PDF
				console.log("PDF download logic");

				const apiUrl = `http://localhost:8080/downloadPdfPage/${receivedValue}/${pageNumber}`;

				fetch(apiUrl)
					.then(response => {
						if (!response.ok) {
							throw new Error(`HTTP error! Status: ${response.status}`);
						}
						return response.blob();
					})
					.then(blob => {
						// Create a link element
						const link = document.createElement('a');
						link.href = URL.createObjectURL(blob);
						link.download = `${receivedValue}_page_${pageNumber}.pdf`;

						// Append the link to the document and trigger a click event
						document.body.appendChild(link);
						link.click();

						// Remove the link from the document
						document.body.removeChild(link);
					})
					.catch(error => console.error('Fetch error:', error));

			} else if (type === 'png') {
				// Download as PNG

				if (pageNumber >= 1 && pageNumber <= pdfDocument.numPages) {
					pdfDocument.getPage(pageNumber).then(function (page) {
						// Create a canvas element to render the page
						const canvas = document.createElement('canvas');
						const context = canvas.getContext('2d');
						const viewport = page.getViewport({
							scale: 5
						});

						canvas.height = viewport.height;
						canvas.width = viewport.width;

						// Render the page to the canvas
						page.render({
							canvasContext: context,
							viewport: viewport
						}).promise.then(function () {
							// Convert the canvas content to a data URL
							const dataURL = canvas.toDataURL('image/png');

							// Create a link element to trigger the download
							const downloadLink = document.createElement('a');
							downloadLink.href = dataURL;
							downloadLink.download = `page_${pageNumber}.png`;
							downloadLink.click();

							// Remove the canvas and link elements
							canvas.remove();
							downloadLink.remove();
						});
					}).catch(function (error) {
						console.error('Error rendering page:', error);
					});
				} else {
					console.error('Invalid page number:', pageNumber);
				}
			} else {
				console.error('No PDF document loaded.');

				console.log("PNG download logic");
			}
		} else {
			console.error('Invalid page number:', pageNumber);
		}
	} else {
		console.error('No PDF document loaded.');
	}
}

// #####################################################################################


//############################### BUTTON FUNCTIONS #####################################

/// Function to navigate to a specific page and display it in the pdf-canvas
function goToPage(pageNumber) {
	if (pdfDocument) {
		initialState.currentPage = pageNumber;
		currentPage.value = initialState.currentPage;
		renderPage();
	}
}

const showPrevPage = () => {
	if (initialState.pdfDoc === null || initialState.currentPage <= 1)
		return;
	initialState.currentPage--;
	// Render the current page.
	currentPage.value = initialState.currentPage;
	renderPage();
};

const showNextPage = () => {
	if (
		initialState.pdfDoc === null ||
		initialState.currentPage >= initialState.pdfDoc._pdfInfo.numPages
	)
		return;

	initialState.currentPage++;
	currentPage.value = initialState.currentPage;
	renderPage();
};

// #####################################################################################


//############################### EVENT LISTENERS ######################################### 

// Button events.
previousPage.addEventListener('click', showPrevPage);
nextPage.addEventListener('click', showNextPage);

// Keypress event.
currentPage.addEventListener('keypress', (event) => {
	if (initialState.pdfDoc === null) return;
	// Get the key code.
	const keycode = event.keyCode ? event.keyCode : event.which;

	if (keycode === 13) {
		// Get the new page number and render it.
		let desiredPage = currentPage.valueAsNumber;
		initialState.currentPage = Math.min(
			Math.max(desiredPage, 1),
			initialState.pdfDoc._pdfInfo.numPages,
		);

		currentPage.value = initialState.currentPage;
		renderPage();
	}
});

// Zoom events.
zoomIn.addEventListener('click', () => {
	if (initialState.pdfDoc === null) return;
	// initialState.zoom *= 4 / 3; 
	var can = document.querySelector('#canvas');
	var currWidth = can.clientWidth;
	if (currWidth > 1000) {
		alert("Maximum zoom-in level reached.");
	} else {
		can.style.width = (currWidth + 50) + "px";
	}
	renderPage();
});

zoomOut.addEventListener('click', () => {
	if (initialState.pdfDoc === null) return;
	// initialState.zoom *= 2 / 3;
	var can = document.querySelector('#canvas');
	var currWidth = can.clientWidth;
	if (currWidth < 500) {
		alert("Minimum zoom-out level reached.");
	} else {
		can.style.width = (currWidth - 50) + "px";
	}
	renderPage();
});

saveBtn.addEventListener('click', async function () {
	if (pdfList.length > 1) {
		var requestOptions = {
			method: 'POST',
			redirect: 'follow'
		};

		const response = await fetch(`http://localhost:8080/mergeAndReturnPdf/${pdfList[0].name}/${pdfList[1].name}`, requestOptions);

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const mergedPdfBlob = await response.blob();
		pdfList[0].content = await new Response(mergedPdfBlob).arrayBuffer();

		console.log("SUCCESS");
	}
    try {
        // Check if pdfDocument is loaded
        const loadedPdfDocument = await initializePdf(pdfList[0].content);
        if (loadedPdfDocument) {
            const pdfData = await loadedPdfDocument.getData();
            const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });

            if (window.pdfBlobUrl) {
                URL.revokeObjectURL(window.pdfBlobUrl);
            }

            window.pdfBlobUrl = URL.createObjectURL(pdfBlob);

            const downloadLink = document.createElement('a');
            downloadLink.href = window.pdfBlobUrl;
            downloadLink.download = 'downloaded_file.pdf';

            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            console.log('PDF saved successfully.');
        } else {
            console.error('No PDF document loaded.');
        }
    } catch (error) {
        console.error('Error saving PDF:', error);
    }
});



mergeBtn.addEventListener('click', async function () {
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    fileInput.click();
});

fileInput.addEventListener('change', async function () {
    const selectedFiles = fileInput.files;
    const file = fileInput.files[0];
    const fileName2 = file.name.replace(/\.[^/.]+$/, "");

    if (file) {
		const arrayBuffer = await selectedFiles[0].arrayBuffer();
		secondPdfBuffer = arrayBuffer; // Store the second PDF in the variable
		pdfList.push({ name: fileName2, content: secondPdfBuffer });

		if (pdfList.length > 1) {
			const formData = new FormData();
			formData.append('fileName', pdfList[1].name);
			// formData.append('file', pdfList[1].content, pdfList[1].name);
			const contentBlob = new Blob([pdfList[1].content], { type: 'application/pdf' });
			formData.append('file', contentBlob, pdfList[1].name);
	
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
		}

		const mergedPdfBuffer = await mergePDFs(pdfList[0].content, pdfList[1].content);
		await initializePdf(mergedPdfBuffer); // Wait for initializePdf to complete
		renderPage();
		renderSide(pdfDocument);
	} else {
		console.error('No file selected.');
	}
});

async function mergePDFs(pdf1, pdf2) {
	const { PDFDocument } = PDFLib;

    try {
        // Load the PDF buffers into PDFDocument objects
        const pdfDoc1 = await PDFDocument.load(pdf1);
        const pdfDoc2 = await PDFDocument.load(pdf2);

        // Create a new PDFDocument to merge the pages
        const mergedPdfDoc = await PDFDocument.create();

        // Add all pages from the first PDF
        for (let i = 0; i < pdfDoc1.getPageCount(); i++) {
            const [page] = await mergedPdfDoc.copyPages(pdfDoc1, [i]);
            mergedPdfDoc.addPage(page);
        }

        // Add all pages from the second PDF
        for (let i = 0; i < pdfDoc2.getPageCount(); i++) {
            const [page] = await mergedPdfDoc.copyPages(pdfDoc2, [i]);
            mergedPdfDoc.addPage(page);
        }

        // Save the merged PDF as ArrayBuffer
        const mergedPdfBytes = await mergedPdfDoc.save();

        return mergedPdfBytes.buffer;
    } catch (error) {
        console.error('Error merging PDFs:', error);
        return null;
    }
}

extractBtn.addEventListener('click', async function () {
	const modal = document.createElement('div');
	modal.style.position = 'fixed';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.width = '100%';
	modal.style.height = '100%';
	modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
	modal.style.display = 'flex';
	modal.style.alignItems = 'center';
	modal.style.justifyContent = 'center';

	// Create a form for page number input
	const form = document.createElement('form');
	form.innerHTML = `
        <label for="pageNumber">Enter Page Number or Range:</label>
        <input type="text" id="pageNumber" name="pageNumber" placeholder="e.g., 1, 3-5">
        <button type="button" id="submitForm">Submit</button>
    `;

	// Style the form
	form.style.backgroundColor = '#FEFAE0';
	form.style.padding = '20px';
	form.style.borderRadius = '10px';

	form.addEventListener('click', (event) => {
		event.stopPropagation(); // Prevent clicks inside the form from closing the modal
	});

	const submitButton = form.querySelector('#submitForm');
	const pageNumberInput = form.querySelector('#pageNumber');
	let formSubmitted = false;

	submitButton.addEventListener('click', handleSubmit);

	// Allow Enter key to submit the form
	pageNumberInput.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	});

	// Prevent the form from submitting and refreshing the page
	form.addEventListener('submit', (event) => {
		event.preventDefault();
	});

	function handleSubmit() {
		if (!formSubmitted) {
			// Retrieve the user's input (page numbers or range) and handle it
			const userInput = pageNumberInput.value.trim(); // Trim to remove leading/trailing spaces

			// Check if the input is not empty before proceeding
			if (userInput !== '') {
				console.log(`User input: ${userInput}`);
				// Close the modal after handling the input
				document.body.removeChild(modal);
			}

			// Set the flag to prevent further submissions
			formSubmitted = true;
			deleteMultiplePages(userInput);
		}
	}

	modal.appendChild(form);

	modal.addEventListener('click', (event) => {
		if (!event.target.closest('form')) {
			document.body.removeChild(modal);
		}
	});

	document.body.appendChild(modal);
});


function deleteMultiplePages(pageNumbers) {
    // Split the input into individual page numbers or ranges
    const pagesToDelete = parsePageNumbers(pageNumbers);

    // Iterate through the pagesToDelete array and delete each page
    pagesToDelete.forEach((pageNumber) => {
        const successfullyDeleted = deletePage(pageNumber);

        if (!successfullyDeleted) {
            // Show a warning message for pages that do not exist
            console.warn(`Page ${pageNumber} does not exist.`);
        }
    });
}


function parsePageNumbers(pageNumbers) {
	const pagesToDelete = [];

	// Split the input by commas and trim spaces
	const pageTokens = pageNumbers.split(',');

	// Process each token to get individual page numbers or ranges
	pageTokens.forEach((token) => {
		token = token.trim();

		if (token.includes('-')) {
			// Token represents a range (e.g., 2-5)
			const [start, end] = token.split('-').map((num) => parseInt(num, 10));
			for (let i = start; i <= end; i++) {
				pagesToDelete.push(i);
			}
		} else {
			// Token represents a single page number (e.g., 3)
			const pageNumber = parseInt(token, 10);
			if (!isNaN(pageNumber)) {
				pagesToDelete.push(pageNumber);
			}
		}
	});

	return pagesToDelete;
}


function uploadFile() {
    const fileInput = document.getElementById('dosya');
    const file = fileInput.files[0];
    const fileName = file.name.replace(/\.[^/.]+$/, "")

    if (file) {
        const formData = new FormData();
        formData.append('fileName', fileName); // Set your desired file name
        formData.append('file', file);

        // Make a POST request using fetch or XMLHttpRequest
        fetch('http://localhost:8080/uploadPdf', {
            method: 'POST',
            body: formData
        })
        // .then(response => response.json())
        .then(data => {
            console.log('File uploaded successfully:', data);
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });

        const valueToSend = fileName;

        // Store the value in localStorage
        localStorage.setItem('dataToSend', valueToSend);
        
        window.location.href = 'edit.html';

        // window.location.href = 'edit.html';
    } else {
        console.error('No file selected.');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.getElementById('back_button');

    // Add a click event listener to the back button
    backButton.addEventListener('click', function () {
        // Ask the user for confirmation
        const userConfirmed = window.confirm('Are you sure you want to continue?');

        // If the user confirms, navigate to another HTML page
        if (userConfirmed) {
            window.location.href = 'index.html';
        }
        // If the user cancels, do nothing or handle it as needed
    });
});

document.body.addEventListener('click', function() {
	console.log(pages);
	console.log(pdfList);
	console.log(pdfList[0]);
	// Add your desired code here
});

function addProcess(name, details) {
    const newProcess = {
        name: name,
        details: details,
        timestamp: new Date().toLocaleString() // Include a timestamp for reference
    };
    processList.push(newProcess);
    console.log(`Process added: ${name}`);
}

function undoLastProcess() {
    if (processList.length > 0) {
        const lastProcess = processList.pop();
        console.log(`Undoing last process: ${lastProcess.name}`);
        // Implement logic to undo the effect of the last process
        undoProcess(lastProcess);
    } else {
        console.log('No processes to undo.');
    }
}

function undoProcess(process) {
    if (process.name === 'Delete Page') {
        // Implement logic to add back the deleted page
        undoDeletePage();
        console.log(`Restoring deleted page: ${process.details.pageNumber}`);
    } else if (process.name === 'Edit Document') {
        // Implement logic to revert changes in the edited document
        console.log(`Reverting edits in document: ${process.details.docName}`);
    } else if (process.name === 'Change Page Order') {
        // Restore the previous order of pages
        pages = process.details.previousOrder;

        // Render the PDF with the restored order
        renderSide(pdfDocument);
    }
}


undoBtn.addEventListener('click', async function () {
	undoLastProcess();
});

function undoDeletePage() {
    // Check if there are deleted pages to undo
    if (deletedPagesList.length > 0) {
        const lastDeletedPage = deletedPagesList.pop();

        // Insert the deleted page back into the 'pages' array at its original index
        pages.splice(lastDeletedPage.index, 0, lastDeletedPage.pageNumber);

        // Your additional logic to render the page thumbnails or other UI updates...
		renderSide(pdfDocument);

        console.log(`Undid deletion of page ${lastDeletedPage.pageNumber}. New array:`, pages);
    } else {
        console.log('No deleted pages to undo.');
    }
}


// Function to reorder pages in a pdfDocument
async function reorderPages(pdfDocument, newOrder) {
	const { PDFDocument } = PDFLib;

    try {
        // Create a new PDFDocument to store the reordered pages
        const reorderedPdfDoc = await PDFDocument.create();

        // Iterate through the new order and copy pages to the new document
        for (const pageNumber of newOrder) {
			
            // Check if the page number is within the valid range
            if (pageNumber >= 1 && pageNumber <= pdfDocument.numPages) {
                // Get the page from the original pdfDocument
                const [page] = await reorderedPdfDoc.copyPages(pdfDocument, [pageNumber - 1]);

                // Add the page to the reorderedPdfDoc
                reorderedPdfDoc.addPage(page);
            } else {
                console.warn(`Page ${pageNumber} does not exist in the original document.`);
            }
        }

        // Return the new PDFDocument with reordered pages
        return reorderedPdfDoc;
    } catch (error) {
        console.error('Error reordering pages:', error);
        return null;
    }
}