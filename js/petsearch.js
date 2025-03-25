// Initialize Datadog RUM custom events
function initDatadogRUMEvents() {
    if (!window.DD_RUM) return;
    
    // Set up custom event listeners
    document.addEventListener('click', function(e) {
        // Track pet card clicks
        if (e.target.closest('.pet')) {
            const petId = e.target.closest('.pet').getAttribute('data-pet-id');
            if (petId) {
                window.DD_RUM.addAction('view_pet_details', {
                    pet_id: petId
                });
            }
        }
        
        // Track search button clicks
        if (e.target.closest('#searchButton')) {
            const location = document.getElementById('location').value;
            const animalType = document.getElementById('animalType').value;
            window.DD_RUM.addAction('search_pets', {
                location: location || 'not_specified',
                animal_type: animalType || 'any'
            });
        }
        
        // Track load more clicks
        if (e.target.closest('#loadMore')) {
            window.DD_RUM.addAction('load_more_pets', {});
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize custom Datadog RUM events
    initDatadogRUMEvents();
    let currentPagination = null;
    
    // Initialize distance slider value display
    const distanceSlider = document.getElementById('distance');
    const distanceValue = document.getElementById('distanceValue');
    
    if (distanceSlider && distanceValue) {
        // Initial value
        distanceValue.textContent = distanceSlider.value;
        
        // Update value on slider change
        distanceSlider.addEventListener('input', function() {
            distanceValue.textContent = this.value;
            // Removed automatic search trigger
        });
    }
    
    // Setup search button (if not already in the DOM)
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const locationInput = document.getElementById('location');
            if (locationInput.value.trim()) {
                triggerSearch();
            }
        });
    }
    
    // Set up optional filters toggle 
    const optionalFiltersToggle = document.getElementById("optionalFiltersToggle"); 
    const optionalFiltersContent = document.getElementById("optionalFiltersContent"); 
     
    if (optionalFiltersToggle && optionalFiltersContent) { 
        // Initialize in closed state 
        optionalFiltersContent.style.display = "none"; 
         
        // Toggle optional filters section when clicked 
        optionalFiltersToggle.addEventListener("click", function() { 
            const isOpen = optionalFiltersToggle.classList.contains("active"); 
             
            if (isOpen) { 
                // Close the filters section 
                optionalFiltersToggle.classList.remove("active"); 
                optionalFiltersContent.classList.remove("active"); 
                optionalFiltersContent.style.display = "none"; 
            } else { 
                // Open the filters section 
                optionalFiltersToggle.classList.add("active"); 
                optionalFiltersContent.classList.add("active"); 
                optionalFiltersContent.style.display = "block"; 
            } 
        }); 
    } 

    // Set up event listeners for all filter inputs (without auto search)
    setupFormListeners();

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
});

// Set up form listeners (removed hot reload functionality)
function setupFormListeners() {
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
    
    await fetchPets(location, animalType, gender, distance, selectedAges, page);
}

async function fetchPets(location, animalType, gender, distance, selectedAges, page) {
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
        
        updateLoadMoreButton();

        if (page === 1) {
            displayResults(data.animals);
        } else {
            appendResults(data.animals);
        }
    } catch (error) {
        console.error("Error in fetchPets:", error);
        displayError(error.message);
    } finally {
        // Hide loading indicator in all cases
        document.getElementById('loading').style.display = 'none';
    }
}

// Function to populate a pet element with data
function populatePetElement(element, pet) {
    // Set pet ID for reference
    element.setAttribute('data-pet-id', pet.id);
    
    // Create image container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'pet-image-container';
    
    // Add image (or placeholder)
    const img = document.createElement('img');
    
    if (pet.photos && pet.photos.length > 0) {
        // Find the best available image size
        const photo = pet.photos[0];
        img.src = photo.medium || photo.small || photo.large || photo.full;
    } else {
        img.src = 'images/placeholder-image-url.png';
        img.classList.add('placeholder');
    }
    
    img.alt = pet.name;
    imgContainer.appendChild(img);
    
    // Add overlays
    // Age overlay (top left)
    const ageOverlay = document.createElement('div');
    ageOverlay.className = 'pet-age-overlay';
    ageOverlay.textContent = pet.age;
    imgContainer.appendChild(ageOverlay);
    
    // Gender overlay (bottom right)
    const genderOverlay = document.createElement('div');
    genderOverlay.className = 'pet-gender-overlay';
    genderOverlay.textContent = pet.gender;
    imgContainer.appendChild(genderOverlay);
    
    // Name overlay (bottom)
    const nameOverlay = document.createElement('div');
    nameOverlay.className = 'pet-name-overlay';
    nameOverlay.textContent = pet.name;
    imgContainer.appendChild(nameOverlay);
    
    element.appendChild(imgContainer);
    
    // Additional info
    const infoContainer = document.createElement('div');
    infoContainer.className = 'pet-info';
    
    // Breed
    if (pet.breeds && pet.breeds.primary) {
        const breedInfo = document.createElement('p');
        breedInfo.className = 'pet-breed';
        breedInfo.textContent = pet.breeds.primary;
        if (pet.breeds.secondary) {
            breedInfo.textContent += ` / ${pet.breeds.secondary}`;
        }
        infoContainer.appendChild(breedInfo);
    }
    
    // Location
    if (pet.contact && pet.contact.address) {
        const address = pet.contact.address;
        if (address.city && address.state) {
            const locationInfo = document.createElement('p');
            locationInfo.className = 'pet-location';
            locationInfo.textContent = `${address.city}, ${address.state}`;
            infoContainer.appendChild(locationInfo);
        }
    }
    
    element.appendChild(infoContainer);
    
    // Make the whole pet card clickable to show details
    element.addEventListener('click', function() {
        showPetDetailsModal(pet.id);
    });
}

// Global variable to store current gallery state
let galleryState = {
    photos: [],
    currentIndex: 0
};

// Display pet details in the modal
function displayPetDetails(pet) {
    const container = document.getElementById('petDetailsContainer');
    
    // Build HTML for pet details
    let html = `
        <div class="pet-details-header" data-pet-id="${pet.id}">
            <h2 class="pet-details-name">${pet.name}</h2>
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