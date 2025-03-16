document.addEventListener('DOMContentLoaded', function() {
    let currentPagination = null;
    // Add favorites array to store favorited pet IDs
    window.favorites = [];

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
    
    // Set up event handlers for the pet details modal
    setupPetDetailsModal();
    
    // Make functions available globally for inline onclick handlers
    window.showOrganizationDetails = showOrganizationDetails;
    window.closeNoResultsModal = closeNoResultsModal;
    window.toggleFavorite = toggleFavorite;
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
    // Add pet ID as data attribute for favorite tracking
    petElement.setAttribute('data-pet-id', pet.id);
    
    // Create image element
    const imgElement = document.createElement('img');
    
    // Handle images, use placeholder if no photos
    if (pet.photos && pet.photos.length > 0) {
        imgElement.src = pet.photos[0].medium || pet.photos[0].small || pet.photos[0].large;
        imgElement.setAttribute('data-photos', JSON.stringify(pet.photos));
        
        // Add click event to show modal with all photos
        imgElement.addEventListener('click', function(event) {
            // Prevent event from bubbling up to the pet card
            event.stopPropagation();
            
            const photos = JSON.parse(this.getAttribute('data-photos'));
            showPetImagesModal(photos, event);
        });
    } else {
        imgElement.src = "images/placeholder-image-url.png";
    }
    imgElement.alt = pet.name;
    petElement.appendChild(imgElement);
    
    // Add heart favorite icon instead of status badge
    const heartElement = document.createElement('div');
    heartElement.className = 'pet-favorite';
    const isFavorite = window.favorites.includes(pet.id);
    heartElement.innerHTML = `<i class="fas fa-heart ${isFavorite ? 'active' : ''}"></i>`;
    
    // Add click handler to toggle favorite status
    heartElement.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent opening the pet details modal
        toggleFavorite(pet.id, this);
    });
    
    petElement.appendChild(heartElement);

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
    
    // Make the entire pet card clickable to show pet details modal
    petElement.addEventListener('click', function() {
        showPetDetailsModal(pet.id);
    });
    
    // Add hover state cursor
    petElement.style.cursor = 'pointer';
}

function showPetImagesModal(photos, event) {
    // Prevent default behavior if event is provided
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Set up the modal
    const modal = document.getElementById('petImageModal');
    const modalImages = document.getElementById('modalImages');
    
    // Clear previous images and add new ones
    modalImages.innerHTML = '';
    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.medium || photo.small || photo.large;
        img.alt = "Pet photo";
        img.onclick = function() {
            window.open(photo.full, '_blank');
        };
        modalImages.appendChild(img);
    });

    // Display the modal
    modal.style.display = 'block';
    
    // Set up close button
    const closeButton = modal.querySelector('.close');
    closeButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Close when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function displayNoResultsModal() {
    const noResultsModal = document.getElementById('noResultsModal');
    if (noResultsModal) {
        noResultsModal.style.display = 'block';
        
        // Set up close functionality
        const closeBtn = noResultsModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = function() {
                noResultsModal.style.display = 'none';
            };
        }
    } else {
        // Fallback to alert if modal not found
        alert("No pets found with those criteria. Please try a different search.");
    }
}

