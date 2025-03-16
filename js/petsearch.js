document.addEventListener('DOMContentLoaded', function() {
    let currentPagination = null;

    document.getElementById('zipForm').addEventListener('submit', function(event) {
        event.preventDefault();
        currentPagination = null; // Reset pagination on new search
        
        // Show loading indicator
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('results').innerHTML = '';
        document.getElementById('loadMore').style.display = 'none';
        
        loadPets();
    });

    document.getElementById('loadMore').addEventListener('click', function() {
        if (currentPagination && currentPagination.next) {
            // Show loading when loading more
            document.getElementById('loading').style.display = 'flex';
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
    try {
        let url = `/.netlify/functions/petfinder-proxy/animals?location=${encodeURIComponent(location)}&limit=50`;
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

        console.log('Fetching from URL:', url);
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
        console.error("Error in fetchPets:", error);
        displayError(error.message);
    } finally {
        // Hide loading indicator in all cases
        document.getElementById('loading').style.display = 'none';
    }
}

function populatePetElement(petElement, pet) {
    // Create image element
    const imgElement = document.createElement('img');
    
    // Handle images, use placeholder if no photos
    if (pet.photos && pet.photos.length > 0) {
        imgElement.src = pet.photos[0].medium || pet.photos[0].small || pet.photos[0].large;
        imgElement.setAttribute('data-photos', JSON.stringify(pet.photos));
        
        // Add click event to show modal with all photos
        imgElement.addEventListener('click', function() {
            const photos = JSON.parse(this.getAttribute('data-photos'));
            showPetImagesModal(photos);
        });
    } else {
        imgElement.src = "images/placeholder-image-url.png";
    }
    imgElement.alt = pet.name;
    petElement.appendChild(imgElement);
    
    // Add pet badge for status
    const badgeElement = document.createElement('div');
    badgeElement.className = 'pet-badge';
    badgeElement.textContent = pet.status.charAt(0).toUpperCase() + pet.status.slice(1);
    petElement.appendChild(badgeElement);

    // Create pet info container
    const infoElement = document.createElement('div');
    infoElement.className = 'pet-info';
    
    // Add pet name
    const nameElement = document.createElement('h3');
    nameElement.textContent = pet.name;
    infoElement.appendChild(nameElement);
    
    // Add pet breed
    if (pet.breeds && pet.breeds.primary) {
        const breedElement = document.createElement('p');
        breedElement.textContent = pet.breeds.primary;
        if (pet.breeds.secondary) {
            breedElement.textContent += ` / ${pet.breeds.secondary}`;
        }
        infoElement.appendChild(breedElement);
    }
    
    // Add pet age and gender
    const ageGenderElement = document.createElement('p');
    ageGenderElement.textContent = `${pet.age} · ${pet.gender}`;
    infoElement.appendChild(ageGenderElement);
    
    // Add location if available
    if (pet.contact && pet.contact.address && pet.contact.address.city && pet.contact.address.state) {
        const locationElement = document.createElement('p');
        locationElement.textContent = `${pet.contact.address.city}, ${pet.contact.address.state}`;
        infoElement.appendChild(locationElement);
    }
    
    petElement.appendChild(infoElement);
    
    // Make the entire pet card clickable to go to details page
    petElement.addEventListener('click', function(event) {
        // Don't redirect if they clicked on the image (that opens the modal)
        if (event.target !== imgElement) {
            window.location.href = `pet-details.html?id=${pet.id}`;
        }
    });
    
    // Add hover state cursor
    petElement.style.cursor = 'pointer';
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

function displayNoResultsModal() {
    // Display message when no results are found
    alert("No pets found with those criteria. Please try a different search.");
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
        const petElement = document.createElement('div');
        petElement.className = 'pet';
        const petDetailUrl = `pet-details.html?petId=${pet.id}`;
        const imageUrl = pet.photos.length > 0 ? pet.photos[0].full : 'images/placeholder-image-url.png';
        const location = pet.contact.address.city + ', ' + pet.contact.address.state;
        const petDistance = pet.distance ? pet.distance.toFixed(1) + ' miles' : 'N/A';
        const organization = pet.organization_id || 'N/A';
        const breed = pet.breeds.primary || 'Unknown';
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

function displayResults(pets) {
    const resultsContainer = document.getElementById('results');
    
    if (currentPagination === null) {
        // Clear results for new search
        resultsContainer.innerHTML = '';
    }
    
    if (pets.length === 0) {
        displayNoResultsModal();
        return;
    }
    
    appendResults(pets);
    updateLoadMoreButton();
}