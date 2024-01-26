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
}); // This closes the DOMContentLoaded event listener

async function loadPets(page = 1) {
    const zipCode = document.getElementById('zipCode').value;
    const animalType = document.getElementById('animalType').value;
    const gender = document.getElementById('gender').value;
    const distance = document.getElementById('distance').value;
    await fetchPets(zipCode, animalType, gender, distance, page);
}

async function fetchPets(zipCode, animalType, gender, distance, page) {
    try {
        let url = `http://localhost:3000/api/v2/animals?page=${page}&location=${encodeURIComponent(zipCode)}`;
        if (animalType) {
            url += `&type=${encodeURIComponent(animalType)}`;
        }
        if (gender) {
            url += `&gender=${encodeURIComponent(gender)}`;
        }
        if (distance) {
            url += `&distance=${encodeURIComponent(distance)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        currentPagination = data.pagination; // Store pagination data
        updateLoadMoreButton();

        const petsWithPhotos = data.animals.filter(pet => pet.photos && pet.photos.length > 0);
        if (page === 1) {
            displayResults(petsWithPhotos); // Replace results for the first page
        } else {
            appendResults(petsWithPhotos); // Append results for subsequent pages
        }
    } catch (error) {
        console.error('Error fetching data: ', error);
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
    // Append new results to existing results
    pets.forEach(pet => {
        // ... existing code to create petElement ...
        results.appendChild(petElement);
    });
}

// The displayResults function remains the same

function displayResults(pets) {
    const results = document.getElementById('results');
    results.innerHTML = '';

    pets.forEach(pet => {
        const petElement = document.createElement('div');
        petElement.className = 'pet';

        // Image
        const imageUrl = pet.photos.length > 0 ? pet.photos[0].medium : 'images/placeholder-image-url.png'; // Use a placeholder image if no image is available

        // Extracting additional information
        const location = pet.contact.address.city + ', ' + pet.contact.address.state; // Example: City, State
        const distance = pet.distance ? pet.distance.toFixed(1) + ' miles' : 'N/A';
        const organization = pet.organization_id || 'N/A';
        const breed = pet.breeds.primary || 'Unknown';
        const type = pet.type || 'Unknown';
        const size = pet.size || 'Unknown';
        const gender = pet.gender || 'Unknown';
        const age = pet.age || 'Unknown';

        petElement.innerHTML = `
            <img src="${imageUrl}" alt="Image of ${pet.name}" style="width:200px; height:auto;">
            <h2>${pet.name}</h2>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Breed:</strong> ${breed}</p>
            <p><strong>Size:</strong> ${size}</p>
            <p><strong>Gender:</strong> ${gender}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Distance:</strong> ${distance}</p>
            <p><strong>Organization:</strong> ${organization}</p>
            <p><strong>Age:</strong> ${age}</p>
            <p>${pet.description || 'No description available'}</p>
        `;
        results.appendChild(petElement);
    });
}
