const showRestaurants = async (location, term, limit) => {
    const rootURL = 'https://www.apitutor.org/yelp/simple/v3/businesses/search';
    const endpoint = `${rootURL}?location=${location}&term=${term}&limit=${limit}`;
    const response = await fetch(endpoint);
    const jsonData = await response.json();
    console.log(`Matches for ${term}:`, jsonData);
 };

// note that the thai restaurants might 
// get printed before the pizza restaurants
showRestaurants('Asheville,+NC', 'pizza', 5);
showRestaurants('Asheville,+NC', 'thai', 1);