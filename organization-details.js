document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('orgId');
    if (orgId) {
        fetchOrganizationDetails(orgId);
    }
});

async function fetchOrganizationDetails(orgId) {
    try {
        const response = await fetch(`http://localhost:3000/api/v2/organizations/${orgId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayOrganizationDetails(data.organization);
    } catch (error) {
        console.error('Error fetching organization details: ', error);
    }
}

function displayOrganizationDetails(org) {
    const detailsElement = document.getElementById('organizationDetails');
    let hoursHtml = '';
    let socialMediaHtml = '';
    let photosHtml = '';

    // Format hours of operation
    for (const day in org.hours) {
        hoursHtml += `<tr><th>${day.charAt(0).toUpperCase() + day.slice(1)}</th><td>${org.hours[day] || 'Not Available'}</td></tr>`;
    }

    // Format social media links
    for (const platform in org.social_media) {
        if (org.social_media[platform]) {
            socialMediaHtml += `<a href="${org.social_media[platform]}" target="_blank">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a><br>`;
        }
    }

    // Format photos
    if (org.photos && org.photos.length > 0) {
        org.photos.forEach(photo => {
            photosHtml += `<img src="${photo.large}" alt="Organization Photo" style="max-width: 100%; height: auto;"><br>`;
        });
    }

    detailsElement.innerHTML = `
        <h1>${org.name}</h1>
        ${photosHtml}
        <p><strong>Email:</strong> ${org.email || 'Not Available'}</p>
        <p><strong>Phone:</strong> ${org.phone || 'Not Available'}</p>
        <p><strong>Address:</strong> ${org.address.address1 || ''} ${org.address.address2 || ''}, ${org.address.city}, ${org.address.state} ${org.address.postcode}, ${org.address.country}</p>
        <p><strong>Website:</strong> ${org.website ? `<a href="${org.website}" target="_blank">Website</a>` : 'Not Available'}</p>
        <p><strong>Mission Statement:</strong> ${org.mission_statement || 'Not Available'}</p>
        <p><strong>Adoption Policy:</strong> ${org.adoption.policy || 'Not Available'}</p>
        <p><strong>Adoption URL:</strong> ${org.adoption.url ? `<a href="${org.adoption.url}" target="_blank">Adoption Information</a>` : 'Not Available'}</p>
        <h3>Social Media:</h3>
        <p>${socialMediaHtml || 'Not Available'}</p>
        <p><strong>Distance:</strong> ${org.distance ? `${org.distance.toFixed(2)} miles` : 'N/A'}</p>
    `;
}

