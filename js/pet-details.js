document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const petId = params.get('petId');
    if (petId) {
        fetchPetDetails(petId);
    }
});

async function fetchPetDetails(petId) {
    try {
        const response = await fetch(`http://localhost:3000/api/v2/animals/${petId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayPetDetails(data.animal);
    } catch (error) {
        console.error('Error fetching pet details: ', error);
    }
}

function displayPetDetails(pet) {
    const detailsElement = document.getElementById('petDetails');
    const orgLink = `organization-details.html?orgId=${pet.organization_id}`;

    // Start with basic pet details and table
    let petDetailsHTML = `
        <h1>${pet.name} (${pet.age}, ${pet.gender})</h1>
        <div id="petImages"></div> <!-- Container for pet images -->
        <p>${pet.description} ... <a href="${pet.url}" target="_blank">Read More</a></p>
        <table>
            <tr><th>Organization Id</th><td><a href="${orgLink}" target="_blank">${pet.organization_id}</a></td></tr>
            <tr><th>Contact Email</th><td>${pet.contact.email}</td></tr>
            <tr><th>Contact Phone</th><td>${pet.contact.phone}</td></tr>
            <tr><th>Location</th><td>${pet.contact.address.city}, ${pet.contact.address.state} ${pet.contact.address.postcode}</td></tr>
            <tr><th></th><td><a href="${pet.url}" target="_blank">View on Petfinder</a></td></tr>
            <tr><th>Status</th><td>${pet.status}</td></tr>
            <tr><th>Breed</th><td>${pet.breeds.primary}</td></tr>
            <tr><th>Color</th><td>${pet.colors.primary || 'N/A'}</td></tr>
            <tr><th>Size</th><td>${pet.size}</td></tr>
            <tr><th>Coat</th><td>${pet.coat || 'N/A'}</td></tr>
            <tr><th>Spayed/Neutered</th><td>${pet.attributes.spayed_neutered ? 'Yes' : 'No'}</td></tr>
            <tr><th>House Trained</th><td>${pet.attributes.house_trained ? 'Yes' : 'No'}</td></tr>
            <tr><th>Declawed</th><td>${pet.attributes.declawed ? 'Yes' : 'No'}</td></tr>
            <tr><th>Special Needs</th><td>${pet.attributes.special_needs ? 'Yes' : 'No'}</td></tr>
            <tr><th>Shots Current</th><td>${pet.attributes.shots_current ? 'Yes' : 'No'}</td></tr>
            <tr><th>Good with Children</th><td>${pet.environment.children ? 'Yes' : 'No'}</td></tr>
            <tr><th>Good with Dogs</th><td>${pet.environment.dogs ? 'Yes' : 'No'}</td></tr>
            <tr><th>Good with Cats</th><td>${pet.environment.cats ? 'Yes' : 'No'}</td></tr>
            <tr><th>Published At</th><td>${new Date(pet.published_at).toLocaleString()}</td></tr>
        </table>
    `;

    // Append videos if available
    if (pet.videos.length > 0) {
        petDetailsHTML += `<h3>Video:</h3>${pet.videos[0].embed}`;
    }

    // Set the innerHTML of the details element
    detailsElement.innerHTML = petDetailsHTML;

    // Now, handle the images
    const petImagesDiv = document.getElementById('petImages');
    pet.photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.full;
        img.alt = `Image of ${pet.name}`;
        img.style.width = '600px'; // Set desired width
        img.style.height = 'auto'; // Maintain aspect ratio
        petImagesDiv.appendChild(img);
    });
}