function closeNoResultsModal() {
    const noResultsModal = document.getElementById('noResultsModal');
    if (noResultsModal) {
        noResultsModal.style.display = 'none';
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
    const resultsContainer = document.getElementById('results');
    
    pets.forEach(pet => {
        const petElement = document.createElement('div');
        petElement.className = 'pet';
        populatePetElement(petElement, pet);
        resultsContainer.appendChild(petElement);
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

// Setup pet details modal
function setupPetDetailsModal() {
    const modal = document.getElementById('petDetailsModal');
    const closeBtn = modal.querySelector('.close');
    
    // Close modal when close button is clicked
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside the content
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Show pet details modal and fetch pet data
async function showPetDetailsModal(petId) {
    const modal = document.getElementById('petDetailsModal');
    const container = document.getElementById('petDetailsContainer');
    
    // Display loading indicator
    container.innerHTML = '<div class="pet-details-loading loading"></div>';
    modal.style.display = 'block';
    
    try {
        await fetchPetDetails(petId);
    } catch (error) {
        container.innerHTML = `<div class="error-message">
            <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ff8066;"></i>
            <p>Error loading pet details: ${error.message}</p>
        </div>`;
    }
}

// Fetch pet details from API
async function fetchPetDetails(petId) {
    const response = await fetch(`/.netlify/functions/petfinder-proxy/animals/${petId}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    displayPetDetails(data.animal);
}

// Function to show organization details
function showOrganizationDetails(orgId) {
    // For now, just navigate to the organization details page
    // In a future update, this could be changed to show organization details in a modal as well
    window.location.href = `organization-details.html?orgId=${orgId}`;
}

// Display pet details in the modal
function displayPetDetails(pet) {
    const container = document.getElementById('petDetailsContainer');
    
    // Check if pet is favorited
    const isFavorite = window.favorites.includes(pet.id);
    
    // Build HTML for pet details
    let html = `
        <div class="pet-details-header">
            <h2 class="pet-details-name">
                ${pet.name}
                <span class="pet-details-favorite" onclick="toggleFavorite('${pet.id}')">
                    <i class="fas fa-heart ${isFavorite ? 'active' : ''}"></i>
                </span>
            </h2>
            <p class="pet-details-subtitle">${pet.age} · ${pet.gender} · ${pet.breeds.primary}${pet.breeds.secondary ? ` / ${pet.breeds.secondary}` : ''}</p>
        </div>
        
        <div class="pet-details-images">
    `;
    
    // Add images
    if (pet.photos && pet.photos.length > 0) {
        pet.photos.forEach(photo => {
            html += `<img src="${photo.medium}" alt="${pet.name}" onclick="window.open('${photo.full}', '_blank')">`;
        });
    } else {
        html += `<img src="images/placeholder-image-url.png" alt="${pet.name}">`;
    }
    
    html += `</div>`;
    
    // Add description if available
    if (pet.description) {
        html += `
            <div class="pet-details-description">
                <p>${pet.description}</p>
            </div>
        `;
    }
    
    // Add attributes in groups
    html += `<div class="pet-details-attributes">`;
    
    // Basic info group
    html += `
        <div class="attribute-group">
            <h3><i class="fas fa-info-circle"></i> Basic Info</h3>
            
            <div class="attribute">
                <span class="attribute-label">Size</span>
                <span class="attribute-value">${pet.size}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Color</span>
                <span class="attribute-value">${pet.colors.primary || 'Unknown'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Coat</span>
                <span class="attribute-value">${pet.coat || 'Unknown'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Status</span>
                <span class="attribute-value">${pet.status}</span>
            </div>
        </div>
    `;
    
    // Attributes group
    html += `
        <div class="attribute-group">
            <h3><i class="fas fa-check-circle"></i> Attributes</h3>
            
            <div class="attribute">
                <span class="attribute-label">Spayed/Neutered</span>
                <span class="attribute-value">${pet.attributes.spayed_neutered ? 'Yes' : 'No'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">House Trained</span>
                <span class="attribute-value">${pet.attributes.house_trained ? 'Yes' : 'No'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Declawed</span>
                <span class="attribute-value">${pet.attributes.declawed ? 'Yes' : 'Unknown'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Special Needs</span>
                <span class="attribute-value">${pet.attributes.special_needs ? 'Yes' : 'No'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Shots Current</span>
                <span class="attribute-value">${pet.attributes.shots_current ? 'Yes' : 'No'}</span>
            </div>
        </div>
    `;
    
    // Environment group
    html += `
        <div class="attribute-group">
            <h3><i class="fas fa-home"></i> Environment</h3>
            
            <div class="attribute">
                <span class="attribute-label">Good with Children</span>
                <span class="attribute-value">${pet.environment && pet.environment.children !== null ? (pet.environment.children ? 'Yes' : 'No') : 'Unknown'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Good with Dogs</span>
                <span class="attribute-value">${pet.environment && pet.environment.dogs !== null ? (pet.environment.dogs ? 'Yes' : 'No') : 'Unknown'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Good with Cats</span>
                <span class="attribute-value">${pet.environment && pet.environment.cats !== null ? (pet.environment.cats ? 'Yes' : 'No') : 'Unknown'}</span>
            </div>
        </div>
    `;
    
    // Contact group
    html += `
        <div class="attribute-group">
            <h3><i class="fas fa-address-card"></i> Contact</h3>
            
            <div class="attribute">
                <span class="attribute-label">Organization</span>
                <span class="attribute-value">${pet.organization_id}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Email</span>
                <span class="attribute-value">${pet.contact.email || 'Not provided'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Phone</span>
                <span class="attribute-value">${pet.contact.phone || 'Not provided'}</span>
            </div>
            
            <div class="attribute">
                <span class="attribute-label">Address</span>
                <span class="attribute-value">${pet.contact.address.city}, ${pet.contact.address.state} ${pet.contact.address.postcode}</span>
            </div>
        </div>
    `;
    
    html += `</div>`; // End of attributes
    
    // Add footer with links
    html += `
        <div class="pet-details-footer">
            <a href="${pet.url}" target="_blank"><i class="fas fa-external-link-alt"></i> View on Petfinder</a>
            <a href="javascript:void(0);" onclick="showOrganizationDetails('${pet.organization_id}')"><i class="fas fa-building"></i> View Organization</a>
        </div>
    `;
    
    // Update the container with the pet details
    container.innerHTML = html;
}

// Function to toggle pet as favorite
function toggleFavorite(petId, heartElement) {
    const index = window.favorites.indexOf(petId);
    
    if (index === -1) {
        // Add to favorites
        window.favorites.push(petId);
    } else {
        // Remove from favorites
        window.favorites.splice(index, 1);
    }
    
    // If heartElement is provided (from pet card), update the icon
    if (heartElement) {
        const heartIcon = heartElement.querySelector('i');
        if (index === -1) {
            heartIcon.classList.add('active');
        } else {
            heartIcon.classList.remove('active');
        }
    }
    
    // Update all instances of this pet's heart in the grid
    updateFavoriteStatusInGrid(petId, index === -1);
    
    // Log current favorites (could be used for other features later)
    console.log('Current favorites:', window.favorites);
}

// Update all instances of a pet's favorite status in the results grid
function updateFavoriteStatusInGrid(petId, isFavorite) {
    // Find all pet cards in the grid
    const petCards = document.querySelectorAll('.pet');
    petCards.forEach(card => {
        // Check if this card is for the pet we're updating
        if (card.getAttribute('data-pet-id') === petId) {
            const heartIcon = card.querySelector('.pet-favorite i');
            if (heartIcon) {
                if (isFavorite) {
                    heartIcon.classList.add('active');
                } else {
                    heartIcon.classList.remove('active');
                }
            }
        }
    });
}