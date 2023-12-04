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
let pdfFile;

var numPages = 0;

const targetDpi = 300; // Set your target DPI (dots per inch)
const targetScale = targetDpi / 72.0; // PDF.js uses 72 DPI as the default

const receivedValue = localStorage.getItem('dataToSend');
let fileName = receivedValue;

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
	  const response = await fetch(`http://localhost:8080/downloadPdf/${fileName}`);
  
	  if (response.ok) {
		const arrayBuffer = await response.arrayBuffer();
		pdfFile = arrayBuffer;
		console.log('Type of pdfFile:', Object.prototype.toString.call(pdfFile));
		console.log('Size of pdfFile:', pdfFile.byteLength);
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
	// fileName = "sample";
	
	const arrayBuffer = await loadPdf(fileName);
	console.log(fileName);
	if (arrayBuffer) {
	  initializePdf(arrayBuffer);
	} else {
	  console.error('Error loading PDF. Using default PDF.');
	  initializePdf(null);
	}
  };

async function initializePdf(pdfBuffer) {
	try {
		pdfDocument = await pdfjsLib.getDocument({
			data: pdfBuffer
		}).promise;
		initialState.pdfDoc = pdfDocument;
		pageCount.textContent = initialState.pdfDoc.numPages;

		pages = [];
		for (let pageNumber = 1; pageNumber <= initialState.pdfDoc.numPages; pageNumber++) {
			pages.push(pageNumber);
		}

		renderPage();
		renderSide(pdfDocument);
	} catch (err) {
		console.error('Error initializing PDF:', err);
		alert(err.message);
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
    const thumbnails = document.querySelectorAll('#page-thumbnails li');
    const updatedPages = Array.from(thumbnails).map(thumbnail => {
        const pageNumber = parseInt(thumbnail.id.split('-').pop());
        return pageNumber;
    });

    // Update the 'pages' array or any data structure you use to track the order
    pages = updatedPages;
	console.log(pages)

    // Render the PDF with the new order
    // renderPdf();
}


function createPageThumbnail(pageNumber) {
	const listItem = document.createElement('li');
	listItem.id = `thumbnail-item-${pageNumber}`;


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
	} else {
		console.log(`Element ${pageNumber} not found in the array.`);
	}

	// Remove the corresponding list item from the 'pageThumbnails' container
	const thumbnailItem = document.getElementById(`thumbnail-item-${pageNumber}`);
	if (thumbnailItem) {
		thumbnailItem.remove();
	}
	console.log(currentPage + " " + pageNumber + " " + pageCount)
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

	renderPage();
	initialState.pdfDoc._pdfInfo.numPages -= 1;
	currentPage.value = initialState.currentPage - 1;
	pageCount.textContent -= 1;

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
    try {
        if (pdfDocument) {
            // Save the complete PDF document as ArrayBuffer
            const fullPdfBuffer = await pdfDocument.getData();

            // Get the list of pages you want to send to the server
            // const selectedPages = [1, 2, 3]; // Replace with your logic to get the selected pages

            // Create a FormData object to send both the PDF file and the list of pages
            const formData = new FormData();
            formData.append('pdfFile', new Blob([fullPdfBuffer], { type: 'application/pdf' }), 'full_document.pdf');
            formData.append('pageOrder', JSON.stringify(selectedPages));

            // Send a POST request to the server endpoint
            const response = await fetch(`http://localhost:8080/downloadSortedPdf/sample`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Handle the successful response, e.g., show a success message
                console.log('PDF saved successfully with selected pages.');
            } else {
                // Handle the error response, e.g., show an error message
                console.error('Error saving PDF:', response.statusText);
            }
        } else {
            console.error('PDF document not available.');
        }
    } catch (error) {
        console.error('Error saving PDF:', error);
    }
});



mergeBtn.addEventListener('click', function () {
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    fileInput.click();
});

fileInput.addEventListener('change', async function () {
    const selectedFiles = fileInput.files;

    if (selectedFiles.length > 0) {
        const arrayBuffer = await selectedFiles[0].arrayBuffer();
        const arrayBuffer2 = await loadPdf("sample");

        const mergedPdfBuffer = await mergePDFs(pdfFile, arrayBuffer);

        if (mergedPdfBuffer) {
            updateMergedPdf(mergedPdfBuffer);
        }
    }
});

async function mergePDFs(pdf, pdfAdded) {
    const {
        PDFDocument
    } = PDFLib;
    try {
        // Load existing PDF
        const pdfDoc = await PDFDocument.load(pdf);

        // Load PDF to be added
        const pdfAddedDoc = await PDFDocument.load(pdfAdded);

        // Add pages from pdfAddedDoc to pdfDoc
        const pdfAddedPages = await pdfDoc.copyPages(pdfAddedDoc, pdfAddedDoc.getPageIndices());
        pdfAddedPages.forEach((page) => pdfDoc.addPage(page));

        // Serialize the merged PDF
        const mergedPdfBytes = await pdfDoc.save();

        // Return the merged PDF as ArrayBuffer
        return new Uint8Array(mergedPdfBytes).buffer;
    } catch (error) {
        console.error('Error merging PDFs:', error);
        return null;
    }
}

function updateMergedPdf(mergedPdfBuffer) {
    pdfFile = mergedPdfBuffer;
    initializePdf(mergedPdfBuffer);
}


function saveOrDisplayMergedPDF(mergedPdf) {
	if (mergedPdf) {
		// Save the merged PDF as a file
		const blob = new Blob([mergedPdf], {
			type: 'application/pdf'
		});

		// Create a Blob URL for the Blob
		const url = window.URL.createObjectURL(blob);

		// Create a link element to trigger the download
		const downloadLink = document.createElement('a');
		downloadLink.href = url;
		downloadLink.download = 'merged_document.pdf'; // Replace with the desired file name
		downloadLink.style.display = 'none'; // Hide the link

		// Append the link to the document
		document.body.appendChild(downloadLink);

		// Trigger the click event
		downloadLink.click();

		// Remove the link from the document
		document.body.removeChild(downloadLink);
	} else {
		console.error('Error generating merged PDF.');
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
		deletePage(pageNumber);
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
