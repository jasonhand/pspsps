document.addEventListener('DOMContentLoaded', function() {
    let currentPagination = null;
    // Add favorites array to store favorited pet IDs
    window.favorites = [];
    
    // Initialize distance slider value display
    const distanceSlider = document.getElementById('distance');
    const distanceValue = document.getElementById('distanceValue');
    
    if (distanceSlider && distanceValue) {
        // Initial value
        distanceValue.textContent = distanceSlider.value;
        
        // Update value on slider change
        distanceSlider.addEventListener('input', function() {
            distanceValue.textContent = this.value;
            triggerSearch();
        });
    }
    
    // Set up event listeners for all filter inputs to enable hot reload
    setupHotReload();

    // Handle form submission (for when user presses Enter in location field)
    document.getElementById('zipForm').addEventListener('submit', function(event) {
        event.preventDefault();
        
        const locationInput = document.getElementById('location');
        if (locationInput.value.trim()) {
            triggerSearch();
        }
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
    
    // Set up event handlers for the organization details modal
    setupOrganizationDetailsModal();
    
    // Make functions available globally for inline onclick handlers
    window.showOrganizationDetails = showOrganizationDetails;
    window.closeNoResultsModal = closeNoResultsModal;
    window.toggleFavorite = toggleFavorite;
});

// Set up hot reload functionality
function setupHotReload() {
    // Debounce function to prevent too many API calls
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // Function to trigger search with debounce
    const triggerSearch = debounce(function() {
        // Don't trigger if the location is empty
        if (!document.getElementById('location').value.trim()) {
            return;
        }
        
        currentPagination = null; // Reset pagination on new search
        
        // Show loading indicator
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('results').innerHTML = '';
        document.getElementById('loadMore').style.display = 'none';
        
        loadPets();
    }, 500); // 500ms debounce time
    
    // Expose function globally for other events to use
    window.triggerSearch = triggerSearch;
    
    // Set up event listeners for all filter elements
    
    // Text input for location
    document.getElementById('location').addEventListener('input', debounce(() => {
        if (document.getElementById('location').value.trim().length >= 3) {
            triggerSearch();
        }
    }, 800)); // Longer debounce for text input
    
    // Select dropdowns
    document.getElementById('animalType').addEventListener('change', triggerSearch);
    document.getElementById('gender').addEventListener('change', triggerSearch);
    
    // Age checkboxes
    document.querySelectorAll('input[name="animalAge"]').forEach(checkbox => {
        checkbox.addEventListener('change', triggerSearch);
    });
    
    // Filter checkboxes
    document.getElementById('favoritesOnly').addEventListener('change', triggerSearch);
    document.getElementById('withPhotosOnly').addEventListener('change', triggerSearch);
}

async function loadPets(page = 1) {
    const location = document.getElementById('location').value;
    
    // Don't try to load pets if no location is provided
    if (!location.trim()) {
        document.getElementById('loading').style.display = 'none';
        return;
    }
    
    const animalType = document.getElementById('animalType').value;
    const gender = document.getElementById('gender').value;
    const distance = document.getElementById('distance').value;
    
    // Get selected age values from checkboxes
    const ageCheckboxes = document.querySelectorAll('input[name="animalAge"]:checked');
    const selectedAges = Array.from(ageCheckboxes).map(checkbox => checkbox.value);
    
    const favoritesOnly = document.getElementById('favoritesOnly').checked;
    const withPhotosOnly = document.getElementById('withPhotosOnly').checked;
    
    await fetchPets(location, animalType, gender, distance, selectedAges, page, favoritesOnly, withPhotosOnly);
}

async function fetchPets(location, animalType, gender, distance, selectedAges, page, favoritesOnly, withPhotosOnly) {
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
        
        // Add multiple age parameters if selected
        if (selectedAges && selectedAges.length > 0) {
            selectedAges.forEach(age => {
                url += `&age=${encodeURIComponent(age)}`;
            });
        }

        console.log('Fetching from URL:', url);
        const response = await fetch(url);

        if (!response.ok) {
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
        
        // Filter results based on user preferences
        let filteredPets = data.animals;
        
        // Filter for pets with photos if requested
        if (withPhotosOnly) {
            filteredPets = filteredPets.filter(pet => pet.photos && pet.photos.length > 0);
        }
        
        // Filter for favorited pets if requested
        if (favoritesOnly) {
            filteredPets = filteredPets.filter(pet => window.favorites.includes(pet.id));
        }
        
        // If no results after filtering
        if (filteredPets.length === 0) {
            displayNoResultsModal();
            return;
        }
        
        // Prioritize pets with photos even if not filtering exclusively for them
        const petsWithPhotos = filteredPets.filter(pet => pet.photos && pet.photos.length > 0);
        const petsWithoutPhotos = filteredPets.filter(pet => !pet.photos || pet.photos.length === 0);
        
        // Combine the arrays, with pets with photos first
        const prioritizedPets = [...petsWithPhotos, ...petsWithoutPhotos];
        
        updateLoadMoreButton();

        if (page === 1) {
            displayResults(prioritizedPets);
        } else {
            appendResults(prioritizedPets);
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
    
    // Create image container for overlay elements
    const imageContainer = document.createElement('div');
    imageContainer.className = 'pet-image-container';
    
    // Create image element
    const imgElement = document.createElement('img');
    
    // Handle images, use placeholder if no photos
    if (pet.photos && pet.photos.length > 0) {
        imgElement.src = pet.photos[0].medium || pet.photos[0].small || pet.photos[0].large;
        imgElement.setAttribute('data-photos', JSON.stringify(pet.photos));
    } else {
        imgElement.src = "images/placeholder-image-url.png";
    }
    imgElement.alt = pet.name;
    imageContainer.appendChild(imgElement);
    
    // Add name overlay on the image (bottom)
    const nameOverlay = document.createElement('div');
    nameOverlay.className = 'pet-name-overlay';
    nameOverlay.textContent = pet.name;
    imageContainer.appendChild(nameOverlay);
    
    // Add age overlay (top left)
    const ageOverlay = document.createElement('div');
    ageOverlay.className = 'pet-age-overlay';
    ageOverlay.textContent = pet.age;
    imageContainer.appendChild(ageOverlay);
    
    // Add gender overlay (bottom right)
    const genderOverlay = document.createElement('div');
    genderOverlay.className = 'pet-gender-overlay';
    genderOverlay.textContent = pet.gender;
    imageContainer.appendChild(genderOverlay);
    
    // Add heart favorite icon
    const heartElement = document.createElement('div');
    heartElement.className = 'pet-favorite';
    const isFavorite = window.favorites.includes(pet.id);
    heartElement.innerHTML = `<i class="fas fa-heart ${isFavorite ? 'active' : ''}"></i>`;
    
    // Add click handler to toggle favorite status
    heartElement.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent opening the pet details modal
        toggleFavorite(pet.id, this);
    });
    
    imageContainer.appendChild(heartElement);
    
    // Add the image container to the pet element
    petElement.appendChild(imageContainer);

    // Create pet info container
    const infoElement = document.createElement('div');
    infoElement.className = 'pet-info';
    
    // Add pet breed
    if (pet.breeds && pet.breeds.primary) {
        const breedElement = document.createElement('p');
        breedElement.className = 'pet-breed';
        breedElement.textContent = pet.breeds.primary;
        if (pet.breeds.secondary) {
            breedElement.textContent += ` / ${pet.breeds.secondary}`;
        }
        infoElement.appendChild(breedElement);
    }
    
    // Add location if available
    if (pet.contact && pet.contact.address && pet.contact.address.city && pet.contact.address.state) {
        const locationElement = document.createElement('p');
        locationElement.className = 'pet-location';
        locationElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${pet.contact.address.city}, ${pet.contact.address.state}`;
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

// Global variable to store current gallery state
let galleryState = {
    photos: [],
    currentIndex: 0
};

// Display pet details in the modal
function displayPetDetails(pet) {
    const container = document.getElementById('petDetailsContainer');
    
    // Check if pet is favorited
    const isFavorite = window.favorites.includes(pet.id);
    
    // Build HTML for pet details
    let html = `
        <div class="pet-details-header" data-pet-id="${pet.id}">
            <h2 class="pet-details-name">
                ${pet.name}
                <span class="pet-details-favorite" onclick="toggleFavorite('${pet.id}')">
                    <i class="fas fa-heart ${isFavorite ? 'active' : ''}"></i>
                </span>
            </h2>
            <p class="pet-details-subtitle">
                <span class="pet-details-age">${pet.age}</span>
                <span class="pet-details-gender">${pet.gender}</span>
                <span class="pet-details-breed">${pet.breeds.primary}${pet.breeds.secondary ? ` / ${pet.breeds.secondary}` : ''}</span>
            </p>
        </div>
        
        <div class="pet-details-images">
    `;
    
    // Add images
    if (pet.photos && pet.photos.length > 0) {
        pet.photos.forEach((photo, index) => {
            html += `
                <div class="pet-image-container">
                    <img src="${photo.medium}" alt="${pet.name}" class="pet-full-image" data-index="${index}">
                </div>
            `;
        });
    } else {
        html += `
            <div class="pet-image-container">
                <img src="images/placeholder-image-url.png" alt="${pet.name}">
            </div>
        `;
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
    
    // Add click handlers to the images to open the image gallery
    if (pet.photos && pet.photos.length > 0) {
        // Store pet photos in the gallery state
        galleryState.photos = pet.photos;
        
        const images = container.querySelectorAll('.pet-full-image');
        images.forEach(img => {
            img.addEventListener('click', function(event) {
                // Show the gallery with the clicked image
                const index = parseInt(this.dataset.index, 10);
                showImageGallery(index);
                
                // Prevent event from bubbling up
                event.stopPropagation();
            });
        });
    }
}

// Image Gallery Functions
function showImageGallery(startIndex = 0) {
    if (!galleryState.photos || galleryState.photos.length === 0) {
        console.error('No photos available for gallery');
        return;
    }
    
    // Set the current index and update the display
    galleryState.currentIndex = startIndex;
    updateGalleryDisplay();
    
    // Show the gallery modal
    const galleryModal = document.getElementById('imageGalleryModal');
    galleryModal.style.display = 'block';
    
    // Setup event handlers if not already set
    setupGalleryEventHandlers();
}

function updateGalleryDisplay() {
    // Update the image source
    const currentPhoto = galleryState.photos[galleryState.currentIndex];
    const img = document.getElementById('galleryCurrentImage');
    img.src = currentPhoto.full || currentPhoto.large || currentPhoto.medium;
    
    // Update the counter
    document.getElementById('galleryCurrentIndex').textContent = galleryState.currentIndex + 1;
    document.getElementById('galleryTotalImages').textContent = galleryState.photos.length;
    
    // Update button states
    const prevButton = document.querySelector('.gallery-nav.prev-button');
    const nextButton = document.querySelector('.gallery-nav.next-button');
    
    prevButton.disabled = galleryState.currentIndex === 0;
    nextButton.disabled = galleryState.currentIndex === galleryState.photos.length - 1;
}

function setupGalleryEventHandlers() {
    const galleryModal = document.getElementById('imageGalleryModal');
    const closeBtn = galleryModal.querySelector('.close');
    const prevButton = galleryModal.querySelector('.prev-button');
    const nextButton = galleryModal.querySelector('.next-button');
    
    // Close button handler
    closeBtn.onclick = function() {
        galleryModal.style.display = 'none';
        cleanupGalleryEventHandlers();
    };
    
    // Click outside to close
    window.onclick = function(event) {
        if (event.target === galleryModal) {
            galleryModal.style.display = 'none';
            cleanupGalleryEventHandlers();
        }
    };
    
    // Navigation button handlers
    prevButton.onclick = function() {
        if (galleryState.currentIndex > 0) {
            galleryState.currentIndex--;
            updateGalleryDisplay();
        }
    };
    
    nextButton.onclick = function() {
        if (galleryState.currentIndex < galleryState.photos.length - 1) {
            galleryState.currentIndex++;
            updateGalleryDisplay();
        }
    };
    
    // Keyboard navigation
    document.addEventListener('keydown', handleGalleryKeydown);
}

function handleGalleryKeydown(event) {
    const galleryModal = document.getElementById('imageGalleryModal');
    
    // Only handle keydown if gallery is open
    if (galleryModal.style.display === 'block') {
        switch (event.key) {
            case 'ArrowLeft':
                if (galleryState.currentIndex > 0) {
                    galleryState.currentIndex--;
                    updateGalleryDisplay();
                }
                break;
            case 'ArrowRight':
                if (galleryState.currentIndex < galleryState.photos.length - 1) {
                    galleryState.currentIndex++;
                    updateGalleryDisplay();
                }
                break;
            case 'Escape':
                galleryModal.style.display = 'none';
                break;
        }
    }
}

// Cleanup event listener when the gallery is closed
function cleanupGalleryEventHandlers() {
    document.removeEventListener('keydown', handleGalleryKeydown);
}

function displayNoResultsModal() {
    const noResultsModal = document.getElementById('noResultsModal');
    if (noResultsModal) {
        // Get current filter states
        const favoritesOnly = document.getElementById('favoritesOnly').checked;
        const withPhotosOnly = document.getElementById('withPhotosOnly').checked;
        
        // Update tip visibility based on active filters
        const favoritesTip = document.getElementById('favoritesNoResultsTip');
        const photosTip = document.getElementById('withPhotosNoResultsTip');
        
        if (favoritesTip) {
            favoritesTip.style.display = favoritesOnly ? 'block' : 'none';
        }
        
        if (photosTip) {
            photosTip.style.display = withPhotosOnly ? 'block' : 'none';
        }
        
        // Update main message
        if (favoritesOnly && window.favorites.length === 0) {
            document.getElementById('noResultsMessage').textContent = 
                "You don't have any favorited pets yet. Try favoriting some pets first or disable the favorites filter.";
        } else {
            document.getElementById('noResultsMessage').textContent = 
                "No pets found with your search criteria. Please try a different search.";
        }
        
        // Show the modal
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
    
    // Update the pet details modal heart if it's currently showing this pet
    updatePetDetailsModalHeart(petId, index === -1);
    
    // Log current favorites (could be used for other features later)
    console.log('Current favorites:', window.favorites);
}

// Update the heart in the pet details modal if it's showing
function updatePetDetailsModalHeart(petId, isFavorite) {
    const modal = document.getElementById('petDetailsModal');
    if (modal.style.display === 'block') {
        const detailsContainer = document.getElementById('petDetailsContainer');
        const petIdElement = detailsContainer.querySelector('[data-pet-id]');
        
        if (petIdElement && petIdElement.getAttribute('data-pet-id') === petId) {
            const heartIcon = detailsContainer.querySelector('.pet-details-favorite i');
            if (heartIcon) {
                if (isFavorite) {
                    heartIcon.classList.add('active');
                } else {
                    heartIcon.classList.remove('active');
                }
            }
        }
    }
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

// Setup organization details modal
function setupOrganizationDetailsModal() {
    const modal = document.getElementById('organizationDetailsModal');
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

// Show organization details modal and fetch organization data
async function showOrganizationDetails(orgId) {
    const modal = document.getElementById('organizationDetailsModal');
    const container = document.getElementById('organizationDetailsContainer');
    
    // Display loading indicator
    container.innerHTML = '<div class="organization-details-loading loading"></div>';
    modal.style.display = 'block';
    
    try {
        await fetchOrganizationDetails(orgId);
    } catch (error) {
        container.innerHTML = `<div class="error-message">
            <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ff8066;"></i>
            <p>Error loading organization details: ${error.message}</p>
        </div>`;
    }
}

// Fetch organization details from API
async function fetchOrganizationDetails(orgId) {
    const response = await fetch(`/.netlify/functions/petfinder-proxy/organizations/${orgId}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    displayOrganizationDetails(data.organization);
}

// Display organization details in the modal
function displayOrganizationDetails(org) {
    const container = document.getElementById('organizationDetailsContainer');
    
    // Build HTML for organization details
    let html = `
        <div class="organization-details-header">
            <h2 class="organization-details-name">${org.name}</h2>
            <p class="organization-details-subtitle">
                ${org.address && org.address.city ? `${org.address.city}` : ''}
                ${org.address && org.address.state ? `${org.address.city ? ', ' : ''}${org.address.state}` : ''}
                ${org.address && org.address.postcode ? `${org.address.postcode}` : ''}
            </p>
        </div>
    `;
    
    // Add mission statement if available
    if (org.mission_statement) {
        html += `
            <div class="organization-details-section">
                <h3><i class="fas fa-quote-left"></i> Mission</h3>
                <p>${org.mission_statement}</p>
            </div>
        `;
    }
    
    // Add adoption policy if available
    if (org.adoption && org.adoption.policy) {
        html += `
            <div class="organization-details-section">
                <h3><i class="fas fa-clipboard-list"></i> Adoption Policy</h3>
                <p>${org.adoption.policy}</p>
            </div>
        `;
    }
    
    // Add contact information if available
    const hasContactInfo = org.email || org.phone || (org.address && Object.values(org.address).some(val => val));
    
    if (hasContactInfo) {
        html += `<div class="organization-contact">`;
        
        if (org.email) {
            html += `
                <div class="organization-contact-item">
                    <span class="organization-contact-label"><i class="fas fa-envelope"></i> Email</span>
                    <span class="organization-contact-value">${org.email}</span>
                </div>
            `;
        }
        
        if (org.phone) {
            html += `
                <div class="organization-contact-item">
                    <span class="organization-contact-label"><i class="fas fa-phone"></i> Phone</span>
                    <span class="organization-contact-value">${org.phone}</span>
                </div>
            `;
        }
        
        if (org.address && Object.values(org.address).some(val => val)) {
            html += `
                <div class="organization-contact-item">
                    <span class="organization-contact-label"><i class="fas fa-map-marker-alt"></i> Address</span>
                    <span class="organization-contact-value">
                        ${org.address.address1 ? org.address.address1 : ''}
                        ${org.address.address2 ? `<br>${org.address.address2}` : ''}
                        ${org.address.city || org.address.state ? '<br>' : ''}
                        ${org.address.city ? org.address.city : ''}
                        ${org.address.state ? `${org.address.city ? ', ' : ''}${org.address.state}` : ''}
                        ${org.address.postcode ? ` ${org.address.postcode}` : ''}
                    </span>
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    // Add hours of operation if available
    if (org.hours && Object.values(org.hours).some(val => val)) {
        html += `
            <div class="organization-details-section">
                <h3><i class="fas fa-clock"></i> Hours</h3>
                <div class="organization-hours">
        `;
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        days.forEach(day => {
            const lowerDay = day.toLowerCase();
            if (org.hours[lowerDay]) {
                html += `<div class="hours-row">
                    <span class="hours-day">${day}</span>
                    <span class="hours-time">${org.hours[lowerDay]}</span>
                </div>`;
            }
        });
        
        html += `</div></div>`;
    }
    
    // Add social media links if available
    if (org.social_media && Object.values(org.social_media).some(val => val)) {
        html += `<div class="organization-details-section">
            <h3><i class="fas fa-share-alt"></i> Social Media</h3>
            <div class="organization-social">`;
            
        if (org.social_media.facebook) {
            html += `<a href="${org.social_media.facebook}" target="_blank" class="social-link"><i class="fab fa-facebook-square"></i> Facebook</a>`;
        }
        if (org.social_media.twitter) {
            html += `<a href="${org.social_media.twitter}" target="_blank" class="social-link"><i class="fab fa-twitter-square"></i> Twitter</a>`;
        }
        if (org.social_media.youtube) {
            html += `<a href="${org.social_media.youtube}" target="_blank" class="social-link"><i class="fab fa-youtube-square"></i> YouTube</a>`;
        }
        if (org.social_media.instagram) {
            html += `<a href="${org.social_media.instagram}" target="_blank" class="social-link"><i class="fab fa-instagram-square"></i> Instagram</a>`;
        }
        if (org.social_media.pinterest) {
            html += `<a href="${org.social_media.pinterest}" target="_blank" class="social-link"><i class="fab fa-pinterest-square"></i> Pinterest</a>`;
        }
            
        html += `</div></div>`;
    }
    
    // Add footer with links
    html += `
        <div class="organization-footer">
            <a href="${org.url}" target="_blank"><i class="fas fa-external-link-alt"></i> View on Petfinder</a>
            <button onclick="document.getElementById('organizationDetailsModal').style.display='none';" class="close-button"><i class="fas fa-times"></i> Close</button>
        </div>
    `;
    
    // Update the container with the organization details
    container.innerHTML = html;
}