import axios from 'axios';

async function makeRequestWithRetry(url, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000; // Délai initial en ms

  while (attempt < maxRetries) {
    try {
      console.log(`Tentative ${attempt + 1}/${maxRetries}...`);
      const response = await axios.get(url);
      console.log('Succès:', response.status, response.data);
      return response.data;
    } catch (error) {
      attempt++;

      // Retry uniquement si erreur 500
      if (error.response && error.response.status === 500) {
        if (attempt < maxRetries) {
          console.log(`Erreur 500 détectée. Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Double le délai pour la prochaine tentative
        } else {
          console.log('Nombre maximum de tentatives atteint.');
          throw error;
        }
      } else {
        // Pour toute autre erreur, on ne retry pas
        console.log(`Erreur ${error.response?.status || 'inconnue'}. Pas de retry.`);
        throw error;
      }
    }
  }
}

// Exemple d'utilisation
async function main() {
  try {
    const data = await makeRequestWithRetry('https://jsonplaceholder.typicode.com/posts/1');
    console.log('Données récupérées:', data);
  } catch (error) {
    console.error('Échec définitif:', error.message);
  }
}

main();