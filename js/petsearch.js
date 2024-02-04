document.addEventListener('DOMContentLoaded', function() {
    let currentPagination = null;

    document.getElementById('zipForm').addEventListener('submit', function(event) {
        event.preventDefault();
        currentPagination = null; // Reset pagination on new search
        loadPets();
    });

    document.getElementById('loadMore').addEventListener('click', function() {
        if (currentPagination && currentPagination.next) {
            loadPets(currentPagination.next);
        }
    });
});

async function loadPets(page = 1) {
    const location = document.getElementById('location').value;
    const animalType = document.getElementById('animalType').value;
    const gender = document.getElementById('gender').value;
    const distance = document.getElementById('distance').value;
    const animalAge = document.getElementById('animalAge').value; // Corrected line
    await fetchPets(location, animalType, gender, distance, animalAge, page);
}

async function fetchPets(location, animalType, gender, distance, animalAge, page) {
    //console.log("Selected Age: ", animalAge); // Debugging line
    try {
        let url = `http://localhost:3000/api/v2/animals?location=${encodeURIComponent(location)}&limit=50`;
        if (animalType) {
            url += `&type=${encodeURIComponent(animalType)}`;
        }
        if (gender) {
            url += `&gender=${encodeURIComponent(gender)}`;
        }
        if (distance) {
            url += `&distance=${encodeURIComponent(distance)}`;
        }
        if (animalAge) {
            url += `&age=${encodeURIComponent(animalAge)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            // Log and handle HTTP errors from the server
            console.error(`HTTP error from proxy server! Status: ${response.status}`);
            displayError(`HTTP error from proxy server! Status: ${response.status}`);
            return;
        }

        const data = await response.json();

        if (!data.animals || data.animals.length === 0) {
            displayNoResultsModal();
            return;
        }

        currentPagination = data.pagination;
        updateLoadMoreButton();

        const petsWithPhotos = data.animals.filter(pet => pet.photos && pet.photos.length > 0);
        if (page === 1) {
            displayResults(petsWithPhotos);
        } else {
            appendResults(petsWithPhotos);
        }
    } catch (error) {
        // Log and handle network errors or issues with the fetch operation
        console.error('Network error or issue with fetch operation: ', error);
        displayError(`Network error or issue with fetch operation: ${error.message}`);
    }
}

function populatePetElement(petElement, pet) {
    const imageUrl = pet.photos.length > 0 ? pet.photos[0].medium : 'images/placeholder-image-url.png';

    // Remove the wrapping anchor tag around the image
    petElement.innerHTML = `
        <img src="${imageUrl}" alt="Image of ${pet.name}" class="pet-img">
        <div class="pet-info">
            <h3>${pet.name}</h3>
            <p>Age: ${pet.age || 'Unknown'}</p>
            <p>Gender: ${pet.gender || 'Unknown'}</p>
            <button onclick="location.href='pet-details.html?petId=${pet.id}'">View Details</button>
        </div>
    `;

    // Add click event listener to the image for opening the modal
    const petImg = petElement.querySelector('.pet-img');
    petImg.addEventListener('click', () => showPetImagesModal(pet.photos));
}

function showPetImagesModal(photos) {
    // Assuming you have a modal element in your HTML with id 'petImageModal'
    const modal = document.getElementById('petImageModal');
    const modalImages = document.getElementById('modalImages');
    modalImages.innerHTML = photos.map(photo => `<img src="${photo.medium}" alt="Pet">`).join('');

    modal.style.display = 'block';

    const closeButton = modal.querySelector('.close');
    closeButton.onclick = function() {
        modal.style.display = 'none';
    }
}


petElement.innerHTML += `<button onclick="location.href='pet-details.html?petId=${pet.id}'">View Details</button>`;


function showPetImagesModal(photos) {
    const modal = document.getElementById('petImageModal');
    const modalImages = document.getElementById('modalImages');
    modalImages.innerHTML = photos.map(photo => `<img src="${photo.medium}" alt="Pet">`).join('');

    modal.style.display = 'block';

    const closeButton = modal.querySelector('.close');
    closeButton.onclick = function() {
        modal.style.display = 'none';
    }
}



function displayError(message) {
    // Display error message to the user
    const errorModal = document.getElementById('errorModal');
    if (errorModal) {
        errorModal.querySelector('.modal-content p').textContent = message;
        errorModal.style.display = 'block';
    } else {
        alert(message);
    }
}

function updateLoadMoreButton() {
    const loadMoreButton = document.getElementById('loadMore');
    if (currentPagination && currentPagination.next) {
        loadMoreButton.style.display = 'block';
    } else {
        loadMoreButton.style.display = 'none';
    }
}

function appendResults(pets) {
    const results = document.getElementById('results');
    pets.forEach(pet => {
        // This code should be similar to the one in displayResults
        // Create petElement and append it to the results
        // Example:
        const petElement = document.createElement('div');
        petElement.className = 'pet';
        // ... rest of the code to populate petElement ...
        results.appendChild(petElement);
    });
}

function displayResults(pets) {
    const results = document.getElementById('results');
    results.innerHTML = '';

    pets.forEach(pet => {
        const petElement = document.createElement('div');
        petElement.className = 'pet';
        const petDetailUrl = `pet-details.html?petId=${pet.id}`;
        const imageUrl = pet.photos.length > 0 ? pet.photos[0].full : 'images/placeholder-image-url.png';
        const location = pet.contact.address.city + ', ' + pet.contact.address.state;
        const petDistance = pet.distance ? pet.distance.toFixed(1) + ' miles' : 'N/A';
        const organization = pet.organization_id || 'N/A';
        const breed = pet.breeds.primary || 'Unknown';
        const type = pet.type || 'Unknown';
        const size = pet.size || 'Unknown';
        const petGender = pet.gender || 'Unknown';
        const age = pet.age || 'Unknown';

        petElement.innerHTML = `
            <a href="${petDetailUrl}" target="_blank">
                <img src="${imageUrl}" alt="Image of ${pet.name}" style="width:200px; height:auto;">
            </a>
            <h2>${pet.name}</h2>
            <h3>${age}</h3>
            <p><strong>Breed:</strong> ${breed}</p>
            <p><strong>Size:</strong> ${size}</p>
            <p><strong>Gender:</strong> ${petGender}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Distance:</strong> ${petDistance}</p>
            <p><strong>Organization:</strong> ${organization}</p>
        `;
        results.appendChild(petElement);
    });
}